'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createFinancialTransaction, createFinancialCategory, deleteFinancialTransaction, deleteFinancialCategory } from '@/lib/dal/finance'

export async function handleCreateTransaction(formData: FormData) {
  const locale = formData.get('locale') as string || 'en'
  const type = formData.get('type') as 'INCOME' | 'EXPENSE'
  const category_id = formData.get('category_id') as string
  const amountStr = formData.get('amount') as string
  const description = formData.get('description') as string
  const transaction_date = formData.get('transaction_date') as string || new Date().toISOString()

  const amount = Number(amountStr)
  if (!amount || amount <= 0) return { error: 'Invalid amount' }
  if (!category_id) return { error: 'Category required' }

  try {
    await createFinancialTransaction({
      type, category_id, amount, description, transaction_date
    })
    revalidatePath(`/${locale}/staff/finance/transactions`)
    revalidatePath(`/${locale}/staff/dashboard`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function handleDeleteTransaction(formData: FormData) {
  const id = formData.get('id') as string
  const locale = formData.get('locale') as string || 'en'

  if (!id) return { error: 'Missing ID' }

  try {
    await deleteFinancialTransaction(id)
    revalidatePath(`/${locale}/staff/finance/transactions`)
    revalidatePath(`/${locale}/staff/dashboard`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function handleCreateCategory(formData: FormData) {
  const locale = formData.get('locale') as string || 'en'
  const type = formData.get('type') as 'INCOME' | 'EXPENSE'
  const name_en = formData.get('name_en') as string
  const name_ar = formData.get('name_ar') as string

  if (!name_en || !name_ar) return { error: 'Names required' }

  try {
    await createFinancialCategory({ type, name_en, name_ar })
    revalidatePath(`/${locale}/staff/finance/transactions`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
