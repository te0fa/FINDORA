import { createClient } from '@/lib/supabase/server'
import { getStaffMemberByAuthUserId } from './staff'
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('DAL:finance');


export type FinancialCategory = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  name_en: string
  name_ar: string
}

export type FinancialTransaction = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  category_id: string | null
  amount: number
  currency: string
  description: string | null
  transaction_date: string
  created_by: string | null
  created_at: string
  category?: FinancialCategory
}

// -------------------------------------------------------------
// READ
// -------------------------------------------------------------

export async function getFinancialCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('financial_categories')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    log.error('Error fetching financial categories:', error)
    return []
  }
  return data as FinancialCategory[]
}

export async function getFinancialTransactions(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('financial_transactions')
    .select(`
      *,
      category:category_id (
        id, type, name_en, name_ar
      )
    `)
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('Error fetching financial transactions:', error)
    return []
  }
  return data as FinancialTransaction[]
}

export async function getFinancialSummary() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('fn_get_financial_summary')

  if (error || !data) {
    log.error('Error fetching financial summary:', error)
    return { income: 0, expense: 0, profit: 0 }
  }

  const summary = data as { income: number; expense: number; profit: number }
  const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

  return {
    income: roundToTwo(summary.income),
    expense: roundToTwo(summary.expense),
    profit: roundToTwo(summary.profit)
  }
}

// -------------------------------------------------------------
// WRITE (Admin / Accountant Only)
// -------------------------------------------------------------

export async function createFinancialCategory(payload: {
  type: 'INCOME' | 'EXPENSE'
  name_en: string
  name_ar: string
}) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('financial_categories')
    .insert([payload])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as FinancialCategory
}

export async function deleteFinancialCategory(id: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('financial_categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  return true
}

export async function createFinancialTransaction(payload: {
  type: 'INCOME' | 'EXPENSE'
  category_id: string
  amount: number
  description?: string
  transaction_date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await (supabase as any)
    .from('financial_transactions')
    .insert([{
      ...payload,
      created_by: user.id
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as FinancialTransaction
}

export async function deleteFinancialTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('financial_transactions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  return true
}
