// src/lib/ai/provider.ts
/**
 * AI Copilot runs on-demand per request only. It must not process all requests automatically.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('ai/provider')

export interface AIProviderConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export function getAIConfig(): AIProviderConfig {
  return {
    enabled: process.env.AI_ENABLED === 'true',
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || 'gemini-2.0-flash',
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY,
    temperature: 0.2,
    maxTokens: 8192  // Generous default — JSON responses need room
  };
}

/**
 * Tries to parse JSON text, handling markdown wrappers and truncated responses gracefully.
 */
function safeParseJSON(text: string): { data: any; error?: string } {
  if (!text || !text.trim()) {
    return { data: null, error: 'AI returned empty output.' };
  }

  let cleanText = text.trim();

  // Strip markdown code fences if present
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();
  }

  // Attempt 1: Direct parse (clean / complete response)
  try {
    return { data: JSON.parse(cleanText) };
  } catch (_) {}

  // Attempt 2: Find and extract the first complete JSON object in the text
  const firstBrace = cleanText.indexOf('{');
  if (firstBrace !== -1) {
    // Walk from the first '{' to find a balanced closing '}'
    let depth = 0;
    let inString = false;
    let escape = false;
    let endIdx = -1;

    for (let i = firstBrace; i < cleanText.length; i++) {
      const ch = cleanText[i];

      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }

    if (endIdx !== -1) {
      try {
        const candidate = cleanText.slice(firstBrace, endIdx + 1);
        return { data: JSON.parse(candidate) };
      } catch (_) {}
    }
  }

  // Attempt 3: Log and return error
  const preview = cleanText.slice(0, 200);
  log.error('[AI_PARSE_ERROR] Could not extract valid JSON. Raw preview:', preview);
  return { data: null, error: 'AI_PARSE_ERROR: Failed to parse JSON response.' };
}

/**
 * Main AI call wrapper with SDK integration.
 */
export async function callAI<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  configOverride?: Partial<AIProviderConfig>;
  imageParts?: Array<{ mimeType: string; data: string }>; // base64 strings (legacy path)
  /** URL-based image references — sent as Gemini fileData parts (no base64, no upload) */
  imageUrls?: Array<{ uri: string; mimeType: string }>;
}): Promise<{ data: any; raw?: string; error?: string }> {
  const baseConfig = getAIConfig();
  const config = { ...baseConfig, ...params.configOverride };

  // Always ensure a minimum generous token budget for JSON agents
  if (params.jsonMode && (!config.maxTokens || config.maxTokens < 4096)) {
    config.maxTokens = 4096;
  }

  if (!config.enabled || !config.apiKey) {
    return { 
      data: null, 
      error: 'AI_DISABLED: AI is not enabled or API key is missing.' 
    };
  }

  if (config.provider === 'disabled') {
    return { data: null, error: 'AI_DISABLED: Provider is explicitly disabled.' };
  }

  try {
    if (config.provider === 'gemini' || config.provider === 'google') {
      const genAI = new GoogleGenerativeAI(config.apiKey!);
      const model = genAI.getGenerativeModel({ 
        model: config.model,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          responseMimeType: params.jsonMode ? "application/json" : "text/plain"
        }
      });

      const prompt = `${params.systemPrompt}\n\nUser Input: ${params.userPrompt}`;
      
      let aiResult: any = null;
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          const hasInlineImages = params.imageParts && params.imageParts.length > 0;
          const hasUrlImages = params.imageUrls && params.imageUrls.length > 0;

          if (hasInlineImages || hasUrlImages) {
            // Build a multimodal parts array
            const parts: unknown[] = [{ text: prompt }];

            // Legacy base64 inline data
            if (hasInlineImages) {
              for (const p of params.imageParts!) {
                parts.push({ inlineData: { data: p.data, mimeType: p.mimeType } });
              }
            }

            // URL-based file data (no base64 transport)
            if (hasUrlImages) {
              for (const u of params.imageUrls!) {
                parts.push({ fileData: { fileUri: u.uri, mimeType: u.mimeType } });
              }
            }

            aiResult = await model.generateContent(parts as never);
          } else {
            aiResult = await model.generateContent(prompt);
          }
          break;
        } catch (err: any) {
          attempt++;
          const errorMsg = err.message || String(err);
          const is429 = errorMsg.includes('429') || 
                        errorMsg.toLowerCase().includes('quota') || 
                        errorMsg.toLowerCase().includes('rate limit') || 
                        errorMsg.toLowerCase().includes('too many requests');
          
          if (is429 && attempt < maxAttempts) {
            const delay = attempt * 1500;
            log.warn(`[AI_RATE_LIMITED] Attempt ${attempt} failed with 429. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }

      if (!aiResult) {
        throw new Error('AI_ERROR: Generative model returned no result.');
      }

      const response = await aiResult.response;

      // Check finish reason — truncated output will never parse
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        log.warn(`[AI_FINISH_REASON] Model stopped due to: ${finishReason}. Token budget may be insufficient.`);
      }

      const text = response.text();

      if (params.jsonMode) {
        const parsed = safeParseJSON(text);
        if (parsed.data) {
          return { data: parsed.data, raw: text };
        }
        return { data: null, raw: text, error: parsed.error };
      }

      return { data: text, raw: text };
    }
    
    return {
      data: null, 
      error: `AI_IMPLEMENTATION_PENDING: Integration with ${config.provider} SDK required.`
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    log.error('[AI_PROVIDER_ERROR]:', errorMsg);

    if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('too many requests')) {
      return {
        data: null,
        error: 'AI_RATE_LIMITED: Gemini API rate limit exceeded (429).'
      };
    }

    return {
      data: null,
      error: `AI_ERROR: ${errorMsg}`
    };
  }
}
