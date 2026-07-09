/**
 * src/app/api/ai/concierge/route.ts
 * POST /api/ai/concierge
 *
 * Accepts: multipart/form-data with optional `text` (string) and `image` (File)
 *
 * Pipeline (in order):
 *   1. Server-side feature flag re-check (never trust frontend)
 *   2. guardImageUpload     — size + MIME (free, zero AI cost)
 *   3. guardImageDimensions — sharp metadata (free, zero AI cost)
 *   4. Upload to Supabase Storage ai-concierge-uploads/temp/
 *   5. Create signed URL (600s)
 *   6. parseAIRequest       — EXACTLY ONE AI call
 *   7. Return structured response
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags/feature-service'
import { guardImageUpload, guardImageDimensions } from '@/lib/intelligence/upload-guard'
import { parseAIRequest } from '@/lib/intelligence/ai-concierge-agent'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('api/ai/concierge')

const BUCKET = 'ai-concierge-uploads'
const SIGNED_URL_EXPIRY_SECONDS = 600

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parse FormData ─────────────────────────────────────────────────────
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'INVALID_FORM_DATA' }, { status: 400 })
    }

    const text = (formData.get('text') as string | null)?.trim() || null
    const imageFile = formData.get('image') as File | null

    if (!text && !imageFile) {
      return NextResponse.json(
        { error: 'NO_INPUT', messageAr: 'يرجى إدخال نص أو رفع صورة' },
        { status: 400 }
      )
    }

    // ── 2. Server-side Feature Flag Re-validation ─────────────────────────────
    if (imageFile) {
      const imageEnabled = await isFeatureEnabled('image_upload')
      if (!imageEnabled) {
        log.warn('[concierge] image_upload flag disabled — rejecting image upload')
        return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 403 })
      }
    }

    if (text && !imageFile) {
      const textEnabled = await isFeatureEnabled('ai_concierge_text')
      if (!textEnabled) {
        log.warn('[concierge] ai_concierge_text flag disabled — rejecting text request')
        return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 403 })
      }
    }

    // ── 3. Image Pre-AI Guards ────────────────────────────────────────────────
    let imageUrl: string | null = null
    let imageMimeType: string | null = null
    let imagePath: string | null = null

    if (imageFile) {
      // Guard 1: size + MIME type (no buffer needed)
      const sizeCheck = await guardImageUpload({
        size: imageFile.size,
        type: imageFile.type,
      })
      if (!sizeCheck.valid) {
        log.info(`[concierge] Upload rejected by guardImageUpload: ${sizeCheck.reason}`)
        return NextResponse.json(
          { error: sizeCheck.reason, messageAr: sizeCheck.reasonAr },
          { status: 400 }
        )
      }

      // Guard 2: image dimensions via sharp (buffer required)
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const dimCheck = await guardImageDimensions(buffer)
      if (!dimCheck.valid) {
        log.info(`[concierge] Upload rejected by guardImageDimensions: ${dimCheck.reason}`)
        return NextResponse.json(
          { error: dimCheck.reason, messageAr: dimCheck.reasonAr },
          { status: 400 }
        )
      }

      // ── 4. Upload to Supabase Storage ───────────────────────────────────────
      const admin = createAdminClient()
      const ext = imageFile.type.split('/')[1] ?? 'jpg'
      const fileName = `temp/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await admin.storage
         .from(BUCKET)
         .upload(fileName, buffer, {
           contentType: imageFile.type,
           upsert: false,
         })

      if (uploadError) {
        log.error('[concierge] Storage upload failed:', uploadError.message)
        return NextResponse.json(
          {
            error: 'UPLOAD_FAILED',
            messageAr: 'فشل رفع الصورة، يرجى المحاولة مرة أخرى',
          },
          { status: 500 }
        )
      }

      // ── 5. Create Signed URL (600s expiry) ──────────────────────────────────
      const { data: signedUrlData, error: signedUrlError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(fileName, SIGNED_URL_EXPIRY_SECONDS)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        log.error('[concierge] Signed URL creation failed:', signedUrlError?.message)
        return NextResponse.json(
          {
            error: 'SIGNED_URL_FAILED',
            messageAr: 'حدث خطأ في معالجة الصورة، يرجى المحاولة مرة أخرى',
          },
          { status: 500 }
        )
      }

      imageUrl = signedUrlData.signedUrl
      imageMimeType = imageFile.type
      imagePath = fileName
      log.info(`[concierge] Image uploaded → signed URL created (expiry: ${SIGNED_URL_EXPIRY_SECONDS}s)`)
    }

    // ── 6. EXACTLY ONE AI CALL ────────────────────────────────────────────────
    const aiResult = await parseAIRequest({ text, imageUrl, imageMimeType })

    // ── 7. Return Response ────────────────────────────────────────────────────
    if (aiResult.rejected) {
      log.info(`[concierge] AI rejected request: ${aiResult.reason}`)
      return NextResponse.json(
        {
          rejected: true,
          reason: aiResult.reason,
          messageAr: aiResult.messageAr,
        },
        { status: 422 }
      )
    }

    log.info(
      `[concierge] AI extracted data — confidence=${aiResult.data.confidence}, multipleItems=${aiResult.data.isMultipleItems}`
    )

    return NextResponse.json({
      rejected: false,
      data: {
        ...aiResult.data,
        imageUrl: imageUrl || undefined,
        imagePath: imagePath || undefined,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('[concierge] Unexpected error:', message)
    return NextResponse.json(
      {
        error: 'SERVER_ERROR',
        messageAr: 'خطأ في الخادم، يرجى المحاولة مرة أخرى',
      },
      { status: 500 }
    )
  }
}
