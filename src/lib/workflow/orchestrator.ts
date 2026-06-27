// src/lib/workflow/orchestrator.ts
import { createAdminClient } from '@/lib/dal/customers';
import { callAI } from '@/lib/ai/provider';
import { sendApprovalEmail } from './notifications';
import { dispatchResearchAgents } from './agents';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('workflow/orchestrator')

export async function onRequestApproved(requestId: string): Promise<void> {
  log.info("[WORKFLOW_INITIATED]", requestId);

  // Run in background non-blocking context
  (async () => {
    const adminClient = await createAdminClient();

    // 1. Initialise tracking row in workflow_runs
    try {
      await adminClient
        .from('workflow_runs')
        .upsert({
          request_id: requestId,
          ai_summary_status: 'pending',
          email_status: 'pending',
          dispatch_status: 'pending',
          attempts: 1,
          last_error: null
        }, { onConflict: 'request_id' });
      log.info(`[ORCHESTRATOR] Initialised tracking for request ${requestId}`);
    } catch (err: any) {
      log.error(`[ORCHESTRATOR_TRACKING_FAIL] Failed to initialise workflow_runs tracking:`, err.message);
    }

    await runWorkflowSteps(requestId, adminClient);
  })();
}

export async function retryFailedWorkflow(requestId: string): Promise<void> {
  log.info("[WORKFLOW_RETRY_INITIATED]", requestId);

  const adminClient = await createAdminClient();

  // Increment attempts counter
  try {
    const { data: runData } = await adminClient
      .from('workflow_runs')
      .select('attempts')
      .eq('request_id', requestId)
      .maybeSingle();

    const currentAttempts = runData?.attempts || 0;
    await adminClient
      .from('workflow_runs')
      .update({
        attempts: currentAttempts + 1,
        last_error: null
      })
      .eq('request_id', requestId);
  } catch (err: any) {
    log.error(`[ORCHESTRATOR_RETRY_FAIL] Failed to update attempts:`, err.message);
  }

  // Run in background non-blocking context
  (async () => {
    await runWorkflowSteps(requestId, adminClient);
  })();
}

