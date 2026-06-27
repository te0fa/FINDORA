'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface Product {
  id: string
  title_ar: string
  title_en: string | null
  brand: string | null
  category: string
  subcategory: string | null
  current_price: number | null
  currency_code: string
  image_url: string | null
  is_active: boolean
}

interface ProductsDashboardClientProps {
  products: Product[]
  totalCount: number
  categories: string[]
  brands: string[]
  currentPage: number
  limit: number
  locale: string
  isAdmin?: boolean
}

export default function ProductsDashboardClient({
  products,
  totalCount,
  categories,
  brands,
  currentPage,
  limit,
  locale,
  isAdmin
}: ProductsDashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRTL = locale === 'ar'

  // Local filter states
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '')

  // Reset page when filtering
  const applyFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1') // always reset to page 1 on filter change
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })

    router.push(`/${locale}/staff/products?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters({ q: search })
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategory('')
    setBrand('')
    setMinPrice('')
    setMaxPrice('')
    router.push(`/${locale}/staff/products`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/${locale}/staff/products?${params.toString()}`)
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="products-dashboard" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .products-dashboard {
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.8rem;
          margin: 0;
        }
        .btn-primary {
          background: var(--accent, #c8973b);
          color: #000;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          transition: background 0.2s ease;
        }
        .btn-primary:hover {
          background: #e5b35c;
        }
        .filters-panel {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          align-items: flex-end;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--secondary);
        }
        .filter-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 0.9rem;
          outline: none;
        }
        .filter-input:focus {
          border-color: var(--accent);
        }
        .actions-row {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          justify-content: flex-end;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
        }
        .products-table-wrapper {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .products-table {
          width: 100%;
          border-collapse: collapse;
          text-align: ${isRTL ? 'right' : 'left'};
        }
        .products-table th, .products-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .products-table th {
          background: rgba(30, 41, 59, 0.6);
          color: var(--secondary);
          font-size: 0.85rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .products-table tbody tr {
          transition: background 0.2s ease;
        }
        .products-table tbody tr:hover {
          background: rgba(255,255,255,0.02);
        }
        .product-info-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .product-image-placeholder {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: var(--secondary);
        }
        .product-title-ar {
          font-weight: bold;
          color: #fff;
        }
        .product-title-en {
          font-size: 0.8rem;
          color: var(--secondary);
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: bold;
        }
        .badge-category {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .badge-brand {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
        }
        .price-text {
          font-weight: 800;
          color: var(--accent);
        }
        .btn-view {
          color: var(--accent);
          text-decoration: none;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .btn-view:hover {
          text-decoration: underline;
        }
        .pagination-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
        }
        .pagination-info {
          font-size: 0.9rem;
          color: var(--secondary);
        }
        .pagination-buttons {
          display: flex;
          gap: 8px;
        }
        .btn-page {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: #fff;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-page:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .btn-page:not(:disabled):hover {
          background: rgba(255,255,255,0.1);
        }
      ` }} />

      <div className="page-header">
        <h1 className="page-title">
          {isRTL ? 'إدارة كتالوج المنتجات 📦' : 'Products Catalog Management 📦'}
        </h1>
        {isAdmin && (
          <Link href={`/${locale}/staff/products/new`} className="btn-primary">
            {isRTL ? '+ إضافة منتج جديد' : '+ Add New Product'}
          </Link>
        )}
      </div>

      <div className="filters-panel">
        <form onSubmit={handleSearchSubmit}>
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">{isRTL ? 'بحث بالاسم أو الماركة' : 'Search Name / Brand'}</label>
              <input
                type="text"
                className="filter-input"
                placeholder={isRTL ? 'اكتب كلمة البحث...' : 'Type search terms...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label className="filter-label">{isRTL ? 'الفئة (Category)' : 'Category'}</label>
              <select
                className="filter-input"
                value={category}
                onChange={e => {
                  setCategory(e.target.value)
                  applyFilters({ category: e.target.value })
                }}
              >
                <option value="">{isRTL ? 'الكل' : 'All Categories'}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">{isRTL ? 'الماركة (Brand)' : 'Brand'}</label>
              <select
                className="filter-input"
                value={brand}
                onChange={e => {
                  setBrand(e.target.value)
                  applyFilters({ brand: e.target.value })
                }}
              >
                <option value="">{isRTL ? 'الكل' : 'All Brands'}</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">{isRTL ? 'السعر الأدنى' : 'Min Price'}</label>
              <input
                type="number"
                className="filter-input"
                placeholder="0"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{isRTL ? 'السعر الأعلى' : 'Max Price'}</label>
              <input
                type="number"
                className="filter-input"
                placeholder="100000"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClearFilters}
            >
              {isRTL ? 'مسح التصفية' : 'Clear Filters'}
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '8px 24px', cursor: 'pointer' }}
            >
              {isRTL ? 'تطبيق الفلترة' : 'Apply Filters'}
            </button>
          </div>
        </form>
      </div>

      <div className="products-table-wrapper">
        {products.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
            {isRTL ? 'لم يتم العثور على أي منتجات مطابقة.' : 'No products found matching the criteria.'}
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>{isRTL ? 'المنتج' : 'Product'}</th>
                <th>{isRTL ? 'الماركة' : 'Brand'}</th>
                <th>{isRTL ? 'الفئة' : 'Category'}</th>
                <th>{isRTL ? 'السعر الحالي' : 'Current Price'}</th>
                <th>{isRTL ? 'الخيارات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>
                    <div className="product-info-cell">
                      <div className="product-image-placeholder">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.title_ar}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        ) : (
                          '📦'
                        )}
                      </div>
                      <div>
                        <div className="product-title-ar">{product.title_ar}</div>
                        {product.title_en && <div className="product-title-en">{product.title_en}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {product.brand ? (
                      <span className="badge badge-brand">{product.brand}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <span className="badge badge-category">{product.category}</span>
                  </td>
                  <td>
                    {product.current_price !== null ? (
                      <span className="price-text">
                        {product.current_price.toLocaleString()} {product.currency_code || 'EGP'}
                      </span>
                    ) : (
                      <span style={{ opacity: 0.4 }}>{isRTL ? 'غير مسعر' : 'No price'}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/${locale}/staff/products/${product.id}`} className="btn-view">
                      {isRTL ? 'التفاصيل والأسعار ←' : 'Details & Prices ←'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination-row">
        <div className="pagination-info">
          {isRTL
            ? `عرض ${products.length} من أصل ${totalCount} منتج`
            : `Showing ${products.length} of ${totalCount} products`}
        </div>
        
        {totalPages > 1 && (
          <div className="pagination-buttons">
            <button
              className="btn-page"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              {isRTL ? 'السابق' : 'Previous'}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.9rem' }}>
              {isRTL
                ? `صفحة ${currentPage} من ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              className="btn-page"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {isRTL ? 'التالي' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
