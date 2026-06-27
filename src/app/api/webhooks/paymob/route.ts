import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymobWebhookHmac, PaymobWebhookPayload } from '@/lib/payments/paymob';
import { createAdminClient } from '@/lib/dal/customers';
import { confirmPaymentIntentSystem, getPaymentIntentByRequestId } from '@/lib/dal/payments';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('API:webhooks/paymob');

/**
 * Paymob Payment Webhook Handler
 * 
 * Paymob sends POST to this endpoint on every transaction event.
 * IMPORTANT: Always return 200 OK — Paymob retries on any other status.
 */
export async function POST(request: NextRequest) {
  let payload: PaymobWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    // Malformed JSON — still return 200 to stop retries
    // log.error('[PAYMOB WEBHOOK] Invalid JSON received');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 1. Verify HMAC signature
  const receivedHmac = payload.hmac || request.nextUrl.searchParams.get('hmac') || '';
  const isValid = verifyPaymobWebhookHmac(payload as unknown as Record<string, any>, receivedHmac);

  if (!isValid) {
    // log.error('[PAYMOB WEBHOOK] Invalid HMAC signature — possible tampering');
    // Still return 200 to prevent Paymob from retrying (log and investigate separately)
    return NextResponse.json({ received: true, note: 'hmac_invalid' }, { status: 200 });
  }

  log.info('Webhook received', {
    transactionId: payload.id,
    orderId: payload.order?.merchant_order_id,
    success: payload.success,
    amountCents: payload.amount_cents,
    type: payload.source_data?.type,
  });

  // 2. Only process successful, non-refund transactions
  if (!payload.success || payload.is_refund || payload.pending) {
    if (!payload.success) {
      log.warn('Failed transaction', { transactionId: payload.id });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 3. Process confirmed payment
  const internalOrderId = payload.order?.merchant_order_id;
  if (!internalOrderId) {
    // log.error('[PAYMOB WEBHOOK] No merchant_order_id in payload');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const db = await createAdminClient();

    // 3a. Resolve active payment intent by request_id or payment_intent_id
    let intent = await getPaymentIntentByRequestId(internalOrderId);
    if (!intent) {
      const { data: intentById } = await db
        .from('payment_intents')
        .select('*')
        .eq('id', internalOrderId)
        .maybeSingle();
      intent = intentById;
    }

    if (!intent) {
      // log.error('[PAYMOB WEBHOOK] No active payment intent found for ID/RequestId:', internalOrderId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 3b. Confirm the payment intent via DAL
    await confirmPaymentIntentSystem({
      id: intent.id,
      externalReference: payload.id.toString(),
      notes: `Confirmed automatically via Paymob Webhook transaction ${payload.id}`
    });

    log.info('Payment intent confirmed', { intentId: intent.id });

    // 3c. If a contributor is associated, log a task_reward transaction
    const { data: claimData } = await db
      .from('task_claims')
      .select('contributor_id, platform_tasks!inner(parent_request_id)')
      .eq('platform_tasks.parent_request_id', intent.request_id)
      .eq('status', 'approved')
      .maybeSingle() as any;

    if (claimData && claimData.contributor_id) {
      const contributorId = claimData.contributor_id;
      const rewardAmountEgp = (payload.amount_cents / 100) * 0.85; // 85% to contributor after 15% platform fee

      const { data: wallet } = await db
        .from('contributor_wallets')
        .select('id')
        .eq('contributor_id', contributorId)
        .maybeSingle();

      if (wallet) {
        const idempotencyKey = `paymob_tx:${payload.id}`;
        const { error: insertError } = await db.from('wallet_transactions').insert({
          contributor_id: contributorId,
          wallet_id: wallet.id,
          tx_type: 'task_reward',
          amount_egp: rewardAmountEgp,
          amount_points: Math.round(rewardAmountEgp),
          reference_type: 'task',
          reference_id: intent.request_id,
          description_en: `Payment confirmed for request ${intent.request_id}`,
          description_ar: `تم تأكيد الدفع للطلب ${intent.request_id}`,
          idempotency_key: idempotencyKey,
          metadata: {
            paymob_transaction_id: payload.id,
            paymob_order_id: payload.order?.id,
            amount_cents: payload.amount_cents,
            payment_type: payload.source_data?.type,
          },
        });

        if (insertError) {
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.details?.includes('already exists')) {
            log.info('Duplicate Paymob webhook transaction detected, ignoring safely', { paymobTxId: payload.id });
            return NextResponse.json({ received: true, note: 'duplicate_ignored' }, { status: 200 });
          }
          throw insertError;
        }
        log.info('Contributor reward logged', { amountEgp: rewardAmountEgp, idempotencyKey });
      }
    }
  } catch (err: unknown) {
    log.error('Webhook processing error', { message: err instanceof Error ? err.message : String(err) });
  }

  // Always return 200 OK to Paymob
  return NextResponse.json({ received: true }, { status: 200 });
}

// Paymob also sends GET requests for transaction status checks
export async function GET() {
  return NextResponse.json({ status: 'Paymob webhook endpoint active' });
}
