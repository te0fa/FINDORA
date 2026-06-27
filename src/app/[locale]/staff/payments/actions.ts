'use server';

import { revalidatePath } from 'next/cache';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import * as DAL from '@/lib/dal/payments';
import { createClient } from '@/lib/supabase/server';

async function validateStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Unauthorized');

  const staff = await getStaffMemberByAuthUserId(user.id);
  if (!staff || !staff.is_active) throw new Error('Unauthorized staff');

  const permissions = getStaffUiPermissions(staff);
  // Allow admin, owner, and anyone with financial/archive access
  if (!permissions.isAdmin && !permissions.canManageArchive && !permissions.canReport) {
    throw new Error('Insufficient permissions');
  }

  return staff;
}

export async function createPaymentIntentAction(params: {
  requestId: string;
  customerId: string;
  intentType: DAL.PaymentIntentType;
  amount: number;
  currencyCode?: string;
  paymentInstructions?: string;
  metadata?: any;
}) {
  const staff = await validateStaff();
  const intent = await DAL.createPaymentIntentAdmin({
    ...params,
    actorStaffId: staff.id
  });
  revalidatePath('/[locale]/staff/payments', 'layout');
  return intent;
}

export async function confirmPaymentAction(id: string, notes?: string, externalReference?: string) {
  const staff = await validateStaff();
  const result = await DAL.confirmPaymentIntentAdmin({
    id,
    actorStaffId: staff.id,
    notes,
    externalReference
  });
  revalidatePath('/[locale]/staff/payments', 'layout');
  return result;
}

export async function updatePaymentStatusAction(id: string, status: 'rejected' | 'cancelled', notes?: string) {
  const staff = await validateStaff();
  const result = await DAL.updatePaymentIntentStatusAdmin({
    id,
    status,
    actorStaffId: staff.id,
    notes
  });
  revalidatePath('/[locale]/staff/payments', 'layout');
  return result;
}

export async function unlockReportAction(params: {
  requestId: string;
  customerId: string;
  paymentIntentId: string;
  unlockType: 'report_full' | 'supplier_contact' | 'execution_details';
  revealText?: string;
}) {
  const staff = await validateStaff();
  const result = await DAL.unlockReportAfterPaymentAdmin({
    ...params,
    actorStaffId: staff.id
  });
  revalidatePath('/[locale]/staff/payments', 'layout');
  revalidatePath('/[locale]/staff/workspace/[request_id]', 'layout');
  return result;
}
export async function createPaymentIntentFromRequestAction(params: {
  requestId: string;
  customerId: string;
  amount: number;
}) {
  const staff = await validateStaff();
  const intent = await DAL.createPaymentIntentAdmin({
    requestId: params.requestId,
    customerId: params.customerId,
    amount: params.amount,
    intentType: 'request_fee',
    actorStaffId: staff.id,
    metadata: { source: 'needs_payment_tab' }
  });
  revalidatePath('/[locale]/staff/payments', 'layout');
  return intent;
}
