'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  saveProductAction,
  toggleWatchlistAction,
  savePriceAlertAction,
  deletePriceAlertAction
} from '../../../customers/actions';

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

interface PriceHistory {
  id: string;
  price: number;
  captured_at: string;
}

interface PriceEvent {
  id: string;
  old_price: number;
  new_price: number;
  difference: number;
  percentage_change: number;
  direction: 'up' | 'down' | 'no_change';
  created_at: string;
}

interface PriceAlert {
  id: string;
  alert_type: 'any_drop' | 'pct_5' | 'pct_10' | 'target_price';
  target_price?: number;
  is_active: boolean;
}

interface AlertEvent {
  id: string;
  old_price: number;
  new_price: number;
  triggered_condition: string;
  created_at: string;
  price_alerts?: {
    alert_type: string;
  };
}

interface Alternative {
  id: string;
  title: string;
  brand: string;
  current_price: number;
  score: number;
  savings_amount: number;
  savings_percentage: number;
  reasons: {
    pros: string[];
    cons: string[];
    explanation: string;
  };
}

interface ProductDetailsClientProps {
  locale: string;
  product: Product;
  priceHistory: PriceHistory[];
  priceEvents: PriceEvent[];
  isWatched: boolean;
  priceAlerts: PriceAlert[];
  alertEvents: AlertEvent[];
  analytics: {
    lowest_historical_price: number;
    highest_historical_price: number;
    average_price: number;
    trend_7_days: { diff: number; pct: number };
    trend_30_days: { diff: number; pct: number };
    trend_90_days: { diff: number; pct: number };
    detected_trend: string;
    trend_score: number;
  };
  alternatives: Alternative[];
  currentUserId: string;
}

