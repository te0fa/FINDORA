'use client'

import { useState } from 'react'
import { FinancialCategory, FinancialTransaction } from '@/lib/dal/finance'
import { handleCreateTransaction, handleCreateCategory, handleDeleteTransaction } from './actions'

type FinanceClientPageProps = {
  locale: string
  dict: any
  categories: FinancialCategory[]
  transactions: FinancialTransaction[]
  summary: { income: number; expense: number; profit: number }
}

export function FinanceClientPage({ locale, dict, categories, transactions, summary }: FinanceClientPageProps) {
  const isRTL = locale === 'ar'
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [isAddCatOpen, setIsAddCatOpen] = useState(false)

  // Filter logic
  const filteredTxs = transactions.filter(t => filterType === 'ALL' ? true : t.type === filterType)

  return (
    <div className="finance-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{ __html: `
        .finance-page { width: 100%; color: #fff; padding-bottom: 60px; }
        .fin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        .fin-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.03em; }
        .fin-subtitle { color: rgba(255,255,255,0.5); font-size: 1.1rem; }
        
        .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
        .summary-card { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; backdrop-filter: blur(20px); position: relative; overflow: hidden; }
        .summary-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--accent); }
        .sc-title { font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
        .sc-val { font-size: 2.5rem; font-weight: 900; }
        
        .controls-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .filters { display: flex; gap: 8px; }
        .filter-btn { background: rgba(255,255,255,0.05); border: 1px solid transparent; color: rgba(255,255,255,0.6); padding: 8px 16px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .filter-btn:hover { background: rgba(255,255,255,0.1); }
        .filter-btn.active { background: rgba(212,166,60,0.15); color: #f7d46b; border-color: rgba(212,166,60,0.3); }
        
        .actions-group { display: flex; gap: 12px; }
        .btn-primary { background: #f7d46b; color: #000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #d4a63c; transform: translateY(-2px); }
        .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-secondary:hover { background: rgba(255,255,255,0.15); }

        .tx-list { display: flex; flex-direction: column; gap: 12px; }
        .tx-item { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
        .tx-item:hover { border-color: rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.7); }
        .tx-left { display: flex; gap: 16px; align-items: center; }
        .tx-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; }
        .tx-icon.income { background: rgba(34,197,94,0.1); color: #4ade80; }
        .tx-icon.expense { background: rgba(239,68,68,0.1); color: #ef4444; }
        .tx-cat { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }
        .tx-desc { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
        .tx-date { font-size: 0.75rem; color: rgba(255,255,255,0.3); margin-top: 4px; }
        .tx-right { text-align: ${isRTL ? 'left' : 'right'}; display: flex; align-items: center; gap: 24px; }
        .tx-amount { font-size: 1.4rem; font-weight: 900; }
        .tx-amount.income { color: #4ade80; }
        .tx-amount.expense { color: #ef4444; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
        .modal-content { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; width: 100%; max-width: 500px; padding: 30px; }
        .modal-title { font-size: 1.5rem; font-weight: 900; margin: 0 0 20px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
        .form-control { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; color: white; font-size: 1rem; }
        .form-control:focus { outline: none; border-color: #f7d46b; }
        .form-control option { background: #0f172a; color: white; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        
        .delete-btn { background: transparent; border: none; color: rgba(239,68,68,0.5); cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s; }
        .delete-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
      `}} />

      <div className="fin-header">
        <div>
          <h1 className="fin-title">{isRTL ? 'إدارة الخزينة (ERP)' : 'Financial Ledger (ERP)'}</h1>
          <p className="fin-subtitle">{isRTL ? 'تتبع كامل للإيرادات والمصروفات' : 'Complete tracking of all income and expenses'}</p>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card" style={{ '--accent': '#10b981' } as any}>
          <div className="sc-title">{isRTL ? 'إجمالي الإيرادات' : 'Total Income'}</div>
          <div className="sc-val" style={{ color: '#10b981' }}>{summary.income.toLocaleString('en-US')} <span style={{ fontSize: '1rem' }}>EGP</span></div>
        </div>
        <div className="summary-card" style={{ '--accent': '#ef4444' } as any}>
          <div className="sc-title">{isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}</div>
          <div className="sc-val" style={{ color: '#ef4444' }}>{summary.expense.toLocaleString('en-US')} <span style={{ fontSize: '1rem' }}>EGP</span></div>
        </div>
        <div className="summary-card" style={{ '--accent': '#3b82f6' } as any}>
          <div className="sc-title">{isRTL ? 'صافي الربح' : 'Net Profit'}</div>
          <div className="sc-val" style={{ color: '#3b82f6' }}>{summary.profit.toLocaleString('en-US')} <span style={{ fontSize: '1rem' }}>EGP</span></div>
        </div>
      </div>

      <div className="controls-bar">
        <div className="filters">
          <button className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`} onClick={() => setFilterType('ALL')}>
            {isRTL ? 'الكل' : 'All'}
          </button>
          <button className={`filter-btn ${filterType === 'INCOME' ? 'active' : ''}`} onClick={() => setFilterType('INCOME')}>
            {isRTL ? 'الإيرادات' : 'Income'}
          </button>
          <button className={`filter-btn ${filterType === 'EXPENSE' ? 'active' : ''}`} onClick={() => setFilterType('EXPENSE')}>
            {isRTL ? 'المصروفات' : 'Expenses'}
          </button>
        </div>
        <div className="actions-group">
          <button className="btn-secondary" onClick={() => setIsAddCatOpen(true)}>
            {isRTL ? '+ بند جديد' : '+ New Category'}
          </button>
          <button className="btn-primary" onClick={() => setIsAddTxOpen(true)}>
            {isRTL ? '+ إضافة حركة مالية' : '+ Record Transaction'}
          </button>
        </div>
      </div>

      <div className="tx-list">
        {filteredTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            {isRTL ? 'لا توجد حركات مالية مسجلة بعد.' : 'No financial transactions recorded yet.'}
          </div>
        ) : (
          filteredTxs.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className="tx-left">
                <div className={`tx-icon ${tx.type.toLowerCase()}`}>
                  {tx.type === 'INCOME' ? '↓' : '↑'}
                </div>
                <div>
                  <div className="tx-cat">{isRTL ? tx.category?.name_ar || 'أخرى' : tx.category?.name_en || 'Other'}</div>
                  <div className="tx-desc">{tx.description || '-'}</div>
                  <div className="tx-date">{new Date(tx.transaction_date).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</div>
                </div>
              </div>
              <div className="tx-right">
                <div className={`tx-amount ${tx.type.toLowerCase()}`}>
                  {tx.type === 'INCOME' ? '+' : '-'} {Number(tx.amount).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} EGP
                </div>
                <form action={async (fd) => { await handleDeleteTransaction(fd) }}>
                  <input type="hidden" name="id" value={tx.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="delete-btn" title={isRTL ? 'حذف' : 'Delete'}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Transaction Modal */}
      {isAddTxOpen && (
        <div className="modal-overlay" onClick={() => setIsAddTxOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{isRTL ? 'تسجيل حركة مالية' : 'Record Transaction'}</h2>
            <form action={async (fd) => { await handleCreateTransaction(fd); setIsAddTxOpen(false); }}>
              <input type="hidden" name="locale" value={locale} />
              
              <div className="form-group">
                <label>{isRTL ? 'نوع الحركة' : 'Transaction Type'}</label>
                <select name="type" className="form-control" required defaultValue="EXPENSE">
                  <option value="EXPENSE">{isRTL ? 'مصروفات (Expense)' : 'Expense'}</option>
                  <option value="INCOME">{isRTL ? 'إيرادات (Income)' : 'Income'}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'البند / التصنيف' : 'Category'}</label>
                <select name="category_id" className="form-control" required>
                  <option value="">{isRTL ? 'اختر البند...' : 'Select Category...'}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {isRTL ? c.name_ar : c.name_en} ({c.type === 'INCOME' ? '+' : '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'المبلغ (EGP)' : 'Amount (EGP)'}</label>
                <input type="number" name="amount" className="form-control" required min="1" step="0.01" placeholder="0.00" />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'البيان / الوصف' : 'Description'}</label>
                <input type="text" name="description" className="form-control" placeholder={isRTL ? 'مثال: راتب شهر يونيو' : 'e.g., June Server Bill'} />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'تاريخ الحركة' : 'Date'}</label>
                <input type="datetime-local" name="transaction_date" className="form-control" defaultValue={new Date().toISOString().slice(0,16)} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddTxOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="btn-primary">{isRTL ? 'حفظ الحركة' : 'Save Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="modal-overlay" onClick={() => setIsAddCatOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{isRTL ? 'إضافة بند مالي جديد' : 'New Financial Category'}</h2>
            <form action={async (fd) => { await handleCreateCategory(fd); setIsAddCatOpen(false); }}>
              <input type="hidden" name="locale" value={locale} />
              
              <div className="form-group">
                <label>{isRTL ? 'النوع' : 'Type'}</label>
                <select name="type" className="form-control" required defaultValue="EXPENSE">
                  <option value="EXPENSE">{isRTL ? 'مصروفات (Expense)' : 'Expense'}</option>
                  <option value="INCOME">{isRTL ? 'إيرادات (Income)' : 'Income'}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                <input type="text" name="name_ar" className="form-control" required placeholder="مثال: عمولات تسويق" />
              </div>

              <div className="form-group">
                <label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                <input type="text" name="name_en" className="form-control" required placeholder="e.g., Marketing Commissions" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddCatOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="btn-primary">{isRTL ? 'حفظ البند' : 'Save Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
