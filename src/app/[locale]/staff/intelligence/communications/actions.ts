'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import * as DAL from '@/lib/dal/communication-center';

async function validateStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const staff = await getStaffMemberByAuthUserId(user.id);
  if (!staff || !staff.is_active) throw new Error('Unauthorized');

  const permissions = getStaffUiPermissions(staff);
  // Allow admin, owner, archive_manager, reporter as requested
  if (!permissions.isAdmin && !permissions.canManageArchive && !permissions.canReport) {
    throw new Error('Insufficient permissions');
  }

  return { user, staff };
}

export async function updateMessageDraftAction(params: {
  messageId: string;
  recipient?: string;
  rendered_subject?: string;
  rendered_body?: string;
  scheduled_at?: string | null;
}) {
  try {
    await validateStaff();
    const data = await DAL.updateOutboundMessageDraftAdmin(params);
    revalidatePath('/[locale]/staff/intelligence/communications', 'page');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function queueMessageAction(messageId: string) {
  try {
    const { user } = await validateStaff();
    const data = await DAL.markOutboundMessageQueuedAdmin(messageId, user.id);
    revalidatePath('/[locale]/staff/intelligence/communications', 'page');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markMessageSentManualAction(messageId: string, providerNote?: string) {
  try {
    const { user } = await validateStaff();
    const data = await DAL.markOutboundMessageSentManualAdmin(messageId, user.id, providerNote);
    revalidatePath('/[locale]/staff/intelligence/communications', 'page');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function skipMessageAction(messageId: string, reason: string) {
  try {
    const { user } = await validateStaff();
    const data = await DAL.skipOutboundMessageAdmin(messageId, user.id, reason);
    revalidatePath('/[locale]/staff/intelligence/communications', 'page');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function failMessageAction(messageId: string, reason: string) {
  try {
    const { user } = await validateStaff();
    const data = await DAL.failOutboundMessageAdmin(messageId, user.id, reason);
    revalidatePath('/[locale]/staff/intelligence/communications', 'page');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
