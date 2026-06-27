// src/app/[locale]/start-request/StartRequestForm.tsx

'use client'

import { useActionState, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import RequestHeader from '@/components/RequestHeader'
import { submitQuickRequest } from './actions'
import type { ResolvedPricing } from '@/lib/pricing/resolver'

type Props = {
  dict: any
  locale: string
  isRTL: boolean
  everydayPricing?: ResolvedPricing
}

function CustomSelect({
  name,
  options,
  defaultValue,
}: {
  name: string
  options: Array<{ value: string; label: string }>
  defaultValue: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(
    options.find((o) => o.value === defaultValue) || options[0]
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nextSelected = options.find((o) => o.value === defaultValue) || options[0]
    setSelected(nextSelected)
  }, [defaultValue, options])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="custom-select-container" ref={ref}>
      <input type="hidden" name={name} value={selected.value} />

      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="trigger-text">{selected.label}</span>
        <svg className="trigger-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown animate-fade-in">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`custom-select-option ${selected.value === opt.value ? 'is-selected' : ''}`}
              onClick={() => {
                setSelected(opt)
                setIsOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function validateImage(file: File) {
  if (!file) return { valid: true };

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'invalid_type' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'file_too_large' };
  }

  return { valid: true };
}

function getClientErrorMessage(errorKey: string, locale: string) {
  if (locale === 'ar') {
    if (errorKey === 'file_too_large') return 'حجم الصورة لازم يكون أقل من ٥ ميجا.';
    if (errorKey === 'invalid_type') return 'مسموح فقط برفع الصور.';
  } else {
    if (errorKey === 'file_too_large') return 'Image size must be less than 5MB.';
    if (errorKey === 'invalid_type') return 'Only image files are allowed.';
  }
  return '';
}

export default function StartRequestForm({ dict, locale, isRTL, everydayPricing }: Props) {
  const [state, formAction, isPending] = useActionState(submitQuickRequest, null)
  const [showDetailed, setShowDetailed] = useState(false)
  const [allowAlternatives, setAllowAlternatives] = useState(false)
  const [deliveryNeeded, setDeliveryNeeded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('everyday_purchase')
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false)
  const [hasImage, setHasImage] = useState(false)
  const [clientImageError, setClientImageError] = useState<string | null>(null)

  const scrollYRef = useRef(0)
  const restoreScrollNeeded = useRef(false)

  const formValues = state?.formValues

  useEffect(() => {
    if (formValues) {
      setAllowAlternatives(formValues.allow_alternatives === 'on')
      setDeliveryNeeded(formValues.delivery_needed === 'on')
      setShowDetailed(formValues.show_detailed === 'on')
      setSelectedCategory(formValues.request_kind || 'everyday_purchase')
    }
  }, [formValues])

  const phoneHasError = !!state?.fieldErrors?.phone_number
  const titleHasError = !!state?.fieldErrors?.title
  const imageHasError = !!state?.fieldErrors?.reference_image

  const toggleDetailed = () => {
    scrollYRef.current = window.scrollY
    restoreScrollNeeded.current = true
    setShowDetailed((prev) => !prev)
  }

  useLayoutEffect(() => {
    if (restoreScrollNeeded.current) {
      window.scrollTo(0, scrollYRef.current)
      restoreScrollNeeded.current = false
    }
  }, [showDetailed])

  const successView = state?.success && (
    <div className="success-container animate-fade-in" data-testid="start-request-success">
      <div className="success-icon-wrap">
        <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="success-title">{dict.start_request.success_title}</h2>
      <p className="success-desc">{dict.start_request.success_hint}</p>

      <div className="code-card">
        <p className="code-label">{dict.start_request.success_code}</p>
        <div className="code-value" data-testid="start-request-code">
          {state.requestCode}
        </div>
      </div>

      <p className="success-hint">
        {dict.start_request.success_phone_hint.replace('{phone}', state.phoneUsed)}
      </p>

      <div className="success-actions">
        <Link href={`/${locale}/track-request`} className="btn-primary">
          {dict.start_request.cta_track}
        </Link>

        <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
          {dict.start_request.cta_another}
        </button>
      </div>
    </div>
  )

  const formView = (
    <form action={formAction} className="form-root" data-testid="start-request-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="allow_alternatives" value={allowAlternatives ? 'on' : 'off'} />
      <input type="hidden" name="delivery_needed" value={deliveryNeeded ? 'on' : 'off'} />
      <input type="hidden" name="show_detailed" value={showDetailed ? 'on' : 'off'} />
      <input type="hidden" name="request_kind" value={selectedCategory} />

      <div className="section-group" style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div className="section-badge">1</div>
          <h3 className="section-title">{dict.start_request.category_label}</h3>
        </div>

        <p className="trust-intro-text">
          {dict.start_request.trust_intro}
        </p>

        <div className="trust-disclaimer-card">
          <div className="trust-header">
            <h4 className="trust-title">{dict.start_request.trust_disclaimer.title}</h4>
            <button
              type="button"
              onClick={() => setDisclaimerExpanded(prev => !prev)}
              className="trust-toggle-btn"
            >
              {disclaimerExpanded ? dict.start_request.trust_disclaimer.collapse_label : dict.start_request.trust_disclaimer.expand_label}
            </button>
          </div>
          
          <p className="trust-summary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {dict.start_request.trust_disclaimer.summary}
          </p>
          
          {disclaimerExpanded && (
            <ul className="trust-bullets" style={{ 
              paddingLeft: isRTL ? 0 : '1.25rem', 
              paddingRight: isRTL ? '1.25rem' : 0, 
              textAlign: isRTL ? 'right' : 'left' 
            }}>
              <li>{dict.start_request.trust_disclaimer.bullet_1}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_2}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_3}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_4}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_5}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_6}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_7}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_8}</li>
              <li>{dict.start_request.trust_disclaimer.bullet_9}</li>
            </ul>
          )}
        </div>

        <div className="category-grid">
          {[
            { id: 'everyday', icon: '🛍️', dbId: 'everyday_purchase' },
            { id: 'high_value', icon: '💎', dbId: 'high_value_deals' },
            { id: 'projects', icon: '🏗️', dbId: 'projects_supplies' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`category-card relative ${selectedCategory === cat.dbId ? 'is-selected' : ''}`}
              onClick={() => setSelectedCategory(cat.dbId)}
              aria-pressed={selectedCategory === cat.dbId}
              data-testid={`category-card-${cat.dbId}`}
            >
              <div className="category-icon-wrap">{cat.icon}</div>
              {cat.dbId === 'everyday_purchase' && (
                <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-md z-10">
                  {locale === 'ar' ? '🎁 مجاني لأول مرة' : '🎁 Free first try'}
                </span>
              )}
              <div className="category-name">{dict.start_request[`pricing_model_${cat.id}`]}</div>
              <div className="category-desc">{dict.start_request[`pricing_desc_${cat.id}`]}</div>
              <div className="category-hint-wrap">
                <span className="hint-label">{dict.start_request.pricing_hint_label || 'Pricing:'}</span>
                {cat.dbId === 'everyday_purchase' && everydayPricing ? (
                  <span className="hint-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {everydayPricing.is_promo && everydayPricing.original_price && everydayPricing.original_price !== everydayPricing.price ? (
                      <>
                        <span style={{ textDecoration: 'line-through', opacity: 0.45, fontSize: '0.75em', fontWeight: 500 }}>
                          {everydayPricing.original_price} {everydayPricing.currency}
                        </span>
                        <span style={{ color: '#4ade80', fontWeight: 800 }}>
                          {everydayPricing.price} {everydayPricing.currency}
                        </span>
                        {(everydayPricing.promo_label_ar || everydayPricing.promo_label_en) && (
                          <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.7em', fontWeight: 700 }}>
                            {locale === 'ar' ? everydayPricing.promo_label_ar : everydayPricing.promo_label_en}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>
                        {locale === 'ar' ? `تبدأ من ${everydayPricing.price} ${everydayPricing.currency}` : `Starts from ${everydayPricing.price} ${everydayPricing.currency}`}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="hint-value">{dict.start_request[`pricing_hint_value_${cat.id}`]}</span>
                )}
              </div>
              
              {selectedCategory === cat.dbId && (
                <div className="selection-check">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="section-group">
        <div className="section-header">
          <div className="section-badge">2</div>
          <h3 className="section-title">{dict.start_request.section_quick}</h3>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="label">
              {dict.start_request.full_name} <span className="required">*</span>
            </label>
            <input
              key={`full_name-${formValues?.full_name ?? ''}`}
              required
              name="full_name"
              defaultValue={formValues?.full_name ?? ''}
              placeholder={dict.start_request.full_name_placeholder}
              className="input"
              data-testid="start-request-full-name-input"
            />
          </div>

          <div className="form-group">
            <label className="label">
              {dict.start_request.phone_number} <span className="required">*</span>
            </label>
            <input
              key={`phone_number-${formValues?.phone_number ?? ''}`}
              required
              type="tel"
              inputMode="tel"
              name="phone_number"
              defaultValue={formValues?.phone_number ?? ''}
              placeholder={dict.start_request.phone_placeholder}
              className={`input ${phoneHasError ? 'input-error' : ''}`}
              aria-invalid={phoneHasError}
              data-testid="start-request-phone-input"
            />
            {phoneHasError && (
              <p className="field-error-text">{state?.fieldErrors?.phone_number}</p>
            )}
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">{dict.start_request.email}</label>
            <input
              key={`email-${formValues?.email ?? ''}`}
              type="email"
              name="email"
              defaultValue={formValues?.email ?? ''}
              placeholder={dict.start_request.email_placeholder}
              className="input"
              data-testid="start-request-email-input"
            />
          </div>

          <div className="form-group">
            <label className="label">
              {dict.start_request.request_kind} <span className="required">*</span>
            </label>
            <CustomSelect
              name="item_type"
              defaultValue={formValues?.request_kind || 'product'}
              options={[
                { value: 'product', label: dict.start_request.request_kind_product },
                { value: 'service', label: dict.start_request.request_kind_service },
              ]}
            />
          </div>

          {selectedCategory === 'high_value_deals' && (
            <div className="form-group animate-fade-in">
              <label className="label">{dict.staff_queue.filter_search_scope}</label>
              <CustomSelect
                name="search_scope"
                defaultValue={formValues?.search_scope || 'online_and_offline'}
                options={[
                  { value: 'online_and_offline', label: dict.start_request.scope_online_and_offline },
                  { value: 'online_only', label: dict.start_request.scope_online_only },
                  { value: 'offline_only', label: dict.start_request.scope_offline_only },
                ]}
              />
            </div>
          )}

          {selectedCategory === 'projects_supplies' && (
            <div className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'flex-end', height: '58px' }}>
              <label className="checkbox-wrap" style={{ margin: 0 }}>
                <input type="checkbox" name="site_visit_requested" defaultChecked={formValues?.site_visit_requested === 'on'} className="hidden-checkbox" />
                <span className="checkbox-custom" />
                <span className="checkbox-label" style={{ fontSize: '0.75rem' }}>{dict.start_request.site_visit_requested}</span>
              </label>
              <label className="checkbox-wrap" style={{ margin: 0 }}>
                <input type="checkbox" name="execution_requested" defaultChecked={formValues?.execution_requested === 'on'} className="hidden-checkbox" />
                <span className="checkbox-custom" />
                <span className="checkbox-label" style={{ fontSize: '0.75rem' }}>{dict.start_request.execution_requested}</span>
              </label>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="label">{dict.start_request.title_field}</label>
          <input
            key={`title-${formValues?.title ?? ''}`}
            name="title"
            defaultValue={formValues?.title ?? ''}
            placeholder={dict.start_request.title_placeholder}
            className={`input ${titleHasError ? 'input-error' : ''}`}
            aria-invalid={titleHasError}
            data-testid="start-request-title-input"
          />
          <p className="helper-text">{dict.start_request.reference_image_hint}</p>
          {titleHasError && <p className="field-error-text">{state?.fieldErrors?.title}</p>}
        </div>

        <div className="form-group">
          <label className="label">{dict.start_request.reference_image_label}</label>
          <input
            type="file"
            name="reference_image"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className={`input file-input ${imageHasError || clientImageError ? 'input-error' : ''}`}
            aria-invalid={imageHasError || !!clientImageError}
            data-testid="start-request-reference-image-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const res = validateImage(file)
                if (!res.valid) {
                  setClientImageError(res.error || 'unknown')
                  e.target.value = ''
                  setHasImage(false)
                } else {
                  setClientImageError(null)
                  setHasImage(true)
                }
              } else {
                setClientImageError(null)
                setHasImage(false)
              }
            }}
          />
          <p className="helper-text">
            {dict.start_request.reference_image_allowed}
            <span style={{ display: 'block', marginBlockStart: '4px', opacity: 0.85 }}>
              {locale === 'ar' ? 'الحد الأقصى لحجم الصورة: ٥ ميجا' : 'Max file size: 5MB'}
            </span>
          </p>
          {clientImageError ? (
            <p className="field-error-text" data-testid="client-image-error">
              {getClientErrorMessage(clientImageError, locale)}
            </p>
          ) : imageHasError ? (
            <p className="field-error-text">{state?.fieldErrors?.reference_image}</p>
          ) : null}
        </div>

        {hasImage && (
          <div className="form-group animate-fade-in" data-testid="image-intent-group">
            <label className="label">{dict.start_request.image_intent_label}</label>
            <CustomSelect
              name="image_search_intent"
              defaultValue={formValues?.image_search_intent || 'exact_match'}
              options={[
                { value: 'exact_match', label: dict.start_request.image_intent_exact },
                { value: 'similar_reference', label: dict.start_request.image_intent_similar },
                { value: 'identify_help', label: dict.start_request.image_intent_identify },
              ]}
            />
          </div>
        )}

        <div className="grid-3">
          <div className="form-group">
            <label className="label">{dict.start_request.budget_min}</label>
            <input
              key={`budget_min-${formValues?.budget_min ?? ''}`}
              type="number"
              name="budget_min"
              defaultValue={formValues?.budget_min ?? ''}
              placeholder={dict.start_request.budget_min_placeholder}
              className="input"
            />
          </div>

          <div className="form-group">
            <label className="label">{dict.start_request.budget_max}</label>
            <input
              key={`budget_max-${formValues?.budget_max ?? ''}`}
              type="number"
              name="budget_max"
              defaultValue={formValues?.budget_max ?? ''}
              placeholder={dict.start_request.budget_max_placeholder}
              className="input"
            />
          </div>

          <div className="form-group">
            <label className="label">{dict.start_request.urgency}</label>
            <CustomSelect
              name="urgency_level"
              defaultValue={formValues?.urgency_level || 'normal'}
              options={[
                { value: 'normal', label: dict.start_request.urgency_normal },
                { value: 'high', label: dict.start_request.urgency_high },
                { value: 'urgent', label: dict.start_request.urgency_urgent },
              ]}
            />
          </div>
        </div>

        <div className="grid-3-checkboxes">
          <label className="checkbox-wrap">
            <input
              key={`execution_requested-${formValues?.execution_requested ?? 'off'}`}
              type="checkbox"
              name="execution_requested"
              defaultChecked={formValues?.execution_requested === 'on'}
              className="hidden-checkbox"
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label">{dict.start_request.execution_requested}</span>
          </label>

          <label className="checkbox-wrap">
            <input
              key={`followup_requested-${formValues?.followup_requested ?? 'off'}`}
              type="checkbox"
              name="followup_requested"
              defaultChecked={formValues?.followup_requested === 'on'}
              className="hidden-checkbox"
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label">{dict.start_request.followup_requested}</span>
          </label>

          <label className="checkbox-wrap">
            <input
              key={`site_visit_requested-${formValues?.site_visit_requested ?? 'off'}`}
              type="checkbox"
              name="site_visit_requested"
              defaultChecked={formValues?.site_visit_requested === 'on'}
              className="hidden-checkbox"
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label">{dict.start_request.site_visit_requested}</span>
          </label>
        </div>
      </div>

      <div className="expandable-section">
        <button
          type="button"
          onClick={toggleDetailed}
          className={`dropdown-trigger ${showDetailed ? 'is-active' : ''}`}
        >
          <span className="trigger-label">{dict.start_request.section_detailed}</span>
          <div className="chevron-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path d="M19 9l-7 7-7-7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {showDetailed && (
          <div className="dropdown-panel animate-slide-down">
            <div className="panel-content">
              <div className="form-group">
                <label className="label">{dict.start_request.description_field}</label>
                <textarea
                  key={`raw_description-${formValues?.raw_description ?? ''}`}
                  name="raw_description"
                  defaultValue={formValues?.raw_description ?? ''}
                  rows={4}
                  placeholder={dict.start_request.description_placeholder}
                  className="input textarea"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="label">{dict.start_request.preferred_brands}</label>
                  <input
                    key={`preferred_brands-${formValues?.preferred_brands ?? ''}`}
                    name="preferred_brands"
                    defaultValue={formValues?.preferred_brands ?? ''}
                    placeholder={dict.start_request.brands_placeholder}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">{dict.start_request.preferred_models}</label>
                  <input
                    key={`preferred_models-${formValues?.preferred_models ?? ''}`}
                    name="preferred_models"
                    defaultValue={formValues?.preferred_models ?? ''}
                    placeholder={dict.start_request.models_placeholder}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">{dict.start_request.preferred_specs}</label>
                <input
                  key={`preferred_specs-${formValues?.preferred_specs ?? ''}`}
                  name="preferred_specs"
                  defaultValue={formValues?.preferred_specs ?? ''}
                  placeholder={dict.start_request.specs_placeholder}
                  className="input"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="label">{dict.start_request.condition}</label>
                  <CustomSelect
                    name="condition_preference"
                    defaultValue={formValues?.condition_preference || 'new'}
                    options={[
                      { value: 'new', label: dict.start_request.condition_new },
                      { value: 'used', label: dict.start_request.condition_used },
                      { value: 'any', label: dict.start_request.condition_any },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="label">{dict.start_request.priority}</label>
                  <CustomSelect
                    name="priority_focus"
                    defaultValue={formValues?.priority_focus || 'best_value'}
                    options={[
                      { value: 'best_value', label: dict.start_request.priority_best_value },
                      { value: 'best_price', label: dict.start_request.priority_best_price },
                      { value: 'best_quality', label: dict.start_request.priority_best_quality },
                      { value: 'best_trust', label: dict.start_request.priority_best_trust },
                      { value: 'fastest_availability', label: dict.start_request.priority_fastest_availability },
                    ]}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="label">{dict.start_request.search_scope}</label>
                  <CustomSelect
                    name="search_scope"
                    defaultValue={formValues?.search_scope || 'online_and_offline'}
                    options={[
                      { value: 'online_and_offline', label: dict.start_request.scope_online_and_offline },
                      { value: 'online_only', label: dict.start_request.scope_online_only },
                      { value: 'offline_only', label: dict.start_request.scope_offline_only },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="label">{dict.start_request.governorate}</label>
                  <input
                    key={`preferred_governorate-${formValues?.preferred_governorate ?? ''}`}
                    name="preferred_governorate"
                    defaultValue={formValues?.preferred_governorate ?? ''}
                    placeholder={dict.start_request.governorate_placeholder}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">{dict.start_request.area}</label>
                  <input
                    key={`preferred_area-${formValues?.preferred_area ?? ''}`}
                    name="preferred_area"
                    defaultValue={formValues?.preferred_area ?? ''}
                    placeholder={dict.start_request.area_placeholder}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">{dict.start_request.notes}</label>
                <textarea
                  key={`notes-${formValues?.notes ?? ''}`}
                  name="notes"
                  defaultValue={formValues?.notes ?? ''}
                  rows={2}
                  placeholder="..."
                  className="input"
                />
              </div>

              <div className="checkbox-stack">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={allowAlternatives}
                    onChange={(e) => setAllowAlternatives(e.target.checked)}
                    className="hidden-checkbox"
                  />
                  <span className="checkbox-custom" />
                  <span className="checkbox-label">{dict.start_request.allow_alternatives}</span>
                </label>

                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={deliveryNeeded}
                    onChange={(e) => setDeliveryNeeded(e.target.checked)}
                    className="hidden-checkbox"
                  />
                  <span className="checkbox-custom" />
                  <span className="checkbox-label">{dict.start_request.delivery_needed}</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-footer">
        <button
          type="submit"
          disabled={isPending}
          className={`submit-btn ${isPending ? 'pending' : ''}`}
          data-testid="start-request-submit"
        >
          {isPending ? dict.common.loading : dict.start_request.submit}
        </button>

        {state?.formError && <p className="form-error-summary">{state.formError}</p>}

        {state?.error && !state?.formError && (
          <p className="error-message">{dict.common.error}</p>
        )}
      </div>
    </form>
  )

  return (
    <main className="start-request-page" dir={isRTL ? 'rtl' : 'ltr'} data-testid="start-request-page">
      <RequestHeader locale={locale} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        html,
        body {
          height: auto !important;
          min-height: 100% !important;
          overflow-y: auto !important;
        }

        .start-request-page,
        .start-request-page * {
          box-sizing: border-box;
        }

        .start-request-page {
          width: 100%;
          min-height: 100dvh;
          padding: 190px 24px 96px;
          background: #020617;
          color: white;
          position: relative;
          overflow-x: hidden !important;
          overflow-y: visible !important;
          font-family: inherit;
        }

        .start-request-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(circle at 16% 10%, rgba(212, 166, 60, 0.13), transparent 34%),
            radial-gradient(circle at 84% 30%, rgba(59, 130, 246, 0.09), transparent 32%),
            linear-gradient(180deg, #020617 0%, #030712 100%);
        }

        .start-request-page .custom-select-container {
          position: relative;
          width: 100%;
        }

        .start-request-page .custom-select-trigger {
          width: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 0 22px;
          color: white;
          font-size: 1rem;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.24s ease;
          text-align: inherit;
        }

        .start-request-page .custom-select-trigger:hover {
          border-color: rgba(212, 166, 60, 0.55);
          background: rgba(255, 255, 255, 0.07);
        }

        .start-request-page .custom-select-trigger.is-open {
          border-color: #d4a63c;
          box-shadow: 0 0 0 4px rgba(212, 166, 60, 0.14);
        }

        .start-request-page .trigger-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .start-request-page .trigger-chevron {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          transition: transform 0.24s ease;
          color: rgba(255,255,255,0.48);
        }

        .start-request-page .custom-select-trigger.is-open .trigger-chevron {
          transform: rotate(180deg);
          color: #d4a63c;
        }

        .start-request-page .custom-select-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          overflow: hidden;
          z-index: 2000;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          max-height: 300px;
          overflow-y: auto;
        }

        .start-request-page .custom-select-option {
          width: 100%;
          display: block;
          border: 0;
          text-align: inherit;
          background: transparent;
          padding: 16px 22px;
          font-size: 0.95rem;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.72);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .start-request-page .custom-select-option:hover {
          background: rgba(212, 166, 60, 0.1);
          color: #d4a63c;
        }

        .start-request-page .custom-select-option.is-selected {
          background: rgba(212, 166, 60, 0.15);
          color: #d4a63c;
        }

        .background-decor {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
        }

        .orb-1 {
          top: -10%;
          left: 8%;
          width: 520px;
          height: 520px;
          background: #d4a63c;
        }

        .orb-2 {
          bottom: -10%;
          right: 8%;
          width: 620px;
          height: 620px;
          background: #3b82f6;
          opacity: 0.08;
        }

        .start-request-form-container {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }

        .header-stack {
          text-align: center;
          margin-bottom: 54px;
        }

        .page-title {
          font-size: clamp(2.4rem, 7vw, 4.25rem);
          font-weight: 950;
          margin: 0 0 22px;
          letter-spacing: -0.045em;
          line-height: 1.05;
          color: #fff;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
        }

        .page-desc {
          font-size: clamp(1rem, 2vw, 1.22rem);
          color: rgba(255, 255, 255, 0.66);
          max-width: 720px;
          margin: 0 auto;
          font-weight: 500;
          line-height: 1.7;
        }

        .start-request-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 40px;
          padding: 64px;
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
        }

        .form-root { display: flex; flex-direction: column; gap: 56px; }
        .section-group { display: flex; flex-direction: column; gap: 32px; }
        .section-header { display: flex; align-items: center; gap: 20px; }

        .section-badge {
          width: 36px;
          height: 36px;
          background: #d4a63c;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(212, 166, 60, 0.3);
        }

        .section-title {
          font-size: 1rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.25em;
          color: rgba(255, 255, 255, 0.5);
        }

        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }

        .form-group { display: flex; flex-direction: column; gap: 12px; }

        .label {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 0.4);
          margin-inline-start: 4px;
        }

        .required { color: #d4a63c; }

        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 18px;
          padding: 18px 24px;
          color: #fff !important;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .input:focus {
          background: rgba(255, 255, 255, 0.07) !important;
          border-color: #d4a63c !important;
          box-shadow: 0 0 0 4px rgba(212, 166, 60, 0.15);
        }

        .start-request-page .category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          width: 100%;
          margin-bottom: 32px;
        }

        .start-request-page .category-card {
          width: 100%;
          min-width: 0;
          height: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: inherit;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          scroll-snap-align: start;
        }

        @media (max-width: 900px) {
          .start-request-page .category-grid {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 16px;
            scroll-snap-type: x mandatory;
            padding-bottom: 12px;
            -webkit-overflow-scrolling: touch;
            margin-inline: -8px;
            padding-inline: 8px;
          }

          .start-request-page .category-grid::-webkit-scrollbar {
            display: none;
          }

          .start-request-page .category-card {
            flex: 0 0 82%;
            max-width: 360px;
            min-width: 260px;
            scroll-snap-align: start;
          }
        }

        @media (max-width: 480px) {
          .start-request-page .category-card {
            flex-basis: 88%;
            min-width: 250px;
          }
        }


        .category-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(212, 166, 60, 0.4);
          transform: translateY(-4px);
        }

        .category-card:focus-visible {
          outline: 3px solid #d4a63c;
          outline-offset: 4px;
        }

        .category-card.is-selected {
          background: rgba(212, 166, 60, 0.08);
          border-color: #d4a63c;
          box-shadow: 0 10px 30px -10px rgba(212, 166, 60, 0.3);
        }

        .category-icon-wrap {
          font-size: 2.5rem;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }

        .category-name {
          font-size: 1.25rem;
          font-weight: 900;
          margin-bottom: 10px;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .category-desc {
          font-size: 0.88rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          margin-bottom: 24px;
          flex-grow: 1;
        }

        .category-hint-wrap {
          margin-top: auto;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .hint-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 800;
        }

        .hint-value {
          font-size: 0.85rem;
          color: #d4a63c;
          font-weight: 700;
        }

        .selection-check {
          position: absolute;
          top: 16px;
          right: 16px;
          color: #d4a63c;
          background: rgba(212, 166, 60, 0.1);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .input-error {
          border-color: #f87171 !important;
          box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.12);
        }

        .textarea { min-height: 150px; resize: vertical; }

        .helper-text {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.5;
          margin-top: -2px;
        }

        .field-error-text {
          font-size: 0.92rem;
          color: #fca5a5;
          font-weight: 700;
          line-height: 1.5;
          margin-top: -2px;
        }

        .file-input {
          padding: 12px 14px;
        }

        .file-input::file-selector-button {
          border: none;
          border-radius: 12px;
          background: rgba(212, 166, 60, 0.15);
          color: #f8e29c;
          padding: 10px 14px;
          margin-inline-end: 12px;
          cursor: pointer;
          font-weight: 800;
        }

        .form-footer {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 24px;
        }

        .form-error-summary {
          text-align: center;
          color: #fca5a5;
          font-weight: 800;
          line-height: 1.6;
          font-size: 1rem;
        }

        .expandable-section {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dropdown-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 40px;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .dropdown-trigger:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          color: #fff !important;
        }

        .dropdown-trigger.is-active {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          background: rgba(212, 166, 60, 0.05) !important;
          border-color: rgba(212, 166, 60, 0.2) !important;
          color: #d4a63c !important;
        }

        .trigger-label {
          font-size: 0.9rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }

        .chevron-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dropdown-trigger.is-active .chevron-icon {
          transform: rotate(180deg);
          background: #d4a63c;
          color: #000;
        }

        .dropdown-panel {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: none;
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          overflow: hidden;
        }

        .panel-content {
          padding: 48px 40px 64px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .checkbox-stack { display: flex; flex-direction: column; gap: 20px; }
        .grid-3-checkboxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }

        .checkbox-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          user-select: none;
        }

        .hidden-checkbox { display: none; }

        .checkbox-custom {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.02);
          position: relative;
          transition: all 0.2s ease;
        }

        .hidden-checkbox:checked + .checkbox-custom {
          background: #d4a63c;
          border-color: #d4a63c;
          box-shadow: 0 0 15px rgba(212, 166, 60, 0.3);
        }

        .hidden-checkbox:checked + .checkbox-custom::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
          background-size: 16px;
          background-position: center;
          background-repeat: no-repeat;
        }

        .checkbox-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
        }

        .submit-btn {
          width: 100%;
          padding: 24px;
          background: #d4a63c;
          color: #000 !important;
          border: none;
          border-radius: 24px;
          font-size: 1.5rem;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 20px 40px rgba(212, 166, 60, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 25px 50px rgba(212, 166, 60, 0.35);
        }

        .submit-btn.pending {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3) !important;
          cursor: not-allowed;
        }

        .error-message {
          text-align: center;
          color: #ef4444;
          font-weight: 700;
          margin-top: 4px;
        }

        .success-container { text-align: center; padding: 48px 0; }

        .success-icon-wrap {
          width: 110px;
          height: 110px;
          background: #d4a63c;
          border-radius: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 40px;
          box-shadow: 0 20px 50px rgba(212, 166, 60, 0.4);
        }

        .success-icon { width: 56px; height: 56px; color: #000; }

        .success-title {
          font-size: 3.5rem;
          font-weight: 900;
          margin-bottom: 20px;
          letter-spacing: -0.04em;
        }

        .success-desc {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 32px;
          font-weight: 500;
        }

        .success-hint {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .code-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 32px;
          padding: 48px;
          max-width: 500px;
          margin: 0 auto 56px;
        }

        .code-label {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 16px;
          letter-spacing: 0.1em;
        }

        .trust-disclaimer-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.25rem;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trust-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .trust-title {
          margin: 0;
          font-size: 0.9rem;
          color: #d4a63c;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: normal;
          min-width: fit-content;
          max-width: 100%;
          line-height: 1.2;
        }

        .trust-toggle-btn {
          flex-shrink: 0;
          font-size: 0.78rem;
          color: #d4a63c;
          background: transparent;
          border: 1px solid rgba(212, 166, 60, 0.3);
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          white-space: nowrap;
          width: auto;
          min-width: 120px;
          max-width: 100%;
          transition: all 0.2s ease;
        }

        .trust-toggle-btn:hover {
          background: rgba(212, 166, 60, 0.1);
          border-color: rgba(212, 166, 60, 0.5);
        }

        .trust-summary {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.6;
        }

        .trust-bullets {
          margin: 8px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.6;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding-top: 16px;
          list-style-position: outside;
        }

        @media (max-width: 640px) {
          .trust-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .trust-toggle-btn {
            width: 100%;
          }
        }


        .trust-intro-text {
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 24px;
          max-width: 800px;
          font-weight: 400;
        }


        .code-value {
          font-size: 4.5rem;
          font-weight: 900;
          color: #d4a63c;
          letter-spacing: -0.03em;
        }

        .success-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
        }

        .btn-primary {
          background: #fff;
          color: #000 !important;
          padding: 18px 40px;
          border-radius: 16px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #fff !important;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 18px 40px;
          border-radius: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-down {
          animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }

        @media (max-width: 1024px) {
          .start-request-card { padding: 48px 32px; }
        }

        @media (max-width: 768px) {
          .start-request-page { padding-top: 160px; }
          .page-title { font-size: 3rem; }
          .form-root { gap: 40px; }
          .start-request-card { padding: 40px 24px; border-radius: 32px; }
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .panel-content { padding: 40px 24px; }
          .code-value { font-size: 3rem; }
        }
      `,
        }}
      />

      <div className="background-decor">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="start-request-form-container">
        <div className="header-stack animate-fade-in">
          <h1 className="page-title">{dict.start_request.title}</h1>
          <p className="page-desc">{dict.start_request.desc}</p>
        </div>

        <div className="start-request-card animate-fade-in">
          {state?.success ? successView : formView}
        </div>
      </div>
    </main>
  )
}