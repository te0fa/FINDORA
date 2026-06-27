'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Vendor {
  id: string
  display_name: string
}

interface ResearchItem {
  id: string
  product_title: string
  source_name: string
  price_amount: number | null
  currency_code: string | null
  listing_url: string | null
  product_specs_summary: string | null
}

interface NewProductClientProps {
  vendors: Vendor[]
  researchItems: ResearchItem[]
  locale: string
}

export default function NewProductClient({ vendors, researchItems, locale }: NewProductClientProps) {
  const router = useRouter()
  const isRTL = locale === 'ar'

  // Tab state: 'manual' or 'import'
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')

  // Manual Form States
  const [titleAr, setTitleAr] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [price, setPrice] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // Specs States
  const [ramGb, setRamGb] = useState('')
  const [storageGb, setStorageGb] = useState('')
  const [cpuBrand, setCpuBrand] = useState('')
  const [cpuCores, setCpuCores] = useState('')
  const [cpuGhz, setCpuGhz] = useState('')
  const [gpu, setGpu] = useState('')
  const [batteryMah, setBatteryMah] = useState('')
  const [displayInches, setDisplayInches] = useState('')
  const [displayHz, setDisplayHz] = useState('')
  const [cameraMp, setCameraMp] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [os, setOs] = useState('')

  // Import State
  const [selectedItemId, setSelectedItemId] = useState('')
  const [importCategory, setImportCategory] = useState('')

  // Status & Loading states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compile specifications JSON object
  const compileSpecifications = () => {
    const specs: Record<string, any> = {}
    if (ramGb) specs.ram_gb = Number(ramGb)
    if (storageGb) specs.storage_gb = Number(storageGb)
    if (cpuBrand) specs.cpu_brand = cpuBrand
    if (cpuCores) specs.cpu_cores = Number(cpuCores)
    if (cpuGhz) specs.cpu_ghz = Number(cpuGhz)
    if (gpu) specs.gpu = gpu
    if (batteryMah) specs.battery_mah = Number(batteryMah)
    if (displayInches) specs.display_inches = Number(displayInches)
    if (displayHz) specs.display_hz = Number(displayHz)
    if (cameraMp) specs.camera_mp = Number(cameraMp)
    if (weightGrams) specs.weight_grams = Number(weightGrams)
    if (os) specs.os = os
    return specs
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleAr || !category) {
      setError(isRTL ? 'الاسم العربي والفئة مطلوبان.' : 'Arabic Title and Category are required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const specifications = compileSpecifications()
      const productBody = {
        title_ar: titleAr,
        title_en: titleEn || undefined,
        brand: brand || undefined,
        category,
        subcategory: subcategory || undefined,
        source: 'manual',
        source_url: sourceUrl || undefined,
        vendor_id: vendorId || undefined,
        specifications,
        image_url: imageUrl || undefined,
        current_price: price ? Number(price) : null
      }

      // 1. Create the product
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create product')
      }

      const createdProduct = data.product

      // 2. If price was provided, seed price snapshot/history
      if (price && createdProduct?.id) {
        const priceRes = await fetch(`/api/products/${createdProduct.id}/price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: Number(price), source: 'manual_seeding' }),
        })
        if (!priceRes.ok) {
          console.warn('Product created but failed to record initial price snapshot')
        }
      }

      router.push(`/${locale}/staff/products/${createdProduct.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || !importCategory) {
      setError(isRTL ? 'يرجى اختيار عنصر وفئة للاستيراد.' : 'Please select an item and a category to import.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const importBody = {
        research_item_id: selectedItemId,
        import_from_research: true,
        category: importCategory
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import product')
      }

      router.push(`/${locale}/staff/products/${data.product.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedResearchItem = researchItems.find(item => item.id === selectedItemId)

  return (
    <div className="new-product-page" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .new-product-page {
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .back-link {
          color: var(--secondary);
          text-decoration: none;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .back-link:hover {
          color: #fff;
        }
        .page-title {
          font-size: 1.8rem;
          margin: 0;
        }
        .tabs-header {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }
        .tab-btn {
          background: transparent;
          border: none;
          color: var(--secondary);
          font-size: 1rem;
          font-weight: bold;
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        .tab-btn:hover:not(.active) {
          color: #fff;
        }
        .form-panel {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .form-grid.full-width {
          grid-template-columns: 1fr;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--secondary);
        }
        .form-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: #fff;
          padding: 10px 14px;
          font-size: 0.95rem;
          outline: none;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .section-divider {
          grid-column: 1 / -1;
          font-size: 1rem;
          font-weight: bold;
          margin-top: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          color: var(--accent);
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .submit-btn {
          background: var(--accent);
          color: #000;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
          width: 100%;
          transition: background 0.2s ease;
        }
        .submit-btn:hover {
          background: #e5b35c;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .item-details-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        .item-details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .item-details-label {
          color: var(--secondary);
        }
        .item-details-value {
          font-weight: bold;
        }
      ` }} />

      <div className="page-header">
        <Link href={`/${locale}/staff/products`} className="back-link">
          {isRTL ? '← رجوع' : '← Back'}
        </Link>
        <h1 className="page-title">
          {isRTL ? 'إضافة منتج جديد للكتالوج 📦' : 'Add New Catalog Product 📦'}
        </h1>
      </div>

      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('manual')
            setError(null)
          }}
        >
          {isRTL ? 'إدخال يدوي (Manual)' : 'Manual Entry'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('import')
            setError(null)
          }}
        >
          {isRTL ? 'استيراد من التوريد (Import)' : 'Import from Sourced'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'manual' ? (
        <form className="form-panel" onSubmit={handleManualSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{isRTL ? 'الاسم بالعربية (مطلوب)' : 'Title Arabic (Required)'}</label>
              <input
                type="text"
                className="form-input"
                required
                value={titleAr}
                onChange={e => setTitleAr(e.target.value)}
                placeholder={isRTL ? 'مثال: آيفون 15 برو ماكس' : 'e.g. iPhone 15 Pro Max'}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">{isRTL ? 'الاسم بالإنجليزية' : 'Title English'}</label>
              <input
                type="text"
                className="form-input"
                value={titleEn}
                onChange={e => setTitleEn(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'الماركة' : 'Brand'}</label>
              <input
                type="text"
                className="form-input"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder={isRTL ? 'مثال: Apple' : 'e.g. Apple'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'الفئة (مطلوب)' : 'Category (Required)'}</label>
              <input
                type="text"
                className="form-input"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder={isRTL ? 'مثال: Electronics - Mobiles' : 'e.g. Electronics - Mobiles'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'الفئة الفرعية (Subcategory)' : 'Subcategory'}</label>
              <input
                type="text"
                className="form-input"
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                placeholder={isRTL ? 'مثال: iOS Phones' : 'e.g. iOS Phones'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'السعر الحالي (EGP)' : 'Initial Price (EGP)'}</label>
              <input
                type="number"
                className="form-input"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="30000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'المورد المرتبط' : 'Associated Vendor'}</label>
              <select
                className="form-input"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
              >
                <option value="">{isRTL ? 'اختر مورداً (اختياري)' : 'Select a Vendor (Optional)'}</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.display_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'رابط المصدر/المنتج الأصلي' : 'Source Listing URL'}</label>
              <input
                type="url"
                className="form-input"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://example.com/product"
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{isRTL ? 'رابط صورة المنتج' : 'Product Image URL'}</label>
              <input
                type="url"
                className="form-input"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
              />
            </div>

            <div className="section-divider">{isRTL ? 'مواصفات المنتج (Specifications)' : 'Product Specifications'}</div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'الرام (RAM GB)' : 'RAM (GB)'}</label>
              <input
                type="number"
                className="form-input"
                value={ramGb}
                onChange={e => setRamGb(e.target.value)}
                placeholder="8"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'مساحة التخزين (Storage GB)' : 'Storage (GB)'}</label>
              <input
                type="number"
                className="form-input"
                value={storageGb}
                onChange={e => setStorageGb(e.target.value)}
                placeholder="128"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'المعالج (CPU Brand)' : 'CPU Brand'}</label>
              <input
                type="text"
                className="form-input"
                value={cpuBrand}
                onChange={e => setCpuBrand(e.target.value)}
                placeholder="Apple / Snapdragon / Intel"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'نظام التشغيل (OS)' : 'Operating System (OS)'}</label>
              <input
                type="text"
                className="form-input"
                value={os}
                onChange={e => setOs(e.target.value)}
                placeholder="iOS / Android / Windows"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'سعة البطارية (mAh)' : 'Battery (mAh)'}</label>
              <input
                type="number"
                className="form-input"
                value={batteryMah}
                onChange={e => setBatteryMah(e.target.value)}
                placeholder="5000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'حجم الشاشة (Inches)' : 'Display Size (Inches)'}</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={displayInches}
                onChange={e => setDisplayInches(e.target.value)}
                placeholder="6.7"
              />
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'إضافة المنتج والأسعار' : 'Add Product & Prices')}
          </button>
        </form>
      ) : (
        <form className="form-panel" onSubmit={handleImportSubmit}>
          <div className="form-grid full-width">
            <div className="form-group">
              <label className="form-label">{isRTL ? 'اختر العنصر المبحوث للاستيراد' : 'Select Sourced Item to Import'}</label>
              {researchItems.length === 0 ? (
                <div style={{ opacity: 0.6, fontSize: '0.9rem', padding: '8px' }}>
                  {isRTL ? 'لا توجد عناصر مبحوثة جديدة متاحة للاستيراد حالياً.' : 'No new sourced items available for import.'}
                </div>
              ) : (
                <select
                  className="form-input"
                  required
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                >
                  <option value="">{isRTL ? '--- اختر عنصراً مبحوثاً ---' : '--- Select Sourced Item ---'}</option>
                  {researchItems.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.source_name}] {item.product_title} {item.price_amount ? `(${item.price_amount} ${item.currency_code || 'EGP'})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{isRTL ? 'فئة المنتج المستورد (Category)' : 'Imported Product Category'}</label>
              <input
                type="text"
                className="form-input"
                required
                value={importCategory}
                onChange={e => setImportCategory(e.target.value)}
                placeholder={isRTL ? 'مثال: Electronics - Mobiles' : 'e.g. Electronics - Mobiles'}
              />
            </div>

            {selectedResearchItem && (
              <div className="item-details-card">
                <div style={{ fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  {isRTL ? 'بيانات التوريد المبحوثة' : 'Sourced Item Intelligence'}
                </div>
                <div className="item-details-row">
                  <span className="item-details-label">{isRTL ? 'الاسم الأصلي:' : 'Original Name:'}</span>
                  <span className="item-details-value">{selectedResearchItem.product_title}</span>
                </div>
                <div className="item-details-row">
                  <span className="item-details-label">{isRTL ? 'اسم المصدر/المحل:' : 'Source Store:'}</span>
                  <span className="item-details-value">{selectedResearchItem.source_name}</span>
                </div>
                <div className="item-details-row">
                  <span className="item-details-label">{isRTL ? 'السعر المرصود:' : 'Observed Price:'}</span>
                  <span className="item-details-value" style={{ color: 'var(--accent)' }}>
                    {selectedResearchItem.price_amount
                      ? `${selectedResearchItem.price_amount} ${selectedResearchItem.currency_code || 'EGP'}`
                      : (isRTL ? 'غير متوفر' : 'N/A')}
                  </span>
                </div>
                {selectedResearchItem.listing_url && (
                  <div className="item-details-row">
                    <span className="item-details-label">{isRTL ? 'رابط العرض:' : 'Offer Link:'}</span>
                    <a
                      href={selectedResearchItem.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="item-details-value"
                      style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}
                    >
                      {isRTL ? 'زيارة الرابط ↗' : 'Visit link ↗'}
                    </a>
                  </div>
                )}
                {selectedResearchItem.product_specs_summary && (
                  <div style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--secondary)', marginBottom: '4px' }}>{isRTL ? 'ملخص المواصفات:' : 'Specs Summary:'}</div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', fontStyle: 'italic' }}>
                      {selectedResearchItem.product_specs_summary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{ marginTop: '20px' }}
            disabled={loading || !selectedItemId}
          >
            {loading ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد وحفظ في الكتالوج' : 'Import & Save to Catalog')}
          </button>
        </form>
      )}
    </div>
  )
}
