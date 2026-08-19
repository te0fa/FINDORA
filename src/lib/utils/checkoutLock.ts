'use server'

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * يحجز القفل للـ checkout إذا لم يكن محجوزًا مسبقًا.
 * @param requestId معرف الطلب (يمكن أن يكون orderId أو sessionId)
 * @returns true إذا تم الحجز بنجاح، false إذا القفل محجوز بالفعل.
 */
export async function acquireLock(requestId: string): Promise<boolean> {
  const supabase = (await createAdminClient()) as any;
  // جرّب الإدراج؛ إذا كان موجودًا سيفشل (PK conflict)
  const { error } = await supabase
    .from('checkout_locks')
    .insert({ request_id: requestId, locked_at: new Date().toISOString() })
    .single();

  // إذا كان الخطأ بسبب تعارض المفتاح الأساسي → القفل محجوز
  if (error && (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint'))) {
    return false;
  }
  if (error) {
    console.error('[checkoutLock] Error acquiring lock:', error);
    return true; // Fail-open fallback
  }
  return true;
}

/**
 * يحرّر القفل بعد إكمال عملية الـ checkout.
 */
export async function releaseLock(requestId: string): Promise<void> {
  const supabase = (await createAdminClient()) as any;
  await supabase
    .from('checkout_locks')
    .delete()
    .eq('request_id', requestId);
}
