'use client'
/**
 * src/app/[locale]/start-request/ReviewScreen.tsx
 *
 * The mandatory review step inserted between AI concierge input and the
 * Intake (name/phone) step. Users MUST explicitly confirm before data is
 * written to wizard state and navigation advances.
 *
 * Constraints:
 * - NO auto-advance under any circumstances
 * - Highlights uncertain fields (confidence < 60 OR field in missingFields)
 * - Supports multiple-item lists (isMultipleItems === true)
 */

import React, { useState } from 'react'
import type { AIExtractedData } from '@/lib/intelligence/ai-concierge-agent'

interface ReviewScreenProps {
  aiData: AIExtractedData
  confidence: number
  isAr: boolean
  onConfirm: (edited: AIExtractedData) => void
  onBack: () => void
}

export default function ReviewScreen({
  aiData,
  confidence,
  isAr,
  onConfirm,
  onBack,
}: ReviewScreenProps) {
  const [edited, setEdited] = useState<AIExtractedData>({ ...aiData })

  const isLowConfidence = confidence < 60
  const hasUncertainFields = isLowConfidence || edited.missingFields.length > 0

  // Helper: should this field be highlighted as uncertain?
  function isUncertain(fieldName: string): boolean {
    return isLowConfidence || edited.missingFields.includes(fieldName)
  }

  // Helper: build input style with amber highlight when uncertain
  function inputStyle(fieldName: string): React.CSSProperties {
    return {
      width: '100%',
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.45)',
      padding: '12px 14px',
      color: 'white',
      border: isUncertain(fieldName)
        ? '1.5px solid #f59e0b'
        : '1px solid rgba(255,255,255,0.15)',
      outline: 'none',
      fontSize: '14px',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box' as const,
    }
  }

  // Update a single field
  function update<K extends keyof AIExtractedData>(key: K, value: AIExtractedData[K]) {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  // Update a specific item in the items list
  function updateItem(index: number, field: 'productName' | 'quantity', value: string | number | null) {
    setEdited((prev) => {
      const items = [...(prev.items ?? [])]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, items }
    })
  }

  return (
    <div className="review-screen" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="review-header">
        <div className="review-ai-badge">🔮 AI</div>
        <div>
          <h2 className="review-title">
            {isAr ? 'راجع بيانات الطلب' : 'Review Request Details'}
          </h2>
          <p className="review-subtitle">
            {isAr
              ? 'الذكاء الاصطناعي استخرج هذه البيانات — راجعها وعدّلها قبل المتابعة'
              : 'AI extracted these details — review and edit before continuing'}
          </p>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="review-confidence">
        <div className="review-confidence-header">
          <span>{isAr ? 'دقة الاستخراج' : 'Extraction Confidence'}</span>
          <span
            style={{
              color: confidence >= 80 ? '#22c55e' : confidence >= 60 ? '#f59e0b' : '#ef4444',
              fontWeight: 700,
            }}
          >
            {confidence}%
          </span>
        </div>
        <div className="review-confidence-bar">
          <div
            className="review-confidence-fill"
            style={{
              width: `${confidence}%`,
              background:
                confidence >= 80 ? '#22c55e' : confidence >= 60 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Uncertainty Warning */}
      {hasUncertainFields && (
        <div className="review-warning">
          ⚠️{' '}
          {isAr
            ? 'تأكد من هذه البيانات، الذكاء الاصطناعي لم يكن متأكداً منها بالكامل'
            : 'Please verify these fields — the AI was not fully confident in them'}
        </div>
      )}

      {/* Product Thumbnail — only rendered for product_link flow (imageUrl present) */}
      {edited.imageUrl && (
        <div className="review-product-thumbnail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={edited.imageUrl}
            alt={edited.productName || 'Product image'}
            className="review-thumbnail-img"
            onError={(e) => {
              // Hide the container on broken image — fail silently
              const target = e.currentTarget as HTMLImageElement
              const parent = target.parentElement
              if (parent) parent.style.display = 'none'
            }}
          />
          <div className="review-thumbnail-meta">
            <span className="review-thumbnail-badge">🔗</span>
            <span className="review-thumbnail-label">
              {isAr ? 'صورة المنتج من الرابط' : 'Product image from link'}
            </span>
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="review-fields">
        {/* Single item OR multiple items */}
        {edited.isMultipleItems && edited.items ? (
          <div className="review-field-group">
            <label className="review-label">
              {isAr ? 'قائمة المنتجات' : 'Products List'}
            </label>
            {edited.items.map((item, idx) => (
              <div key={idx} className="review-item-row">
                <input
                  value={item.productName}
                  onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                  placeholder={isAr ? 'اسم المنتج' : 'Product name'}
                  style={{ ...inputStyle('items'), flex: 2 }}
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity ?? ''}
                  onChange={(e) =>
                    updateItem(idx, 'quantity', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder={isAr ? 'الكمية' : 'Qty'}
                  style={{ ...inputStyle('items'), flex: 1 }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('productName') ? '#f59e0b' : '' }}>
              {isAr ? 'اسم المنتج' : 'Product Name'}
              {isUncertain('productName') && <span className="review-uncertain-dot" />}
            </label>
            <input
              value={edited.productName}
              onChange={(e) => update('productName', e.target.value)}
              placeholder={isAr ? 'اسم المنتج' : 'Product name'}
              style={inputStyle('productName')}
            />
          </div>
        )}

        <div className="review-grid-2">
          {/* Category */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('category') ? '#f59e0b' : '' }}>
              {isAr ? 'الفئة' : 'Category'}
              {isUncertain('category') && <span className="review-uncertain-dot" />}
            </label>
            <input
              value={edited.category ?? ''}
              onChange={(e) => update('category', e.target.value || null)}
              placeholder={isAr ? 'الفئة' : 'Category'}
              style={inputStyle('category')}
            />
          </div>

          {/* Quantity */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('quantity') ? '#f59e0b' : '' }}>
              {isAr ? 'الكمية' : 'Quantity'}
              {isUncertain('quantity') && <span className="review-uncertain-dot" />}
            </label>
            <input
              type="number"
              min={1}
              value={edited.quantity ?? ''}
              onChange={(e) => update('quantity', e.target.value ? Number(e.target.value) : null)}
              placeholder={isAr ? 'الكمية' : 'Qty'}
              style={inputStyle('quantity')}
            />
          </div>

          {/* Budget Min */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('budgetMin') ? '#f59e0b' : '' }}>
              {isAr ? 'أقل ميزانية (جنيه)' : 'Min Budget (EGP)'}
              {isUncertain('budgetMin') && <span className="review-uncertain-dot" />}
            </label>
            <input
              type="number"
              min={0}
              value={edited.budgetMin ?? ''}
              onChange={(e) => update('budgetMin', e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              style={inputStyle('budgetMin')}
            />
          </div>

          {/* Budget Max */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('budgetMax') ? '#f59e0b' : '' }}>
              {isAr ? 'أقصى ميزانية (جنيه)' : 'Max Budget (EGP)'}
              {isUncertain('budgetMax') && <span className="review-uncertain-dot" />}
            </label>
            <input
              type="number"
              min={0}
              value={edited.budgetMax ?? ''}
              onChange={(e) => update('budgetMax', e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              style={inputStyle('budgetMax')}
            />
          </div>

          {/* Brand */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('brand') ? '#f59e0b' : '' }}>
              {isAr ? 'الماركة' : 'Brand'}
              {isUncertain('brand') && <span className="review-uncertain-dot" />}
            </label>
            <input
              value={edited.brand ?? ''}
              onChange={(e) => update('brand', e.target.value || null)}
              placeholder={isAr ? 'الماركة' : 'Brand'}
              style={inputStyle('brand')}
            />
          </div>

          {/* Condition */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('condition') ? '#f59e0b' : '' }}>
              {isAr ? 'الحالة' : 'Condition'}
              {isUncertain('condition') && <span className="review-uncertain-dot" />}
            </label>
            <select
              value={edited.condition ?? ''}
              onChange={(e) =>
                update('condition', (e.target.value as 'new' | 'used' | 'any') || null)
              }
              style={{ ...inputStyle('condition'), cursor: 'pointer' }}
            >
              <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
              <option value="new">{isAr ? 'جديد' : 'New'}</option>
              <option value="used">{isAr ? 'مستعمل' : 'Used'}</option>
              <option value="any">{isAr ? 'أي حالة' : 'Any'}</option>
            </select>
          </div>

          {/* Color */}
          <div className="review-field-group">
            <label className="review-label" style={{ color: isUncertain('color') ? '#f59e0b' : '' }}>
              {isAr ? 'اللون' : 'Color'}
              {isUncertain('color') && <span className="review-uncertain-dot" />}
            </label>
            <input
              value={edited.color ?? ''}
              onChange={(e) => update('color', e.target.value || null)}
              placeholder={isAr ? 'اللون المفضل' : 'Preferred color'}
              style={inputStyle('color')}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="review-field-group">
          <label className="review-label" style={{ color: isUncertain('notes') ? '#f59e0b' : '' }}>
            {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
          </label>
          <textarea
            value={edited.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            placeholder={isAr ? 'أي تفاصيل إضافية...' : 'Any additional details...'}
            style={{
              ...inputStyle('notes'),
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="review-actions">
        <button type="button" onClick={onBack} className="review-btn-back">
          {isAr ? '← رجوع' : '← Back'}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(edited)}
          className="review-btn-confirm"
        >
          {isAr ? 'تأكيد ومتابعة ✓' : 'Confirm & Continue ✓'}
        </button>
      </div>

      {/* Scoped Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .review-screen {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .review-header {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }

          .review-ai-badge {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2));
            border: 1px solid rgba(139,92,246,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }

          .review-title {
            font-size: 20px;
            font-weight: 800;
            color: white;
            margin: 0 0 4px 0;
          }

          .review-subtitle {
            font-size: 13px;
            color: #94a3b8;
            margin: 0;
          }

          .review-confidence {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .review-confidence-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .review-confidence-bar {
            height: 6px;
            border-radius: 9999px;
            background: rgba(255,255,255,0.08);
            overflow: hidden;
          }

          .review-confidence-fill {
            height: 100%;
            border-radius: 9999px;
            transition: width 0.5s ease;
          }

          .review-warning {
            font-size: 12px;
            color: #f59e0b;
            font-weight: 600;
            background: rgba(245,158,11,0.1);
            border: 1px solid rgba(245,158,11,0.25);
            padding: 10px 14px;
            border-radius: 10px;
          }

          .review-fields {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .review-field-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .review-label {
            font-size: 12px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .review-uncertain-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #f59e0b;
            display: inline-block;
            animation: review-pulse 1.5s ease-in-out infinite;
          }

          @keyframes review-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }

          .review-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }

          @media (max-width: 640px) {
            .review-grid-2 {
              grid-template-columns: 1fr;
            }
          }

          .review-item-row {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
          }

          .review-actions {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 8px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
          }

          button.review-btn-back {
            padding: 12px 20px !important;
            background: transparent !important;
            color: #94a3b8 !important;
            font-weight: 700 !important;
            border-radius: 10px !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            font-size: 14px !important;
          }

          button.review-btn-back:hover {
            background: rgba(255,255,255,0.06) !important;
            color: white !important;
          }

          button.review-btn-confirm {
            flex: 1 !important;
            padding: 13px 20px !important;
            background: linear-gradient(135deg, hsl(258, 89%, 66%), hsl(258, 89%, 56%)) !important;
            color: white !important;
            font-weight: 800 !important;
            border-radius: 10px !important;
            border: none !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            font-size: 15px !important;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.35) !important;
          }

          button.review-btn-confirm:hover {
            background: linear-gradient(135deg, hsl(258, 89%, 76%), hsl(258, 89%, 66%)) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 0 28px rgba(139, 92, 246, 0.5) !important;
          }

          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
          }

          .review-screen select option {
            background: #0b0f19;
            color: white;
          }

          .review-product-thumbnail {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(59, 130, 246, 0.06);
            border: 1px solid rgba(59, 130, 246, 0.18);
          }

          .review-thumbnail-img {
            width: 72px;
            height: 72px;
            min-width: 72px;
            object-fit: contain;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .review-thumbnail-meta {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .review-thumbnail-badge {
            font-size: 14px;
          }

          .review-thumbnail-label {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 600;
          }
        `
      }} />
    </div>
  )
}