export default function ProductDetailsClient({
  locale,
  product: initialProduct,
  priceHistory,
  priceEvents,
  isWatched: initialIsWatched,
  priceAlerts: initialPriceAlerts,
  alertEvents: initialAlertEvents,
  analytics,
  alternatives,
  currentUserId
}: ProductDetailsClientProps) {
  const isRTL = locale === 'ar';
  const { toast } = useToast();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(initialPriceAlerts);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>(initialAlertEvents);
  const [isPending, startTransition] = useTransition();

  // Price override state
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [newPrice, setNewPrice] = useState(product.current_price);

  // Alert setup form state
  const [alertType, setAlertType] = useState<'any_drop' | 'pct_5' | 'pct_10' | 'target_price'>('any_drop');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          id: product.id,
          title: product.title,
          brand: product.brand,
          category: product.category,
          current_price: Number(newPrice),
          source: product.source,
          specifications: product.specifications || {}
        };

        const res = await saveProductAction(payload, locale);
        if (res.success) {
          setProduct({ ...product, current_price: Number(newPrice), last_updated: new Date().toISOString() });
          setShowPriceEdit(false);
          toast(isRTL ? 'تم تحديث السعر ومراجعة التنبيهات' : 'Price updated and alerts checked!', { type: 'success', title: '🏷️' });
          
          // Fast page refresh helper (to show new history records and events)
          window.location.reload();
        }
      } catch (err: any) {
        toast(err.message || 'Error updating price', { type: 'error' });
      }
    });
  };

  const handleToggleWatchlist = () => {
    startTransition(async () => {
      try {
        await toggleWatchlistAction(product.id, currentUserId, locale);
        setIsWatched(!isWatched);
        toast(
          isWatched 
            ? (isRTL ? 'تمت إزالة المنتج من قائمة المتابعة' : 'Removed from watchlist') 
            : (isRTL ? 'تمت إضافة المنتج لقائمة المتابعة' : 'Added to watchlist'),
          { type: 'success' }
        );
      } catch (err: any) {
        toast(err.message || 'Error toggling watchlist', { type: 'error' });
      }
    });
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          user_id: currentUserId,
          product_id: product.id,
          alert_type: alertType,
          target_price: alertType === 'target_price' ? Number(targetPrice) : undefined
        };

        await savePriceAlertAction(payload, locale);
        toast(isRTL ? 'تم إنشاء التنبيه بنجاح' : 'Alert created successfully!', { type: 'success', title: '🔔' });
        
        // Reload to refresh active alerts
        window.location.reload();
      } catch (err: any) {
        toast(err.message || 'Error creating alert', { type: 'error' });
      }
    });
  };

  const handleDeleteAlert = (id: string) => {
    startTransition(async () => {
      try {
        await deletePriceAlertAction(id, product.id, locale);
        setPriceAlerts(priceAlerts.filter(a => a.id !== id));
        toast(isRTL ? 'تم حذف التنبيه' : 'Alert deleted', { type: 'info' });
      } catch (err: any) {
        toast(err.message || 'Error deleting alert', { type: 'error' });
      }
    });
  };

  const getAlertLabel = (type: string, target?: number) => {
    switch (type) {
      case 'any_drop':
        return isRTL ? 'أي انخفاض في السعر' : 'Any price drop';
      case 'pct_5':
        return isRTL ? 'انخفاض 5% أو أكثر' : 'Drop of 5% or more';
      case 'pct_10':
        return isRTL ? 'انخفاض 10% أو أكثر' : 'Drop of 10% or more';
      case 'target_price':
        return isRTL ? `بلوغ سعر مستهدف: EGP ${target?.toLocaleString()}` : `Reaching target: EGP ${target?.toLocaleString()}`;
      default:
        return type;
    }
  };

  return (
    <div className="details-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .details-page { color: #e2e8f0; font-family: 'Outfit', 'Inter', sans-serif; max-width: 950px; margin: 0 auto; padding-bottom: 60px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .page-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px; color: white; }
        .subtitle { color: rgba(255,255,255,0.45); font-size: 0.95rem; margin: 0; }

        .back-link { padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255, 255, 255, 0.7); text-decoration: none; font-weight: 700; font-size: 0.85rem; border-radius: 10px; transition: all 0.2s; }
        .back-link:hover { background: rgba(255,255,255,0.05); color: #ffffff; }

        /* Main Flex Panels */
        .details-grid { display: grid; grid-template-columns: 1fr 320px; gap: 30px; margin-bottom: 40px; }
        
        .main-panel { display: flex; flex-direction: column; gap: 30px; }
        .side-panel { display: flex; flex-direction: column; gap: 30px; }

        .panel-card {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 25px;
        }
        .panel-title { font-size: 1.2rem; font-weight: 900; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: white; }

        /* Product Profile Banner */
        .profile-banner { display: flex; justify-content: space-between; align-items: flex-start; }
        .profile-title-block { flex: 1; }
        .profile-brand { font-size: 0.85rem; font-weight: 850; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .profile-name { font-size: 1.8rem; font-weight: 950; color: white; margin: 0 0 10px; }
        
        .profile-price-block { text-align: right; }
        [dir="rtl"] .profile-price-block { text-align: left; }
        .profile-price { font-size: 2rem; font-weight: 950; color: #10b981; }
        
        .btn-action-small { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .btn-action-small:hover { background: rgba(255,255,255,0.06); color: white; }

        /* Hardware Specifications List */
        .specs-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .spec-item { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 12px; padding: 12px 16px; }
        .spec-label { font-size: 0.75rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 2px; }
        .spec-value { font-size: 0.95rem; font-weight: 750; color: white; }

        /* Analytics Section */
        .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
        .analytics-mini { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; padding: 15px; text-align: center; }
        .analytics-mini-val { font-size: 1.2rem; font-weight: 900; color: white; }
        .analytics-mini-lbl { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 700; margin-top: 2px; }

        .gauge-row { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 12px; }
        .gauge-label { font-size: 0.85rem; font-weight: 800; color: rgba(255,255,255,0.6); }
        .gauge-value { font-size: 1.05rem; font-weight: 900; }

        /* Alert Controls */
        .watchlist-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 0.95rem; padding: 12px; border-radius: 12px; border: 1px solid; cursor: pointer; transition: all 0.2s; margin-bottom: 15px; }
        .watchlist-btn.watched { border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.08); color: #ef4444; }
        .watchlist-btn.unwatched { border-color: rgba(96,165,250,0.25); background: rgba(96,165,250,0.08); color: #60a5fa; }
        
        .alert-form { display: flex; flex-direction: column; gap: 12px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
        .alert-input-group { display: flex; gap: 8px; }
        .alert-select, .alert-input { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 12px; color: white; font-family: inherit; font-size: 0.85rem; flex: 1; }
        .btn-alert-submit { background: #3b82f6; border: none; color: white; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; cursor: pointer; }

        .active-alert-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 8px; font-size: 0.85rem; }
        .btn-delete-alert { background: none; border: none; cursor: pointer; color: #ef4444; font-size: 0.9rem; }

        /* Alternative recommendation list */
        .alt-card { background: rgba(16, 185, 129, 0.02); border: 1px solid rgba(16, 185, 129, 0.08); border-radius: 16px; padding: 15px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
        .alt-score { font-size: 0.75rem; font-weight: 900; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 2px 8px; border-radius: 6px; display: inline-block; margin-bottom: 6px; }
        .alt-title { font-size: 1.05rem; font-weight: 850; color: white; margin: 0 0 4px; }
        .alt-reason { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin: 0 0 10px; }
        
        .pros-cons { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; font-weight: 700; }
        .pro-item { color: #10b981; display: flex; align-items: center; gap: 4px; }
        .con-item { color: #ef4444; display: flex; align-items: center; gap: 4px; }

        /* Price History logs */
        .history-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
        [dir="rtl"] .history-table { text-align: right; }
        .history-table th, .history-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .history-table th { color: rgba(255,255,255,0.45); text-transform: uppercase; font-weight: 800; }
        .history-dir { font-weight: 900; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 0.75rem; }
        .history-dir.up { background: rgba(239,68,68,0.15); color: #ef4444; }
        .history-dir.down { background: rgba(16,185,129,0.15); color: #10b981; }

        /* Alert triggers logs */
        .alert-event-item { font-size: 0.8rem; padding: 10px 12px; border-radius: 10px; background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15); color: #f59e0b; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
      ` }} />

      <header className="page-header">
        <div>
          <h1 className="page-title">{isRTL ? 'تحليل ومراقبة السعر' : 'Price Analysis & Monitoring'}</h1>
          <p className="subtitle">{isRTL ? 'إثراء مواصفات السلع، تتبع منحنى الأسعار ومقارنة البدائل.' : 'Enrich specifications, monitor price trajectories and evaluate recommendations.'}</p>
        </div>
        <Link href={`/${locale}/staff/intelligence/features/product-graph`} className="back-link">
          {isRTL ? '← قاعدة المنتجات' : '← Back to Products'}
        </Link>
      </header>

      {/* Main product Profile Banner */}
      <section className="panel-card" style={{ marginBottom: '30px' }}>
        <div className="profile-banner">
          <div className="profile-title-block">
            <span className="profile-brand">{product.brand}</span>
            <h2 className="profile-name">{product.title}</h2>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
              <span>{isRTL ? 'الفئة:' : 'Category:'} {product.category}</span>
              <span>•</span>
              <span>{isRTL ? 'المصدر:' : 'Source:'} {product.source}</span>
            </div>
          </div>
          <div className="profile-price-block">
            <div className="profile-price">{product.current_price.toLocaleString()} EGP</div>
            <button className="btn-action-small" onClick={() => setShowPriceEdit(!showPriceEdit)}>
              🏷️ {isRTL ? 'تعديل السعر الحالي' : 'Update Price'}
            </button>
          </div>
        </div>

        {showPriceEdit && (
          <form onSubmit={handleUpdatePrice} style={{ display: 'flex', gap: '10px', marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
            <input
              className="alert-input"
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(Number(e.target.value))}
              placeholder="New Price (EGP)"
            />
            <button type="submit" className="btn-alert-submit" disabled={isPending}>
              {isRTL ? 'حفظ السعر الجديد' : 'Save'}
            </button>
          </form>
        )}
      </section>

      {/* Details Grid */}
      <div className="details-grid">
        
        {/* Left main area */}
        <div className="main-panel">
          
          {/* Hardware Specifications */}
          <div className="panel-card">
            <h3 className="panel-title">🔧 {isRTL ? 'مواصفات العتاد' : 'Hardware Specifications'}</h3>
            <div className="specs-list">
              <div className="spec-item">
                <div className="spec-label">RAM</div>
                <div className="spec-value">{product.specifications?.ram || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Storage</div>
                <div className="spec-value">{product.specifications?.storage || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">CPU</div>
                <div className="spec-value">{product.specifications?.cpu || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">GPU</div>
                <div className="spec-value">{product.specifications?.gpu || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Battery</div>
                <div className="spec-value">{product.specifications?.battery || '—'}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Camera</div>
                <div className="spec-value">{product.specifications?.camera || '—'}</div>
              </div>
              <div className="spec-item" style={{ gridColumn: 'span 2' }}>
                <div className="spec-label">Display</div>
                <div className="spec-value">{product.specifications?.display || '—'}</div>
              </div>
            </div>
          </div>

          {/* Price History */}
          <div className="panel-card">
            <h3 className="panel-title">📈 {isRTL ? 'سجل تطور الأسعار والصفقات' : 'Price History Log'}</h3>
            {priceHistory.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0 }}>
                {isRTL ? 'لا توجد سجلات أسعار سابقة للمنتج.' : 'No price records found.'}
              </p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{isRTL ? 'السعر' : 'Price'}</th>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 800 }}>{Number(h.price).toLocaleString()} EGP</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(h.captured_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Price Events */}
          {priceEvents.length > 0 && (
            <div className="panel-card">
              <h3 className="panel-title">🔔 {isRTL ? 'أحداث التغير الفعلي للأسعار' : 'Price Change Events'}</h3>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{isRTL ? 'الحدث' : 'Event'}</th>
                    <th>{isRTL ? 'النسبة' : 'Change %'}</th>
                    <th>{isRTL ? 'الاتجاه' : 'Direction'}</th>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceEvents.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 700 }}>
                        EGP {Number(e.old_price).toLocaleString()} ➔ EGP {Number(e.new_price).toLocaleString()}
                      </td>
                      <td style={{ color: e.difference > 0 ? '#ef4444' : '#10b981', fontWeight: 800 }}>
                        {e.difference > 0 ? '+' : ''}{e.percentage_change}%
                      </td>
                      <td>
                        <span className={`history-dir ${e.direction}`}>
                          {e.direction === 'up' ? (isRTL ? 'ارتفاع ↗' : 'Up ↗') : (isRTL ? 'انخفاض ↘' : 'Down ↘')}
                        </span>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right side panel */}
        <div className="side-panel">
          
          {/* Price Analytics Mini Panel */}
          <div className="panel-card">
            <h3 className="panel-title">📊 {isRTL ? 'تحليلات منحنى السعر' : 'Price Analytics'}</h3>
            <div className="analytics-grid">
              <div className="analytics-mini">
                <div className="analytics-mini-val">{analytics.lowest_historical_price.toLocaleString()}</div>
                <div className="analytics-mini-lbl">{isRTL ? 'أدنى سعر' : 'Min Price'}</div>
              </div>
              <div className="analytics-mini">
                <div className="analytics-mini-val">{analytics.highest_historical_price.toLocaleString()}</div>
                <div className="analytics-mini-lbl">{isRTL ? 'أقصى سعر' : 'Max Price'}</div>
              </div>
              <div className="analytics-mini">
                <div className="analytics-mini-val">{analytics.average_price.toLocaleString()}</div>
                <div className="analytics-mini-lbl">{isRTL ? 'متوسط السعر' : 'Avg Price'}</div>
              </div>
            </div>

            <div className="gauge-row">
              <span className="gauge-label">{isRTL ? 'مؤشر الحركة (Trend Score):' : 'Trend Score:'}</span>
              <span className="gauge-value" style={{ color: analytics.trend_score > 50 ? '#ef4444' : '#10b981' }}>
                {analytics.trend_score}/100
              </span>
            </div>

            <div className="gauge-row">
              <span className="gauge-label">{isRTL ? 'الاتجاه المرصود (30 يوم):' : '30D Trend:'}</span>
              <span className="gauge-value" style={{ textTransform: 'capitalize' }}>
                {analytics.detected_trend}
              </span>
            </div>
          </div>

          {/* Watchlist & Alerts Panel */}
          <div className="panel-card">
            <h3 className="panel-title">🔔 {isRTL ? 'مركز التنبيهات والمراقبة' : 'Alert Center'}</h3>
            
            <button
              className={`watchlist-btn ${isWatched ? 'watched' : 'unwatched'}`}
              onClick={handleToggleWatchlist}
              disabled={isPending}
            >
              {isWatched 
                ? (isRTL ? '❤️ متابع' : '❤️ Watching') 
                : (isRTL ? '🤍 مراقبة ومتابعة السعر' : '🤍 Watch Product')}
            </button>

            {/* Price alert setup */}
            <form onSubmit={handleCreateAlert} className="alert-form">
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'تنبيهي عند:' : 'Alert Condition:'}</label>
                <select
                  className="alert-select"
                  value={alertType}
                  onChange={e => setAlertType(e.target.value as any)}
                >
                  <option value="any_drop">{isRTL ? 'أي انخفاض في السعر' : 'Any price drop'}</option>
                  <option value="pct_5">{isRTL ? 'انخفاض بمقدار 5%' : 'Drop of 5%'}</option>
                  <option value="pct_10">{isRTL ? 'انخفاض بمقدار 10%' : 'Drop of 10%'}</option>
                  <option value="target_price">{isRTL ? 'بلوغ سعر معين' : 'Target price'}</option>
                </select>
              </div>

              {alertType === 'target_price' && (
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>{isRTL ? 'السعر المستهدف:' : 'Target Price (EGP):'}</label>
                  <input
                    className="alert-input"
                    type="number"
                    required
                    value={targetPrice}
                    onChange={e => setTargetPrice(Number(e.target.value))}
                    placeholder="e.g. 45000"
                  />
                </div>
              )}

              <button type="submit" className="btn-alert-submit" disabled={isPending}>
                + {isRTL ? 'تفعيل التنبيه' : 'Activate Alert'}
              </button>
            </form>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                {isRTL ? 'التنبيهات النشطة لك:' : 'Active alerts:'}
              </h4>
              {priceAlerts.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                  {isRTL ? 'لم تقم بتفعيل أي تنبيهات لهذا المنتج.' : 'No active alerts set.'}
                </p>
              ) : (
                priceAlerts.map(a => (
                  <div key={a.id} className="active-alert-item">
                    <span>{getAlertLabel(a.alert_type, a.target_price)}</span>
                    <button className="btn-delete-alert" onClick={() => handleDeleteAlert(a.id)} disabled={isPending}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Triggered Alert Events Logs */}
          {alertEvents.length > 0 && (
            <div className="panel-card">
              <h3 className="panel-title">📢 {isRTL ? 'إشعارات التنبيهات المستلمة' : 'Alert Trigger Logs'}</h3>
              {alertEvents.map(e => (
                <div key={e.id} className="alert-event-item">
                  <div>
                    <div style={{ fontWeight: 850 }}>{e.triggered_condition}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(245,158,11,0.6)', marginTop: '2px' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span>🔔</span>
                </div>
              ))}
            </div>
          )}

          {/* Alternatives/Recommendations (Explainable) */}
          <div className="panel-card">
            <h3 className="panel-title">💡 {isRTL ? 'البدائل الذكية الموصى بها' : 'Smart Alternatives'}</h3>
            
            {alternatives.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0 }}>
                {isRTL ? 'لا توجد بدائل موصى بها في نفس الفئة.' : 'No recommended alternatives.'}
              </p>
            ) : (
              alternatives.map(alt => (
                <div key={alt.id} className="alt-card">
                  <div style={{ flex: 1 }}>
                    <span className="alt-score">{alt.score}/100 Match</span>
                    <h4 className="alt-title">{alt.title}</h4>
                    <p className="alt-reason">{alt.reasons.explanation}</p>
                    
                    {/* Explainable recommendation Pros/Cons */}
                    <div className="pros-cons">
                      {alt.reasons.pros.map((pro, idx) => (
                        <div key={idx} className="pro-item">✔ {pro}</div>
                      ))}
                      {alt.reasons.cons.map((con, idx) => (
                        <div key={idx} className="con-item">✘ {con}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', fontWeight: 950, color: '#10b981', fontSize: '0.95rem' }}>
                    {alt.current_price.toLocaleString()} EGP
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