async function runWorkflowSteps(requestId: string, adminClient: any): Promise<void> {
  try {
    // A) Fetch full request data
    const { data: request, error: reqError } = await adminClient
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      const errMsg = `Failed to fetch request: ${requestId}. Error: ${reqError?.message || 'Not found'}`;
      log.error(`[ORCHESTRATOR_ERROR] ${errMsg}`);
      await adminClient.from('workflow_runs').update({ last_error: errMsg }).eq('request_id', requestId);
      return;
    }

    // Fetch customer preferences and details
    const [customerRes, prefsRes] = await Promise.all([
      adminClient.from('customers').select('*').eq('id', request.customer_id).single(),
      adminClient.from('request_preferences').select('*').eq('request_id', requestId).maybeSingle()
    ]);

    const customer = customerRes.data || {};
    const preferences = prefsRes.data || {};

    const fullRequest = {
      ...request,
      customer_name: customer.full_name || 'Customer',
      customer_email: customer.email,
      customer_lang: customer.preferred_language || 'ar',
      customer_id: request.customer_id,
      budget: preferences.budget_max || request.service_fee_amount || null,
      preferred_governorate: preferences.preferred_governorate || null,
      preferred_area: preferences.preferred_area || null,
      has_reference_image: !!request.reference_image_path,
      urgency_level: preferences.urgency_level || 'normal',
    };

    // Get current workflow state to resume
    const { data: runState } = await adminClient
      .from('workflow_runs')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    const isAiDone = runState?.ai_summary_status === 'completed';
    const isEmailDone = runState?.email_status === 'completed';
    const isDispatchDone = runState?.dispatch_status === 'completed';

    // B) Build "Request Understanding Summary"
    let summaryEn = request.ai_summary_en || '';
    let summaryAr = request.ai_summary_ar || '';

    // If summary is already saved in Requests table, treat it as completed (idempotent / cost saving)
    if (request.ai_summary_en && request.ai_summary_ar) {
      log.info(`[ORCHESTRATOR] AI Summaries already present for request ${requestId}. Skipping AI generation.`);
      await adminClient.from('workflow_runs').update({ ai_summary_status: 'completed' }).eq('request_id', requestId);
    } else if (!isAiDone) {
      try {
        await adminClient.from('workflow_runs').update({ ai_summary_status: 'running' }).eq('request_id', requestId);

        const aiPrompt = `
          Title: ${fullRequest.title}
          Description: ${fullRequest.raw_description || fullRequest.description || 'No description provided'}
          Budget: ${fullRequest.budget || 'N/A'}
          Location: ${fullRequest.preferred_governorate || ''} ${fullRequest.preferred_area || ''}
          Urgency: ${fullRequest.urgency_level}
        `;

        const systemPrompt = `
          You are the FINDORA AI Sourcing Assistant.
          Analyze the user's request and build a structured explanation of what was understood.
          Provide the output in JSON format with exactly two main keys: "en" and "ar".
          Each language object must contain three string properties:
          1. "understanding": What we understood
          2. "requirements": Key requirements
          3. "outcome": Expected outcome

          Respond ONLY with valid JSON.
        `;

        const aiRes = await callAI<{ en: any; ar: any }>({
          systemPrompt,
          userPrompt: aiPrompt,
          jsonMode: true
        });

        if (aiRes.error || !aiRes.data) {
          throw new Error(aiRes.error || 'Generative model returned no result.');
        }

        const data = aiRes.data;
        summaryEn = `
### What We Understood
${data.en?.understanding || 'No summary generated.'}
### Key Requirements
${data.en?.requirements || 'No requirements extracted.'}
### Expected Outcome
${data.en?.outcome || 'No outcome defined.'}
        `.trim();

        summaryAr = `
### ماذا فهمنا
${data.ar?.understanding || 'لم يتم إنشاء ملخص.'}
### المتطلبات الأساسية
${data.ar?.requirements || 'لم يتم استخراج المتطلبات.'}
### النتيجة المتوقعة
${data.ar?.outcome || 'لم يتم تحديد النتيجة.'}
        `.trim();

        // Save summaries into DB
        try {
          const { error: updateColError } = await adminClient
            .from('requests')
            .update({
              ai_summary_en: summaryEn,
              ai_summary_ar: summaryAr
            } as any)
            .eq('id', requestId);

          if (updateColError) throw updateColError;
          log.info(`[ORCHESTRATOR] Saved summaries to requests table (ai_summary_en/ar).`);
        } catch (err: any) {
          log.warn(`[ORCHESTRATOR] Custom columns failed, falling back to interpreted_summary and intake_summary.`);
          let mergedEn: any = summaryEn;
          let mergedAr: any = summaryAr;
          try {
            const { data: currentReq } = await adminClient
              .from('requests')
              .select('interpreted_summary, intake_summary')
              .eq('id', requestId)
              .single();
              
            if (currentReq?.interpreted_summary) {
              const parsed = JSON.parse(currentReq.interpreted_summary);
              if (parsed && typeof parsed === 'object') {
                mergedEn = JSON.stringify({ ...parsed, summary_plain_text: summaryEn });
              }
            }
            if (currentReq?.intake_summary) {
              const parsed = JSON.parse(currentReq.intake_summary);
              if (parsed && typeof parsed === 'object') {
                mergedAr = JSON.stringify({ ...parsed, summary_plain_text: summaryAr });
              }
            }
          } catch (e) {}

          await adminClient
            .from('requests')
            .update({
              interpreted_summary: typeof mergedEn === 'string' ? mergedEn : JSON.stringify(mergedEn),
              intake_summary: typeof mergedAr === 'string' ? mergedAr : JSON.stringify(mergedAr)
            })
            .eq('id', requestId);
        }

        await adminClient.from('workflow_runs').update({ ai_summary_status: 'completed' }).eq('request_id', requestId);
      } catch (aiErr: any) {
        log.error("[ORCHESTRATOR_AI_FAIL] AI summary step failed:", aiErr.message);
        await adminClient
          .from('workflow_runs')
          .update({
            ai_summary_status: 'failed',
            last_error: `AI generation failed: ${aiErr.message}`
          })
          .eq('request_id', requestId);
        return; // Abort further execution to allow retry
      }
    }

    const requestWithSummaries = {
      ...fullRequest,
      ai_summary_en: summaryEn,
      ai_summary_ar: summaryAr
    };

    // C) Send Email Notification (Decoupled stage)
    if (!isEmailDone) {
      try {
        await adminClient.from('workflow_runs').update({ email_status: 'running' }).eq('request_id', requestId);
        const emailSent = await sendApprovalEmail(requestWithSummaries);
        
        if (emailSent) {
          await adminClient.from('workflow_runs').update({ email_status: 'completed' }).eq('request_id', requestId);
        } else {
          throw new Error('Email notification returned false during delivery.');
        }
      } catch (emailErr: any) {
        log.error("[ORCHESTRATOR_EMAIL_FAIL] Email notification failed:", emailErr.message);
        await adminClient
          .from('workflow_runs')
          .update({
            email_status: 'failed',
            last_error: `Email failed: ${emailErr.message}`
          })
          .eq('request_id', requestId);
        // Do NOT return here, allow agent dispatch to execute as requested by user
      }
    }

    // D) Dispatch Research Agents (Decoupled stage)
    if (!isDispatchDone) {
      try {
        await adminClient.from('workflow_runs').update({ dispatch_status: 'running' }).eq('request_id', requestId);
        await dispatchResearchAgents(requestWithSummaries);
        await adminClient.from('workflow_runs').update({ dispatch_status: 'completed' }).eq('request_id', requestId);
      } catch (dispatchErr: any) {
        log.error("[ORCHESTRATOR_DISPATCH_FAIL] Agent dispatch failed:", dispatchErr.message);
        await adminClient
          .from('workflow_runs')
          .update({
            dispatch_status: 'failed',
            last_error: `Dispatch failed: ${dispatchErr.message}`
          })
          .eq('request_id', requestId);
      }
    }

  } catch (err: any) {
    log.error(`[ORCHESTRATOR_CRITICAL_FAIL] Failed during approval workflow execution for ${requestId}:`, err.message);
    await adminClient
      .from('workflow_runs')
      .update({
        last_error: `Critical fail: ${err.message}`
      })
      .eq('request_id', requestId);
  }
}
