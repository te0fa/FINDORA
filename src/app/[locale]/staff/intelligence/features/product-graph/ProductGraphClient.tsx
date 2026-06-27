'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { saveProductAction, deleteProductAction } from '../../customers/actions';

interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  current_price: number;
  source: string;
  specifications: Record<string, string>;
  last_updated: string;
}

interface ProductGraphClientProps {
  locale: string;
  initialProducts: Product[];
  metrics: {
    productsCount: number;
    recordedPricesCount: number;
    categoriesCount: number;
  };
  currentUserId: string;
}

export default function ProductGraphClient({
  locale,
  initialProducts,
  metrics: initialMetrics,
  currentUserId
}: ProductGraphClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isPending, startTransition] = useTransition();

  // Add Product Form/Modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    category: '',
    current_price: 0,
    source: '',
    ram: '',
    storage: '',
    cpu: '',
    gpu: '',
    battery: '',
    camera: '',
    display: ''
  });

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.brand || !formData.category || !formData.source) {
      toast(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', { type: 'error' });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: formData.title,
          brand: formData.brand,
          category: formData.category,
          current_price: Number(formData.current_price),
          source: formData.source,
          specifications: {
            ram: formData.ram,
            storage: formData.storage,
            cpu: formData.cpu,
            gpu: formData.gpu,
            battery: formData.battery,
            camera: formData.camera,
            display: formData.display
          }
        };

        const res = await saveProductAction(payload, locale);
        if (res.success && res.id) {
          const newProduct: Product = {
            id: res.id,
            title: payload.title,
            brand: payload.brand,
            category: payload.category,
            current_price: payload.current_price,
            source: payload.source,
            specifications: payload.specifications,
            last_updated: new Date().toISOString()
          };

          setProducts([newProduct, ...products]);
          setMetrics(prev => ({
            ...prev,
            productsCount: prev.productsCount + 1,
            recordedPricesCount: prev.recordedPricesCount + 1
          }));

          // Reset Form
          setFormData({
            title: '',
            brand: '',
            category: '',
            current_price: 0,
            source: '',
            ram: '',
            storage: '',
            cpu: '',
            gpu: '',
            battery: '',
            camera: '',
            display: ''
          });
          setShowAddForm(false);
          toast(isRTL ? 'تم إضافة المنتج بنجاح للقاعدة' : 'Product successfully added to graph!', { type: 'success', title: '🌐' });
        }
      } catch (err: any) {
        toast(err.message || 'Error saving product', { type: 'error' });
      }
    });
  };

  const handleDeleteProduct = (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المنتج بالكامل؟' : 'Are you sure you want to delete this product completely?')) return;

    startTransition(async () => {
      try {
        await deleteProductAction(id, locale);
        setProducts(products.filter(p => p.id !== id));
        setMetrics(prev => ({
          ...prev,
          productsCount: Math.max(0, prev.productsCount - 1)
        }));
        toast(isRTL ? 'تم حذف المنتج من القاعدة' : 'Product deleted from graph', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error deleting product', { type: 'error' });
      }
    });
  };

  return (
    <div className="product-graph-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .product-graph-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 950px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }
        
        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Unified Graph Header Banner */
        .graph-banner {
          background: radial-gradient(circle at top, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 75%);
          border: 1px solid rgba(37,99,235,0.25);
          border-radius: 24px;
          padding: 30px;
          text-align: center;
          margin-bottom: 35px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        .graph-banner-title { font-size: 1.8rem; font-weight: 950; color: #60a5fa; margin: 0 0 10px; }
        .graph-banner-flow { font-size: 1.05rem; color: #f7d46b; font-weight: 850; margin: 0; }

        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
        }
        .stat-value { font-size: 2.8rem; font-weight: 950; color: #60a5fa; margin-bottom: 4px; }
        .stat-label { font-size: 0.95rem; font-weight: 800; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Add Button */
        .btn-add-base {
          width: 100%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          font-weight: 900;
          font-size: 1.1rem;
          padding: 16px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          margin-bottom: 40px;
        }
        .btn-add-base:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.3); }

        /* Entered Products */
        .section-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 20px; color: white; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
        
        .products-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 45px; }
        .product-card {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 20px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.25s ease;
        }
        .product-card:hover {
          border-color: rgba(96,165,250,0.25);
          background: rgba(255,255,255,0.03);
          transform: translateY(-2px);
        }
        .product-info { flex: 1; }
        .product-name { font-size: 1.25rem; font-weight: 900; color: white; margin: 0 0 6px; }
        .product-meta { display: flex; gap: 15px; font-size: 0.85rem; color: rgba(255,255,255,0.45); font-weight: 700; }
        .meta-tag { background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); }
        .product-price-column { text-align: right; margin-left: 25px; }
        [dir="rtl"] .product-price-column { text-align: left; margin-left: 0; margin-right: 25px; }
        .product-price { font-size: 1.35rem; font-weight: 950; color: #10b981; }
        .product-source { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 4px; font-weight: 700; }

        /* Action Buttons */
        .product-actions { display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end; }
        .btn-card-action { background: none; border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .btn-card-action:hover { background: rgba(255,255,255,0.06); color: white; }
        .btn-card-delete:hover { background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3); }

        /* Roadmap section */
        .roadmap-card {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 30px;
        }
        .roadmap-steps { display: flex; flex-direction: column; gap: 15px; }
        .roadmap-step { display: flex; gap: 20px; align-items: flex-start; padding: 15px; border-radius: 16px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.02); }
        .roadmap-badge { min-width: 140px; text-align: center; font-weight: 900; font-size: 0.85rem; padding: 4px 10px; border-radius: 8px; }
        .badge-current { color: #3b82f6; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); }
        .badge-future { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
        .roadmap-content { flex: 1; }
        .roadmap-title { font-size: 1rem; font-weight: 850; color: white; margin-bottom: 4px; }
        .roadmap-desc { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.4; }

        /* Form Modal */
        .modal-backdrop {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-card {
          background: #151419;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
          padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full-width { grid-column: span 2; }
        .form-group label { font-size: 0.8rem; font-weight: 850; color: rgba(255,255,255,0.45); text-transform: uppercase; }
        .form-input {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 12px; color: white; font-family: inherit; font-size: 0.95rem;
        }
        .form-input:focus { outline: none; border-color: #3b82f6; }
        
        .specs-header { font-size: 0.9rem; font-weight: 900; color: #60a5fa; grid-column: span 2; margin-top: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'قاعدة معرفة المنتجات' : 'Universal Product Graph'}</h1>
          <p className="subtitle">
            {isRTL 
              ? 'تتبع تطور أسعار السلع ومواصفات الأجهزة لتقديم أفضل قرارات الشراء.' 
              : 'Track price evolution and specifications to provide optimal purchase decisions.'}
          </p>
        </div>
        <Link href={`/${locale}/staff/intelligence`} className="back-link">
          {isRTL ? '← لوحة الذكاء' : '← Intelligence'}
        </Link>
      </header>

      {/* Banner */}
      <section className="graph-banner">
        <h2 className="graph-banner-title">
          {isRTL ? 'قاعدة معرفة موحدة لكل منتج 🌐' : 'Unified Product Knowledge Base 🌐'}
        </h2>
        <p className="graph-banner-flow">
          {isRTL 
            ? 'إذا وصلت لها، لن تصبح Findora مجرد Marketplace — ستصبح "محرك معرفة الشراء".' 
            : 'If achieved, Findora evolves from a marketplace into the Purchase Knowledge Engine.'}
        </p>
      </section>

      {/* Metrics */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{metrics.productsCount}</div>
          <div className="stat-label">{isRTL ? 'منتج مُدخل' : 'Products Entered'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics.recordedPricesCount}</div>
          <div className="stat-label">{isRTL ? 'سعر مسجّل' : 'Prices Recorded'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics.categoriesCount}</div>
          <div className="stat-label">{isRTL ? 'فئة' : 'Categories'}</div>
        </div>
      </section>

      {/* Add Button */}
      <button className="btn-add-base" onClick={() => setShowAddForm(true)}>
        + {isRTL ? 'إضافة منتج للقاعدة' : 'Add Product to Base'}
      </button>

      {/* Product List */}
      <section style={{ marginBottom: '45px' }}>
        <h2 className="section-title">📦 {isRTL ? 'المنتجات المُدخلة' : 'Entered Products'}</h2>
        
        <div className="products-list">
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {isRTL ? 'لا توجد منتجات مُدخلة بعد.' : 'No products entered yet.'}
              </p>
            </div>
          ) : (
            products.map(prod => (
              <div key={prod.id} className="product-card">
                <div className="product-info">
                  <h3 className="product-name">{prod.title}</h3>
                  <div className="product-meta">
                    <span className="meta-tag">{prod.brand}</span>
                    <span className="meta-tag">{prod.category}</span>
                  </div>
                  <div className="product-actions">
                    <Link href={`/${locale}/staff/intelligence/features/product-graph/${prod.id}`} className="btn-card-action">
                      📊 {isRTL ? 'تحليل ومراقبة السعر' : 'Analyze & Monitor'}
                    </Link>
                    <button className="btn-card-action btn-card-delete" onClick={() => handleDeleteProduct(prod.id)} disabled={isPending}>
                      🗑️ {isRTL ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
                <div className="product-price-column">
                  <div className="product-price">{Number(prod.current_price).toLocaleString()} EGP</div>
                  <div className="product-source">{isRTL ? 'المصدر:' : 'Source:'} {prod.source}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Roadmap */}
      <section className="roadmap-card">
        <h2 className="section-title">🗺️ {isRTL ? 'خارطة الطريق لـ UNIVERSAL PRODUCT GRAPH' : 'Roadmap for UNIVERSAL PRODUCT GRAPH'}</h2>
        
        <div className="roadmap-steps">
          <div className="roadmap-step">
            <span className="roadmap-badge badge-current">{isRTL ? 'المرحلة ١ (الآن)' : 'Phase 1 (Now)'}</span>
            <div className="roadmap-content">
              <h3 className="roadmap-title">{isRTL ? 'تسجيل يدوي للمنتجات من الطلبات والصفقات' : 'Manual registration from requests and deals'}</h3>
              <p className="roadmap-desc">{isRTL ? 'تسجيل المنتجات يدوياً وإثراء مواصفات الأجهزة لبدء تعقبها.' : 'Manually inputs products and specifications to initialize graph nodes.'}</p>
            </div>
          </div>

          <div className="roadmap-step">
            <span className="roadmap-badge badge-future">{isRTL ? 'المرحلة ٢ (٦ أشهر)' : 'Phase 2 (6 Months)'}</span>
            <div className="roadmap-content">
              <h3 className="roadmap-title">{isRTL ? 'Price History تلقائي من كل عرض يصل' : 'Automated Price History from incoming quotes'}</h3>
              <p className="roadmap-desc">{isRTL ? 'محرك ذكاء المنصة يسجل الأسعار والصفقات تلقائياً من عروض المناديب والموردين.' : 'Intake engines log prices automatically from bids submitted by field scouts.'}</p>
            </div>
          </div>

          <div className="roadmap-step">
            <span className="roadmap-badge badge-future">{isRTL ? 'المرحلة ٣ (١٢ شهر)' : 'Phase 3 (12 Months)'}</span>
            <div className="roadmap-content">
              <h3 className="roadmap-title">{isRTL ? 'Product Standardization' : 'Product Standardization'}</h3>
              <p className="roadmap-desc">{isRTL ? 'دمج نفس المنتج المسجل بأسماء وتعديلات مختلفة لتلافي التكرار.' : 'Combines identical products typed differently into single standardized nodes.'}</p>
            </div>
          </div>

          <div className="roadmap-step">
            <span className="roadmap-badge badge-future">{isRTL ? 'المرحلة ٤ (٢٤ شهر)' : 'Phase 4 (24 Months)'}</span>
            <div className="roadmap-content">
              <h3 className="roadmap-title">{isRTL ? 'AI يستخرج المواصفات من وصف العميل' : 'AI parses specs from customer query'}</h3>
              <p className="roadmap-desc">{isRTL ? 'الذكاء الاصطناعي يستخرج تفاصيل الرام والمساحة ونوع المعالج من طلب العميل تلقائياً.' : 'AI automatically extracts RAM, Storage, and model details from free text.'}</p>
            </div>
          </div>

          <div className="roadmap-step">
            <span className="roadmap-badge badge-future">{isRTL ? 'المرحلة ٥ (٥ سنوات)' : 'Phase 5 (5 Years)'}</span>
            <div className="roadmap-content">
              <h3 className="roadmap-title">{isRTL ? 'Universal Product Graph متكامل' : 'Complete Universal Product Graph'}</h3>
              <p className="roadmap-desc">{isRTL ? 'كل منتج له مواصفات كاملة + تاريخ أسعار + بدائل مقترحة + تقييمات موثوقة.' : 'Full specifications, price trends, recommendations, and ratings per product node.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="section-title" style={{ fontSize: '1.4rem' }}>
              {isRTL ? 'إضافة منتج جديد لقاعدة المعرفة' : 'Add New Product to Knowledge Base'}
            </h2>
            
            <form onSubmit={handleSaveProduct}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{isRTL ? 'اسم المنتج' : 'Product Title'}</label>
                  <input
                    className="form-input"
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. iPhone 15 Pro"
                  />
                </div>

                <div className="form-group">
                  <label>{isRTL ? 'الشركة المصنعة / البراند' : 'Brand'}</label>
                  <input
                    className="form-input"
                    type="text"
                    required
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Apple"
                  />
                </div>

                <div className="form-group">
                  <label>{isRTL ? 'الفئة (Category)' : 'Category'}</label>
                  <select
                    className="form-input"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">{isRTL ? '-- اختر الفئة --' : '-- Select Category --'}</option>
                    <option value="mobiles">{isRTL ? 'موبايلات' : 'Mobiles'}</option>
                    <option value="laptops">{isRTL ? 'لاب توب' : 'Laptops'}</option>
                    <option value="electronics">{isRTL ? 'إلكترونيات' : 'Electronics'}</option>
                    <option value="appliances">{isRTL ? 'أجهزة منزلية' : 'Appliances'}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{isRTL ? 'السعر الحالي (EGP)' : 'Current Price (EGP)'}</label>
                  <input
                    className="form-input"
                    type="number"
                    required
                    value={formData.current_price || ''}
                    onChange={e => setFormData({ ...formData, current_price: Number(e.target.value) })}
                    placeholder="e.g. 50000"
                  />
                </div>

                <div className="form-group full-width">
                  <label>{isRTL ? 'المصدر (اسم المورد / المحل)' : 'Source (Merchant / Store)'}</label>
                  <input
                    className="form-input"
                    type="text"
                    required
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g. B.Tech Maadi Branch"
                  />
                </div>

                {/* Specifications region */}
                <div className="specs-header">{isRTL ? 'مواصفات العتاد (المطابقة والبدائل)' : 'Hardware Specifications (For Matching & Alternatives)'}</div>

                <div className="form-group">
                  <label>RAM</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.ram}
                    onChange={e => setFormData({ ...formData, ram: e.target.value })}
                    placeholder="e.g. 8GB"
                  />
                </div>

                <div className="form-group">
                  <label>Storage (مساحة التخزين)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.storage}
                    onChange={e => setFormData({ ...formData, storage: e.target.value })}
                    placeholder="e.g. 256GB"
                  />
                </div>

                <div className="form-group">
                  <label>CPU (المعالج)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.cpu}
                    onChange={e => setFormData({ ...formData, cpu: e.target.value })}
                    placeholder="e.g. A17 Pro"
                  />
                </div>

                <div className="form-group">
                  <label>GPU (معالج الرسوميات)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.gpu}
                    onChange={e => setFormData({ ...formData, gpu: e.target.value })}
                    placeholder="e.g. 6-core GPU"
                  />
                </div>

                <div className="form-group">
                  <label>Battery (البطارية)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.battery}
                    onChange={e => setFormData({ ...formData, battery: e.target.value })}
                    placeholder="e.g. 3274 mAh"
                  />
                </div>

                <div className="form-group">
                  <label>Camera (الكاميرا)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.camera}
                    onChange={e => setFormData({ ...formData, camera: e.target.value })}
                    placeholder="e.g. 48MP + 12MP"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Display (الشاشة)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.display}
                    onChange={e => setFormData({ ...formData, display: e.target.value })}
                    placeholder="e.g. 6.1 inch OLED"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '25px' }}>
                <button type="button" className="btn-card-action" onClick={() => setShowAddForm(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit" style={{ padding: '8px 24px' }} disabled={isPending}>
                  {isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ المنتج 💾' : 'Save Product 💾')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
