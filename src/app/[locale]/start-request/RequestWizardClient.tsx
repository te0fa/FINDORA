'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeature } from '@/lib/feature-flags/useFeature'
import ReviewScreen from './ReviewScreen'
import ReturningCustomerStep, { type ReusedRequestData } from './ReturningCustomerStep'
import type { AIExtractedData } from '@/lib/intelligence/ai-concierge-agent'
import { Modal } from '@/components/ui/Overlays'

// ─── Step Constants ───────────────────────────────────────────────────────────
const STEP_RETURNING  = 0   // Phase 3: Optional returning-customer lookup (feature-flag gated)
const STEP_CATEGORY   = 1   // Category picker + AI concierge input
const STEP_REVIEW     = 15  // AI Review (inserted between AI and details)
const STEP_DETAILS    = 2   // Manual product details
const STEP_LOCATION   = 3   // Location + budget
const STEP_INTAKE     = 4   // Name + phone (contact step)

// ─── Web Speech API types ─────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    interimResults: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
  }
}

export default function RequestWizardClient({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const router = useRouter()

  // ── Feature Flags (client Realtime-subscribed) ──────────────────────────────
  const voiceFlag       = useFeature('voice_input')
  const imageFlag       = useFeature('image_upload')
  const textFlag        = useFeature('ai_concierge_text')
  const manualV2        = useFeature('manual_builder_v2')
  const productLinkFlag = useFeature('product_link_input')
  const historyFlag     = useFeature('request_history_lookup')  // Phase 3

  // ── Wizard State ─────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false)

  // Step starts at STEP_CATEGORY (safe default). Once the history flag finishes
  // loading, if it is enabled we rewind to STEP_RETURNING (the optional lookup
  // step). This avoids a flash of the lookup UI for customers on a page where
  // the flag is off, and ensures zero behavior change when flag is disabled.
  const [step, setStep] = useState(STEP_CATEGORY)

  // Pre-fill phone from the returning-customer lookup (convenience only —
  // the customer can still edit it freely in the Intake step).
  const [lookupPhone, setLookupPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiData, setAiData] = useState<AIExtractedData | null>(null)

  const [formData, setFormData] = useState({
    category:      '',
    productName:   '',
    targetLocation: '',
    maxPrice:      '',
    notes:         '',
    customerName:  '',
    customerPhone: '',
    isBusiness:    false,
    companyName:   '',
    crNumber:      '',
    taxNumber:     '',
    quantity:      '1',
    // manual_builder_v2 extra fields (stored in requests.metadata)
    brand:         '',
    condition:     '',
    budgetMin:     '',
    budgetMax:     '',
    urgency:       '',
    color:         '',
    size:          '',
    referenceLink: '',
    sourceType:    'manual' as 'manual' | 'ai_text' | 'ai_voice' | 'ai_image' | 'product_link',
    aiConfidence:  null as number | null,
    aiMetadata:    {} as Record<string, unknown>,
  })

  // ── AI Concierge text area ───────────────────────────────────────────────────
  const [conciergeText, setConciergeText] = useState('')
  const [isParsing, setIsParsing]         = useState(false)
  const [aiError, setAiError]             = useState('')

  // ── Load state from sessionStorage on mount ──────────────────────────────────
  useEffect(() => {
    if (isRestored) return

    setMounted(true)
    const supported =
      typeof window !== 'undefined' &&
      (typeof window.SpeechRecognition !== 'undefined' ||
        typeof window.webkitSpeechRecognition !== 'undefined')
    setSpeechSupported(supported)

    let restoredStep: number | null = null
    let savedStepExists = false
    try {
      const savedStep = sessionStorage.getItem('wizard_step')
      const savedFormData = sessionStorage.getItem('wizard_form_data')
      const savedAiData = sessionStorage.getItem('wizard_ai_data')
      const savedLookupPhone = sessionStorage.getItem('wizard_lookup_phone')
      const savedConciergeText = sessionStorage.getItem('wizard_concierge_text')

      if (savedStep !== null) {
        savedStepExists = true
        restoredStep = Number(savedStep)
        setStep(restoredStep)
      }
      if (savedFormData !== null) setFormData(JSON.parse(savedFormData))
      if (savedAiData !== null) setAiData(JSON.parse(savedAiData))
      if (savedLookupPhone !== null) setLookupPhone(savedLookupPhone)
      if (savedConciergeText !== null) setConciergeText(savedConciergeText)
    } catch (e) {
      console.warn('Failed to load wizard state from sessionStorage:', e)
    }

    if (!historyFlag.loading) {
      if (!savedStepExists && historyFlag.enabled) {
        setStep(STEP_RETURNING)
      }
      setIsRestored(true)
    }
  }, [historyFlag.loading, historyFlag.enabled, isRestored])

  // ── Save state to sessionStorage on change ───────────────────────────────────
  useEffect(() => {
    if (!mounted || !isRestored) return
    try {
      sessionStorage.setItem('wizard_step', String(step))
      sessionStorage.setItem('wizard_form_data', JSON.stringify(formData))
      sessionStorage.setItem('wizard_ai_data', aiData ? JSON.stringify(aiData) : '')
      sessionStorage.setItem('wizard_lookup_phone', lookupPhone)
      sessionStorage.setItem('wizard_concierge_text', conciergeText)
    } catch (e) {
      console.warn('Failed to save wizard state to sessionStorage:', e)
    }
  }, [step, formData, aiData, lookupPhone, conciergeText, mounted, isRestored])

  // ── Product Link input ──────────────────────────────────────────────
  const [productLinkUrl, setProductLinkUrl]     = useState('')
  const [isParsingLink, setIsParsingLink]       = useState(false)

  // ── Image upload ─────────────────────────────────────────────────────────────
  const [imageFile, setImageFile]         = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Voice input ──────────────────────────────────────────────────────────────
  const [isListening, setIsListening]     = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // ─── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { id: 'electronics', label: isAr ? 'إلكترونيات وموبايلات' : 'Electronics & Mobiles', icon: '📱' },
    { id: 'appliances',  label: isAr ? 'أجهزة منزلية'        : 'Home Appliances',        icon: '🏠' },
    { id: 'automotive',  label: isAr ? 'سيارات وقطع غيار'    : 'Automotive',             icon: '🚗' },
    { id: 'furniture',   label: isAr ? 'أثاث وديكور'         : 'Furniture & Decor',      icon: '🪑' },
    { id: 'services',    label: isAr ? 'خدمات وتشطيب'        : 'Services & Finishing',   icon: '🔧' },
  ]

  const nextStep = () => setStep(s => s === STEP_LOCATION ? STEP_INTAKE : s + 1)
  const prevStep = () => {
    setStep(s => {
      if (s === STEP_REVIEW)  return STEP_CATEGORY
      if (s === STEP_DETAILS) return STEP_CATEGORY
      if (s === STEP_LOCATION) return STEP_DETAILS
      if (s === STEP_INTAKE)  return STEP_LOCATION
      return Math.max(STEP_CATEGORY, s - 1)
    })
  }

  // ── Voice: start/stop listening ───────────────────────────────────────────────
  function toggleVoice() {
    if (!speechSupported) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechAPI()

    // Use Arabic if that's the page locale, else detect from flag config
    const voiceLangs = (voiceFlag.config?.languages as string[]) ?? ['ar', 'en']
    recognition.lang = voiceLangs.includes('ar') ? 'ar-EG' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      // Only the TRANSCRIBED TEXT leaves the browser — no audio blob is sent
      setConciergeText(prev => prev ? `${prev} ${transcript}` : transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      console.warn('[SpeechRecognition] error:', event.error)
      if (event.error === 'not-allowed') {
        setShowMicPermissionModal(true)
      } else {
        alert(isAr 
          ? 'حدث خطأ في التسجيل الصوتي. حاول مرة أخرى.' 
          : 'Voice recognition failed. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.warn('[SpeechRecognition] failed to start:', err)
      setIsListening(false)
    }
  }

  // ── Image: client-side pre-validation ────────────────────────────────────────
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side pre-validation using flag config (server also validates)
    const maxMb = typeof imageFlag.config?.max_size_mb === 'number' ? imageFlag.config.max_size_mb : 8
    const allowed = Array.isArray(imageFlag.config?.allowed_types)
      ? (imageFlag.config.allowed_types as string[])
      : ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxMb * 1024 * 1024) {
      setAiError(isAr ? `الملف أكبر من ${maxMb} ميجابايت` : `File exceeds ${maxMb}MB limit`)
      return
    }
    if (!allowed.includes(file.type)) {
      setAiError(isAr ? 'نوع الملف غير مدعوم' : 'Unsupported file type')
      return
    }

    setAiError('')
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── AI Concierge Submit ───────────────────────────────────────────────────────
  const handleConciergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conciergeText.trim() && !imageFile) return

    setIsParsing(true)
    setAiError('')

    try {
      const fd = new FormData()
      if (conciergeText.trim()) fd.append('text', conciergeText.trim())
      if (imageFile)             fd.append('image', imageFile)

      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()

      if (res.status === 403) {
        setAiError(isAr ? 'هذه الميزة غير متاحة حالياً' : 'This feature is currently disabled')
        return
      }

      if (!res.ok && !data.rejected) {
        setAiError(data.messageAr || (isAr ? 'خطأ في الخادم' : 'Server error'))
        return
      }

      if (data.rejected) {
        setAiError(data.messageAr || (isAr ? 'تعذّر تحليل الطلب' : 'Could not process request'))
        return
      }

      // Success — navigate to Review Step (no auto-fill yet)
      setAiData(data.data)
      setStep(STEP_REVIEW)
    } catch {
      setAiError(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsParsing(false)
    }
  }

  // ── Product Link Submit ─────────────────────────────────────────────────
  const handleProductLinkSubmit = async () => {
    const trimmed = productLinkUrl.trim()
    if (!trimmed) return

    // Client-side quick check — looks like a URL? (real validation is server-side)
    const looksLikeUrl = /^https?:\/\//.test(trimmed)
    if (!looksLikeUrl) {
      setAiError(isAr ? 'يرجى إدخال رابط صحيح يبدأ بـ https://' : 'Please enter a valid URL starting with https://')
      return
    }

    setIsParsingLink(true)
    setAiError('')

    try {
      const res = await fetch('/api/ai/concierge/product-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      const data = await res.json()

      if (res.status === 403) {
        setAiError(isAr ? 'هذه الميزة غير متاحة حالياً' : 'This feature is currently disabled')
        return
      }

      if (!res.ok || data.rejected) {
        setAiError(
          data.messageAr ||
          (isAr ? 'تعذّر استخراج بيانات المنتج، تأكد من الرابط وحاول مرة أخرى' : 'Could not extract product data, please check the link and try again')
        )
        return
      }

      // Success — navigate to Review Step (same as AI concierge text/image path)
      setAiData(data.data)
      setStep(STEP_REVIEW)
    } catch {
      setAiError(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsParsingLink(false)
    }
  }

  // ── Review Confirmed — populate wizard form ───────────────────────────────────
  function handleReviewConfirm(edited: AIExtractedData) {
    // Detect source type: product_link is indicated by sourceUrl in edited data
    const isProductLink = !!edited.sourceUrl
    const hasImage = !!imageFile
    const hasText  = !!conciergeText.trim() && !hasImage
    const newSourceType: 'ai_text' | 'ai_voice' | 'ai_image' | 'product_link' =
      isProductLink ? 'product_link' :
      hasImage      ? 'ai_image'     :
      hasText       ? 'ai_text'      : 'ai_voice'

    setFormData(prev => ({
      ...prev,
      targetLocation: prev.targetLocation || 'القاهرة',
      productName:  edited.productName || prev.productName,
      category:     edited.category    || prev.category,
      quantity:     edited.quantity != null ? String(edited.quantity) : prev.quantity,
      maxPrice:     edited.budgetMax   != null ? String(edited.budgetMax) : prev.maxPrice,
      notes:        edited.notes       || prev.notes,
      brand:        edited.brand       || prev.brand,
      condition:    edited.condition   || prev.condition,
      budgetMin:    edited.budgetMin   != null ? String(edited.budgetMin) : prev.budgetMin,
      budgetMax:    edited.budgetMax   != null ? String(edited.budgetMax) : prev.budgetMax,
      color:        edited.color       || prev.color,
      sourceType:   newSourceType,
      aiConfidence: edited.confidence,
      aiMetadata: {
        isMultipleItems: edited.isMultipleItems,
        items:           edited.items,
        missingFields:   edited.missingFields,
        // Product-link specific traceability fields
        ...(edited.sourceUrl ? { sourceUrl: edited.sourceUrl }     : {}),
        ...(edited.imageUrl  ? { productImageUrl: edited.imageUrl } : {}),
      },
    }))

    // Advance to Intake step (name/phone) — skips manual steps for AI path
    setStep(STEP_INTAKE)
  }

  // ── Final Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Build metadata for extra fields (manual_builder_v2 + AI)
    const metadata: Record<string, unknown> = {
      ...formData.aiMetadata,
      ...(manualV2.enabled
        ? {
            brand:         formData.brand        || undefined,
            condition:     formData.condition    || undefined,
            budgetMin:     formData.budgetMin    ? Number(formData.budgetMin)  : undefined,
            budgetMax:     formData.budgetMax    ? Number(formData.budgetMax)  : undefined,
            urgency:       formData.urgency      || undefined,
            color:         formData.color        || undefined,
            size:          formData.size         || undefined,
            referenceLink: formData.referenceLink || undefined,
          }
        : {}),
    }

    try {
      const res = await fetch('/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerPhone:  formData.customerPhone || lookupPhone,
          metadata,
          source_type:    formData.sourceType,
          ai_confidence:  formData.aiConfidence,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        try {
          sessionStorage.clear()
        } catch {}
        router.push(`/${locale}/customer/dashboard?requestId=${data.requestId}&code=${data.requestCode}`)
      } else {
        alert(data.error || 'Failed to submit request')
        setIsSubmitting(false)
      }
    } catch {
      alert(isAr ? 'خطأ في الاتصال بالخادم' : 'Network error')
      setIsSubmitting(false)
    }
  }

  // ── Progress calculation (4 visual steps for progress bar) ───────────────────
  const progressStep =
    step === STEP_CATEGORY ? 1 :
    step === STEP_REVIEW   ? 2 :
    step === STEP_DETAILS  ? 2 :
    step === STEP_LOCATION ? 3 : 4

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'} data-testid="start-request-page">
        <div className="wizard-header relative z-10" style={{ opacity: 0.5 }}>
          <h1 className="wizard-title">
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'} data-testid="start-request-page">
      {/* Decorative Glow */}
      <div className="wizard-glow-top" />
      <div className="wizard-glow-bottom" />

      {/* Header */}
      <div className="wizard-header relative z-10">
        <Link href={`/${locale}`} className="wizard-back-link">
          {isAr ? '← العودة للرئيسية' : '← Back to Home'}
        </Link>
        <h1 className="wizard-title">
          {isAr ? 'ابحث عن ما تريد 🎯' : 'Find What You Need 🎯'}
        </h1>
        <div className="wizard-progress-bar">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`wizard-progress-step ${s <= progressStep ? 'is-active' : ''}`} />
          ))}
        </div>
      </div>

      {/* ── STEP 1: Category + AI Concierge ──────────────────────────────────── */}
      {step === STEP_CATEGORY && (
        <div className="wizard-step-panel">
          {/* AI Concierge Card — only if flag enabled and not loading */}
          {!textFlag.loading && textFlag.enabled && (
            <div className="wizard-ai-card">
              <div className="wizard-ai-header">
                <span className="wizard-ai-emoji">🔮</span>
                <div className="wizard-ai-titles">
                  <h3 className="wizard-ai-title">
                    {isAr ? 'المساعد الذكي للطلبات (AI Concierge)' : 'AI Concierge Sourcing Assistant'}
                  </h3>
                  <p className="wizard-ai-subtitle">
                    {isAr
                      ? 'اكتب ما تبحث عنه أو ارفع صورة وسنستخرج التفاصيل تلقائياً'
                      : 'Type what you need or upload a photo and we will extract the details'}
                  </p>
                </div>
              </div>

              <div className="wizard-ai-body">
                {/* Textarea + Voice button row */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={conciergeText}
                    onChange={e => setConciergeText(e.target.value)}
                    disabled={isParsing}
                    rows={2}
                    className="wizard-textarea"
                    placeholder={isAr
                      ? 'عايز تكييف 1.5 حصان في حدود 20 ألف جنيه في القاهرة...'
                      : 'I want a 1.5 HP air conditioner around 20k EGP in Cairo...'}
                    style={{ paddingInlineEnd: '48px' }}
                  />

                  {/* Microphone button — only if voice flag enabled + speech API available */}
                  {!voiceFlag.loading && voiceFlag.enabled && speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      disabled={isParsing}
                      className={`wizard-mic-btn ${isListening ? 'is-listening' : ''}`}
                      title={isAr ? (isListening ? 'إيقاف الاستماع' : 'تحدث الآن') : (isListening ? 'Stop listening' : 'Speak now')}
                    >
                      🎙️
                    </button>
                  )}
                </div>

                {/* Listening indicator */}
                {isListening && (
                  <div className="wizard-listening-badge">
                    <span className="wizard-listening-dot" />
                    {isAr ? '...جاري الاستماع' : '...Listening'}
                  </div>
                )}

                {/* Image upload area — only if image flag enabled */}
                {!imageFlag.loading && imageFlag.enabled && (
                  <div>
                    {imagePreviewUrl ? (
                      <div className="wizard-image-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreviewUrl} alt="preview" className="wizard-image-thumb" />
                        <div className="wizard-image-info">
                          <span className="wizard-image-name">{imageFile?.name}</span>
                          <button type="button" onClick={removeImage} className="wizard-image-remove">
                            {isAr ? 'حذف' : 'Remove'} ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="wizard-image-upload-label">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={(imageFlag.config?.allowed_types as string[] | undefined)?.join(',') ?? 'image/jpeg,image/png,image/webp'}
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                          disabled={isParsing}
                        />
                        <span className="wizard-image-upload-icon">📎</span>
                        <span>
                          {isAr
                            ? `ارفع صورة المنتج أو الفاتورة (حتى ${imageFlag.config?.max_size_mb ?? 8} ميجابايت)`
                            : `Upload product image or invoice (up to ${imageFlag.config?.max_size_mb ?? 8}MB)`}
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Product Link input — only if product_link_input flag enabled */}
                {!productLinkFlag.loading && productLinkFlag.enabled && (
                  <div className="wizard-product-link-section">
                    <div className="wizard-product-link-divider">
                      <div className="wizard-product-link-divider-line" />
                      <span className="wizard-product-link-divider-text">
                        {isAr ? 'أو ألصق رابط المنتج' : 'Or paste product link'}
                      </span>
                      <div className="wizard-product-link-divider-line" />
                    </div>
                    <div className="wizard-product-link-row">
                      <input
                        id="product-link-input"
                        type="url"
                        value={productLinkUrl}
                        onChange={e => { setProductLinkUrl(e.target.value); setAiError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleProductLinkSubmit() } }}
                        disabled={isParsingLink || isParsing}
                        className="wizard-product-link-input"
                        placeholder={isAr
                          ? 'https://www.amazon.eg/... أو noon.com أو AliExpress'
                          : 'https://www.amazon.eg/... or noon.com or AliExpress'}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        id="product-link-submit"
                        onClick={handleProductLinkSubmit}
                        disabled={isParsingLink || isParsing || !productLinkUrl.trim()}
                        className="wizard-product-link-btn"
                      >
                        {isParsingLink ? (
                          <>
                            <span className="wizard-spinner" />
                            {isAr ? 'جاري...' : 'Fetching...'}
                          </>
                        ) : (
                          <>🔗 {isAr ? 'استخراج' : 'Extract'}</>
                        )}
                      </button>
                    </div>
                    <p className="wizard-product-link-hint">
                      {isAr
                        ? '💡 سنستخرج اسم المنتج والسعر تلقائياً — أمازون ، نون ، AliExpress'
                        : '💡 We’ll auto-extract the product name and price — Amazon, Noon, AliExpress'}
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {aiError && (
                  <div className="wizard-error-banner">⚠️ {aiError}</div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleConciergeSubmit}
                  disabled={isParsing || isParsingLink || (!conciergeText.trim() && !imageFile)}
                  className="wizard-btn-concierge"
                >
                  {isParsing ? (
                    <>
                      <span className="wizard-spinner" />
                      {isAr ? 'جاري التحليل...' : 'Analysing...'}
                    </>
                  ) : (
                    isAr ? 'خلوا Findora تدورلي 🔮' : 'Let Findora Search For Me 🔮'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="wizard-divider">
            <div className="wizard-divider-line" />
            <span className="wizard-divider-text">
              {isAr ? 'أو حدد الفئة يدوياً' : 'Or select category manually'}
            </span>
            <div className="wizard-divider-line" />
          </div>

          {/* Category Grid */}
          <h2 className="wizard-step-title">{isAr ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}</h2>
          <div className="wizard-categories-grid">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, category: cat.id })
                  setStep(STEP_DETAILS)
                }}
                className="wizard-category-btn"
                data-testid={`wizard-category-${cat.id}`}
              >
                <div className="wizard-category-icon">{cat.icon}</div>
                <div className="wizard-category-label">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 0 (RETURNING): Optional returning-customer lookup ────────────── */}
      {step === STEP_RETURNING && historyFlag.enabled && (
        <div className="wizard-step-panel">
          <ReturningCustomerStep
            isAr={isAr}
            onSkip={() => setStep(STEP_CATEGORY)}
            onReuse={(data: ReusedRequestData) => {
              // Map the reused request to the AIExtractedData shape that
              // ReviewScreen expects. Confidence = 100 (customer-confirmed data),
              // no missing fields, no AI uncertainty warnings.
              const mapped: AIExtractedData = {
                confidence:      100,
                productName:     data.productName,
                category:        data.category,
                quantity:        null,
                budgetMin:       null,
                budgetMax:       data.maxPrice ?? null,
                brand:           null,
                condition:       null,
                color:           null,
                notes:           data.notes ?? '',
                missingFields:   [],
                isMultipleItems: false,
                items:           null,
                imageUrl:        null,
                sourceUrl:       null,
              }
              setAiData(mapped)
              setLookupPhone(data.lookupPhone)
              // Populate the formData state fully to ensure no missing required fields
              setFormData(prev => ({
                ...prev,
                productName:    data.productName,
                category:       data.category,
                targetLocation: data.targetLocation || 'القاهرة',
                maxPrice:       data.maxPrice != null ? String(data.maxPrice) : '',
                notes:          data.notes || '',
                customerPhone:  data.lookupPhone,
                sourceType:     data.sourceType,
              }))
              setStep(STEP_REVIEW)
            }}
          />
        </div>
      )}

      {/* ── STEP REVIEW: AI Extracted Data Review ────────────────────────────── */}
      {step === STEP_REVIEW && aiData && (
        <div className="wizard-step-panel">
          <ReviewScreen
            aiData={aiData}
            confidence={aiData.confidence}
            isAr={isAr}
            onConfirm={handleReviewConfirm}
            onBack={() => setStep(step === STEP_REVIEW && lookupPhone ? STEP_RETURNING : STEP_CATEGORY)}
          />
        </div>
      )}

      {/* ── STEP 2: Product Details (manual path) ──────────────────────────── */}
      {step === STEP_DETAILS && (
        <form onSubmit={e => { e.preventDefault(); setStep(STEP_LOCATION) }} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'تفاصيل الطلب' : 'Request Details'}</h2>

            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'اسم المنتج أو الخدمة بدقة' : 'Exact Product or Service Name'}
              </label>
              <input
                required
                autoFocus
                value={formData.productName}
                onChange={e => setFormData({ ...formData, productName: e.target.value })}
                className="wizard-input"
                data-testid="start-request-title-input"
                placeholder={isAr ? 'مثال: آيفون 15 برو ماكس 256 جيجا' : 'e.g. iPhone 15 Pro Max 256GB'}
              />
            </div>

            {/* manual_builder_v2 extended fields */}
            {!manualV2.loading && manualV2.enabled && (
              <div className="wizard-v2-fields">
                <div className="wizard-grid-2">
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الماركة (اختياري)' : 'Brand (Optional)'}</label>
                    <input
                      value={formData.brand}
                      onChange={e => setFormData({ ...formData, brand: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? 'مثال: Samsung' : 'e.g. Samsung'}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الحالة' : 'Condition'}</label>
                    <select
                      value={formData.condition}
                      onChange={e => setFormData({ ...formData, condition: e.target.value })}
                      className="wizard-input-sm wizard-select"
                    >
                      <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
                      <option value="new">{isAr ? 'جديد' : 'New'}</option>
                      <option value="used">{isAr ? 'مستعمل' : 'Used'}</option>
                      <option value="any">{isAr ? 'أي حالة' : 'Any'}</option>
                    </select>
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'أقل ميزانية (جنيه)' : 'Min Budget (EGP)'}</label>
                    <input
                      type="number" min={0}
                      value={formData.budgetMin}
                      onChange={e => setFormData({ ...formData, budgetMin: e.target.value })}
                      className="wizard-input-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'أقصى ميزانية (جنيه)' : 'Max Budget (EGP)'}</label>
                    <input
                      type="number" min={0}
                      value={formData.budgetMax}
                      onChange={e => setFormData({ ...formData, budgetMax: e.target.value })}
                      className="wizard-input-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'اللون (اختياري)' : 'Color (Optional)'}</label>
                    <input
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? 'مثال: أسود' : 'e.g. Black'}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'المقاس / الحجم (اختياري)' : 'Size (Optional)'}</label>
                    <input
                      value={formData.size}
                      onChange={e => setFormData({ ...formData, size: e.target.value })}
                      className="wizard-input-sm"
                      placeholder={isAr ? 'مثال: XL أو 65 بوصة' : 'e.g. XL or 65 inch'}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'مستوى الأولوية' : 'Urgency'}</label>
                    <select
                      value={formData.urgency}
                      onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                      className="wizard-input-sm wizard-select"
                    >
                      <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
                      <option value="normal">{isAr ? 'عادي' : 'Normal'}</option>
                      <option value="high">{isAr ? 'عالي' : 'High'}</option>
                      <option value="urgent">{isAr ? 'عاجل' : 'Urgent'}</option>
                    </select>
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'رابط مرجعي (اختياري)' : 'Reference Link (Optional)'}</label>
                    <input
                      type="url"
                      value={formData.referenceLink}
                      onChange={e => setFormData({ ...formData, referenceLink: e.target.value })}
                      className="wizard-input-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* B2B Toggle */}
            <div className="wizard-toggle-container">
              <input
                type="checkbox"
                id="isBusiness"
                checked={formData.isBusiness}
                onChange={e => setFormData({ ...formData, isBusiness: e.target.checked })}
                className="wizard-checkbox-input"
              />
              <label htmlFor="isBusiness" className="wizard-checkbox-label">
                {isAr ? '🏢 طلب شراء لشركة / مؤسسة (B2B Request)' : '🏢 Corporate / B2B Sourcing Request'}
              </label>
            </div>

            {formData.isBusiness && (
              <div className="wizard-b2b-panel">
                <h3 className="wizard-b2b-title">
                  {isAr ? 'تفاصيل الشركة والمشتريات' : 'Company & Procurement Details'}
                </h3>
                <div className="wizard-grid-2">
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'اسم الشركة *' : 'Company Name *'}</label>
                    <input required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'مثال: شركة فايندورا للتجارة' : 'e.g. Findora Trading Co.'} />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الكمية المطلوبة *' : 'Required Quantity *'}</label>
                    <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="wizard-input-sm" placeholder="1" />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'رقم السجل التجاري *' : 'CR Number *'}</label>
                    <input required value={formData.crNumber} onChange={e => setFormData({ ...formData, crNumber: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'السجل التجاري' : '6-7 digit CR'} />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الرقم الضريبي *' : 'Tax Number *'}</label>
                    <input required value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'الرقم الضريبي' : '9 digit Tax ID'} />
                  </div>
                </div>
              </div>
            )}

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'أي ملاحظات إضافية؟ (اختياري)' : 'Any additional notes? (Optional)'}</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="wizard-textarea" placeholder={isAr ? 'مثال: يفضل اللون الأسود، أو أريد جهاز جديد بضمان محلي' : 'e.g. Prefer black color, must have local warranty'} />
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={() => setStep(STEP_CATEGORY)} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={!formData.productName || (formData.isBusiness && (!formData.companyName || !formData.crNumber || !formData.taxNumber))} className="wizard-btn-primary" data-testid="wizard-next-details">{isAr ? 'التالي' : 'Next'}</button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 3: Location & Budget ─────────────────────────────────────────── */}
      {step === STEP_LOCATION && (
        <form onSubmit={e => { e.preventDefault(); setStep(STEP_INTAKE) }} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'المكان والميزانية' : 'Location & Budget'}</h2>

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'في أي منطقة تبحث؟' : 'Which area are you searching in?'}</label>
              <input required autoFocus value={formData.targetLocation} onChange={e => setFormData({ ...formData, targetLocation: e.target.value })} className="wizard-input" data-testid="wizard-location-input" placeholder={isAr ? 'مثال: المعادي، القاهرة' : 'e.g. Maadi, Cairo'} />
            </div>

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'أقصى ميزانية (EGP) - اختياري' : 'Maximum Budget (EGP) - Optional'}</label>
              <input type="number" value={formData.maxPrice} onChange={e => setFormData({ ...formData, maxPrice: e.target.value })} className="wizard-input" placeholder="0.00" />
              <p className="wizard-input-hint">
                {isAr ? 'إذا تركتها فارغة، سنحضر لك أرخص الأسعار في السوق.' : 'If left blank, we will find the absolute lowest prices available.'}
              </p>
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={() => setStep(STEP_DETAILS)} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={!formData.targetLocation} className="wizard-btn-primary" data-testid="wizard-next-location">{isAr ? 'التالي' : 'Next'}</button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 4 (INTAKE): Contact & Submit ─────────────────────────────────── */}
      {step === STEP_INTAKE && (
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'الخطوة الأخيرة 🚀' : 'Final Step 🚀'}</h2>

            <div className="wizard-upsell-banner">
              <div className="wizard-upsell-emoji">🎁</div>
              <div className="wizard-upsell-content">
                <h4 className="wizard-upsell-title">{isAr ? 'احصل على خدمة "المشتريات العادية" مجاناً!' : 'Get "Everyday Purchase" service for FREE!'}</h4>
                <p className="wizard-upsell-text">{isAr ? 'إذا أنشأت حساباً مجانياً الآن، ستحصل على بحث مجاني تماماً.' : 'If you create a free account now, this search is on us.'}</p>
                <Link href={`/${locale}/auth/signup`} className="wizard-upsell-link">
                  {isAr ? 'إنشاء حساب والحصول على العرض' : 'Create Account & Claim Offer'}
                </Link>
              </div>
            </div>

            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label className="wizard-label">{isAr ? 'الاسم *' : 'Your Name *'}</label>
                <input required autoFocus value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="wizard-input" data-testid="start-request-full-name-input" />
              </div>
              <div className="wizard-form-group">
                <label className="wizard-label">{isAr ? 'رقم الهاتف (لإرسال العروض) *' : 'Phone Number (to send offers) *'}</label>
                {/* Phase 3: pre-filled from returning-customer lookup if customer used that step.
                    Customer can still edit freely — this is convenience only, not locked. */}
                <input required type="tel"
                  value={formData.customerPhone || lookupPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="wizard-input"
                  data-testid="start-request-phone-input" />
              </div>
            </div>

            {/* Target Location input — required for database request creation */}
            <div className="wizard-form-group" style={{ marginTop: '16px' }}>
              <label className="wizard-label">{isAr ? 'المدينة / المنطقة (لتوصيل العروض) *' : 'City / Region (for delivering offers) *'}</label>
              <input required
                value={formData.targetLocation}
                onChange={e => setFormData({ ...formData, targetLocation: e.target.value })}
                className="wizard-input"
                placeholder={isAr ? 'مثال: القاهرة، المعادي' : 'e.g. Cairo, Maadi'} />
            </div>

            <div className="wizard-actions wizard-footer-actions">
              <button type="button" onClick={prevStep} disabled={isSubmitting} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={isSubmitting || !formData.customerName || !formData.customerPhone || !formData.targetLocation} className="wizard-btn-submit" data-testid="start-request-submit">
                {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'أرسل الطلب الآن' : 'Submit Request')}
              </button>
            </div>
          </div>
        </form>
      )}

      <Modal
        isOpen={showMicPermissionModal}
        onClose={() => setShowMicPermissionModal(false)}
        title={isAr ? 'تفعيل صلاحية استخدام المايكروفون' : 'Enable Microphone Permission'}
      >
        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'start' }}>
          <p style={{ marginBottom: 'var(--space-16)', color: 'var(--text-secondary)' }}>
            {isAr 
              ? 'يبدو أن الوصول للميكروفون محجوب من إعدادات المتصفح أو نظام التشغيل. يرجى اتباع الخطوات التالية للتفعيل:'
              : 'Microphone access is blocked by your browser or operating system settings. Please follow these steps to enable it:'}
          </p>

          <div style={{ marginBottom: 'var(--space-20)' }}>
            <h4 style={{ color: 'hsl(258, 89%, 76%)', margin: '0 0 var(--space-8) 0', fontSize: '1rem', fontWeight: 700 }}>
              {isAr ? '1. من إعدادات المتصفح (الموقع):' : '1. Browser Site Settings:'}
            </h4>
            <ul style={{ margin: 0, paddingInlineStart: 'var(--space-20)', listStyleType: 'disc' }}>
              <li>
                {isAr
                  ? 'اضغط على أيقونة القفل أو الإعدادات 🔒 بجانب رابط الموقع في شريط العنوان بالأعلى.'
                  : 'Click the padlock or settings icon 🔒 next to the website URL in the address bar at the top.'}
              </li>
              <li>
                {isAr
                  ? 'ابحث عن "الميكروفون" (Microphone) وقم بتعديل الخيار إلى "سماح" (Allow).'
                  : 'Find "Microphone" and change the option to "Allow".'}
              </li>
              <li>
                {isAr
                  ? 'قم بتحديث الصفحة (Refresh) وحاول مجدداً.'
                  : 'Refresh the page and try again.'}
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'hsl(258, 89%, 76%)', margin: '0 0 var(--space-8) 0', fontSize: '1rem', fontWeight: 700 }}>
              {isAr ? '2. من إعدادات الويندوز (إذا ظل معطلاً):' : '2. Windows Settings (if still disabled):'}
            </h4>
            <ul style={{ margin: 0, paddingInlineStart: 'var(--space-20)', listStyleType: 'disc' }}>
              <li>
                {isAr
                  ? 'افتح قائمة ابدأ (Start) ثم الإعدادات (Settings ⚙️).'
                  : 'Open the Start menu and go to Settings ⚙️.'}
              </li>
              <li>
                {isAr
                  ? 'اذهب إلى الخصوصية والأمان (Privacy & security) -> الميكروفون (Microphone).'
                  : 'Go to Privacy & security -> Microphone.'}
              </li>
              <li>
                {isAr
                  ? 'تأكد من تفعيل "الوصول إلى الميكروفون" (Microphone access).'
                  : 'Ensure "Microphone access" is turned On.'}
              </li>
              <li>
                {isAr
                  ? 'تأكد من تفعيل "السماح للتطبيقات بالوصول إلى الميكروفون" (Let apps access your microphone).'
                  : 'Ensure "Let apps access your microphone" is turned On.'}
              </li>
              <li>
                {isAr
                  ? 'انزل لأسفل وتأكد من تفعيل "السماح لبرامج سطح المكتب بالوصول للميكروفون" (Let desktop apps access your microphone) وتأكد من السماح للمتصفح (Chrome).'
                  : 'Scroll down and ensure "Let desktop apps access your microphone" is turned On, and that your browser (e.g. Chrome) is allowed.'}
              </li>
            </ul>
          </div>

          <div style={{ marginTop: 'var(--space-24)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowMicPermissionModal(false)}
              className="wizard-btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              {isAr ? 'حسناً، فهمت' : 'OK, Got it'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Scoped CSS ─────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wizard-container {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.7);
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }
        .wizard-glow-top {
          position: absolute; top: 0; right: 0; width: 256px; height: 256px;
          background: hsl(258, 89%, 66%); opacity: 0.2; filter: blur(100px);
          border-radius: 50%; pointer-events: none;
        }
        .wizard-glow-bottom {
          position: absolute; bottom: 0; left: 0; width: 256px; height: 256px;
          background: hsl(152, 69%, 51%); opacity: 0.1; filter: blur(100px);
          border-radius: 50%; pointer-events: none;
        }
        .wizard-header { margin-bottom: 32px; }
        .wizard-back-link {
          font-size: 14px; color: #94a3b8; text-decoration: none;
          margin-bottom: 16px; display: inline-block; transition: color 0.2s ease;
        }
        .wizard-back-link:hover { color: white; }
        .wizard-title { font-size: 28px; font-weight: 800; color: white; margin-bottom: 16px; }
        .wizard-progress-bar { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
        .wizard-progress-step {
          height: 8px; border-radius: 9999px; flex: 1;
          background: rgba(255,255,255,0.1); transition: background-color 0.5s ease;
        }
        .wizard-progress-step.is-active { background: hsl(258, 89%, 66%); }
        .wizard-step-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: white; text-align: start; }

        /* AI Concierge card */
        .wizard-ai-card {
          padding: 24px; border-radius: 16px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent);
          margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
        }
        .wizard-ai-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .wizard-ai-emoji { font-size: 24px; }
        .wizard-ai-titles { text-align: start; }
        .wizard-ai-title { font-size: 18px; font-weight: 700; color: white; margin: 0 0 4px 0; }
        .wizard-ai-subtitle { font-size: 12px; color: #94a3b8; margin: 0; }
        .wizard-ai-body { display: flex; flex-direction: column; gap: 16px; }

        /* Mic button */
        .wizard-mic-btn {
          position: absolute !important; inset-inline-end: 10px; top: 50%; transform: translateY(-50%);
          width: 36px !important; height: 36px !important; border-radius: 50% !important;
          background: rgba(139,92,246,0.15) !important; border: 1px solid rgba(139,92,246,0.3) !important;
          cursor: pointer !important; font-size: 16px !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        .wizard-mic-btn:hover:not(:disabled) { background: rgba(139,92,246,0.3) !important; }
        .wizard-mic-btn.is-listening {
          background: rgba(239,68,68,0.2) !important; border-color: rgba(239,68,68,0.5) !important;
          animation: micPulse 1s ease-in-out infinite;
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }

        /* Listening badge */
        .wizard-listening-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #ef4444; font-weight: 700; padding: 8px 0;
        }
        .wizard-listening-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
          animation: micPulse 1s ease-in-out infinite;
        }

        /* Image upload */
        .wizard-image-upload-label {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          border: 1.5px dashed rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.04);
          cursor: pointer; font-size: 13px; color: #94a3b8;
          transition: all 0.2s ease;
        }
        .wizard-image-upload-label:hover {
          border-color: rgba(139,92,246,0.6); background: rgba(139,92,246,0.08); color: white;
        }
        .wizard-image-upload-icon { font-size: 18px; }
        .wizard-image-preview {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          border: 1px solid rgba(139,92,246,0.3); background: rgba(139,92,246,0.06);
        }
        .wizard-image-thumb {
          width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .wizard-image-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
        .wizard-image-name { font-size: 13px; color: white; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        button.wizard-image-remove {
          font-size: 11px !important; color: #ef4444 !important; background: transparent !important;
          border: none !important; cursor: pointer !important; padding: 0 !important;
          font-weight: 700 !important; text-align: start !important;
        }

        /* Product link section */
        .wizard-product-link-section {
          display: flex; flex-direction: column; gap: 10px; margin-top: 4px;
        }
        .wizard-product-link-divider {
          display: flex; align-items: center; gap: 10px;
        }
        .wizard-product-link-divider-line {
          flex: 1; height: 1px; background: rgba(255,255,255,0.08);
        }
        .wizard-product-link-divider-text {
          font-size: 11px; color: #64748b; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
        }
        .wizard-product-link-row {
          display: flex; gap: 8px; align-items: center;
        }
        .wizard-product-link-input {
          flex: 1; border-radius: 10px; background: rgba(0,0,0,0.4);
          padding: 12px 14px; color: white; font-size: 13px;
          border: 1px solid rgba(59,130,246,0.25); outline: none;
          transition: border-color 0.2s ease; box-sizing: border-box;
          min-width: 200px;
        }
        .wizard-product-link-input:focus {
          border-color: rgba(59,130,246,0.6);
        }
        .wizard-product-link-input::placeholder { color: #475569; }
        button.wizard-product-link-btn {
          padding: 0 16px !important; border-radius: 10px !important;
          background: rgba(59,130,246,0.15) !important;
          border: 1px solid rgba(59,130,246,0.3) !important;
          color: #60a5fa !important; font-weight: 700 !important;
          font-size: 13px !important; cursor: pointer !important;
          transition: all 0.2s ease !important; white-space: nowrap !important;
          display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;
          width: 140px !important; height: 43px !important; box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }
        button.wizard-product-link-btn:hover:not(:disabled) {
          background: rgba(59,130,246,0.25) !important;
          border-color: rgba(59,130,246,0.5) !important;
        }
        button.wizard-product-link-btn:disabled {
          opacity: 0.4 !important; cursor: not-allowed !important;
        }
        .wizard-product-link-hint {
          font-size: 11px; color: #475569; margin: 0; text-align: start;
        }


        /* v2 extended fields */
        .wizard-v2-fields {
          padding: 16px; border-radius: 12px;
          border: 1px solid rgba(200,151,59,0.2); background: rgba(200,151,59,0.04);
          margin-bottom: 8px;
        }

        /* Select styling */
        .wizard-select {
          appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: calc(100% - 12px) center;
          padding-inline-end: 32px !important;
        }

        /* Textarea */
        .wizard-textarea {
          width: 100%; border-radius: 12px; background: rgba(0,0,0,0.4);
          padding: 16px; color: white; border: 1px solid rgba(255,255,255,0.1);
          font-size: 14px; transition: border-color 0.2s ease;
          outline: none; box-sizing: border-box; resize: vertical;
        }
        .wizard-textarea:focus { border-color: hsl(258, 89%, 66%); }

        /* Error */
        .wizard-error-banner {
          font-size: 12px; color: #f87171; font-weight: 500;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
          padding: 12px; border-radius: 8px; text-align: start;
        }

        /* Divider */
        .wizard-divider { display: flex; padding: 16px 0; align-items: center; }
        .wizard-divider-line { flex-grow: 1; border-top: 1px solid rgba(255,255,255,0.05); }
        .wizard-divider-text {
          flex-shrink: 0; margin: 0 16px; font-size: 12px;
          color: rgba(255,255,255,0.45); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        /* Categories */
        .wizard-categories-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;
        }
        button.wizard-category-btn {
          background: rgba(255,255,255,0.05) !important; color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important; padding: 24px !important;
          border-radius: 12px !important; display: flex !important; flex-direction: column !important;
          align-items: center !important; justify-content: center !important;
          text-align: center !important; cursor: pointer !important;
          transition: all 0.2s ease !important; width: 100% !important;
        }
        button.wizard-category-btn:hover {
          background: rgba(139,92,246,0.2) !important; border-color: rgba(139,92,246,0.5) !important;
          transform: translateY(-2px) !important;
        }
        .wizard-category-icon { font-size: 36px; margin-bottom: 12px; transition: transform 0.2s ease; }
        button.wizard-category-btn:hover .wizard-category-icon { transform: scale(1.1); }
        .wizard-category-label { font-weight: 700; font-size: 14px; color: #ffffff !important; }

        /* Inputs & Labels */
        .wizard-form-group { margin-bottom: 20px; text-align: start; }
        .wizard-label { display: block; font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 7px; }
        .wizard-label-sm { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
        .wizard-input {
          width: 100%; border-radius: 12px; background: rgba(0,0,0,0.5);
          padding: 14px; color: white; border: 1px solid rgba(255,255,255,0.2);
          outline: none; font-size: 15px; transition: border-color 0.2s ease; box-sizing: border-box;
        }
        .wizard-input:focus { border-color: hsl(258, 89%, 66%); }
        .wizard-input-hint { font-size: 12px; color: #64748b; margin-top: 8px; }
        .wizard-input-sm {
          width: 100%; border-radius: 10px; background: rgba(0,0,0,0.5);
          padding: 10px 12px; color: white; border: 1px solid rgba(255,255,255,0.2);
          outline: none; font-size: 13px; transition: border-color 0.2s ease; box-sizing: border-box;
        }
        .wizard-input-sm:focus { border-color: hsl(258, 89%, 66%); }

        /* Grid */
        .wizard-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

        /* B2B */
        .wizard-toggle-container {
          display: flex; align-items: center; gap: 12px; padding: 16px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); margin-bottom: 20px;
        }
        .wizard-checkbox-input { width: 20px; height: 20px; accent-color: hsl(258, 89%, 66%); cursor: pointer; }
        .wizard-checkbox-label { font-size: 14px; font-weight: 700; color: white; cursor: pointer; user-select: none; }
        .wizard-b2b-panel {
          padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.4); margin-bottom: 20px;
        }
        .wizard-b2b-title {
          font-size: 14px; font-weight: 700; color: hsl(258, 89%, 66%);
          margin-top: 0; margin-bottom: 16px; text-align: start;
        }

        /* Upsell */
        .wizard-upsell-banner {
          padding: 16px; border-radius: 12px; border: 1px solid rgba(217,119,6,0.5);
          background: rgba(217,119,6,0.1); display: flex; gap: 16px;
          margin-bottom: 24px; text-align: start;
        }
        .wizard-upsell-emoji { font-size: 24px; }
        .wizard-upsell-title { font-weight: 700; color: #d97706; margin: 0 0 4px 0; }
        .wizard-upsell-text { font-size: 14px; color: white; margin: 0 0 8px 0; }
        .wizard-upsell-link {
          font-size: 12px; font-weight: 700; background: #d97706; color: black;
          padding: 4px 12px; border-radius: 6px; text-decoration: none;
          transition: background-color 0.2s ease; display: inline-block;
        }
        .wizard-upsell-link:hover { background-color: white; }

        /* Actions */
        .wizard-actions { display: flex; justify-content: space-between; margin-top: 28px; gap: 16px; }
        .wizard-footer-actions { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }

        /* Buttons */
        button.wizard-btn-concierge {
          width: 100% !important; padding: 12px 16px !important;
          background: hsl(258, 89%, 66%) !important; color: white !important;
          font-weight: 800 !important; border-radius: 12px !important;
          border: none !important; cursor: pointer !important;
          transition: all 0.2s ease !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          gap: 8px !important; box-shadow: 0 0 20px rgba(139,92,246,0.3) !important;
          font-size: 14px !important;
        }
        button.wizard-btn-concierge:hover:not(:disabled) {
          background: hsl(258, 89%, 76%) !important; transform: translateY(-1px) !important;
        }
        button.wizard-btn-concierge:disabled {
          opacity: 0.5 !important; cursor: not-allowed !important; transform: none !important; box-shadow: none !important;
        }
        button.wizard-btn-primary {
          width: auto !important; padding: 12px 24px !important;
          background: hsl(258, 89%, 66%) !important; color: white !important;
          font-weight: 700 !important; border-radius: 12px !important;
          border: none !important; cursor: pointer !important;
          transition: all 0.2s ease !important; display: inline-flex !important;
          align-items: center !important; justify-content: center !important;
          box-shadow: 0 0 20px rgba(139,92,246,0.4) !important;
        }
        button.wizard-btn-primary:hover:not(:disabled) {
          background: hsl(258, 89%, 76%) !important; transform: translateY(-1px) !important;
        }
        button.wizard-btn-primary:disabled { opacity: 0.5 !important; cursor: not-allowed !important; box-shadow: none !important; }
        button.wizard-btn-secondary {
          width: auto !important; padding: 12px 24px !important;
          background: transparent !important; color: white !important;
          font-weight: 700 !important; border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.2) !important; cursor: pointer !important;
          transition: all 0.2s ease !important; display: inline-flex !important;
          align-items: center !important; justify-content: center !important;
        }
        button.wizard-btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.1) !important; transform: translateY(-1px) !important;
        }
        button.wizard-btn-submit {
          width: auto !important; padding: 12px 24px !important;
          background: hsl(152, 69%, 51%) !important; color: black !important;
          font-weight: 800 !important; border-radius: 12px !important;
          border: none !important; cursor: pointer !important;
          transition: all 0.2s ease !important; display: inline-flex !important;
          align-items: center !important; justify-content: center !important;
          box-shadow: 0 0 20px rgba(16,185,129,0.4) !important;
        }
        button.wizard-btn-submit:hover:not(:disabled) {
          background: hsl(152, 69%, 61%) !important; transform: translateY(-1px) !important;
        }
        button.wizard-btn-submit:disabled { opacity: 0.5 !important; cursor: not-allowed !important; box-shadow: none !important; }

        .wizard-spinner {
          width: 16px; height: 16px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 1s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive */
        @media (max-width: 768px) {
          .wizard-grid-2, .wizard-categories-grid { grid-template-columns: 1fr; }
          .wizard-container { padding: 20px; }
        }

        /* Select options dark background */
        .wizard-select option, select.wizard-input-sm option { background: #0b0f19; color: white; }
      ` }} />
    </div>
  )
}
