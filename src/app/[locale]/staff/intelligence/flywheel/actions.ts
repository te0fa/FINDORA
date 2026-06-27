'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import {
  createFlywheelStage,
  updateFlywheelStage,
  deleteFlywheelStage,
  reorderFlywheelStages
} from '@/lib/dal/flywheel';

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const staff = await getStaffMemberByAuthUserId(user.id);
  const perms = staff ? getStaffUiPermissions(staff) : null;
  
  if (!perms?.isAdmin && !perms?.canAccessDashboard) {
    throw new Error('Forbidden: Unauthorized staff member');
  }
  return { staff, perms };
}

export async function createFlywheelStageAction(
  input: {
    nameEn: string;
    nameAr: string;
    metricKey: string;
    targetValue: number;
    displayOrder: number;
  },
  locale: string
) {
  await checkAuth();

  const slug = input.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  await createFlywheelStage({
    slug,
    name_en: input.nameEn,
    name_ar: input.nameAr,
    metric_key: input.metricKey,
    target_value: input.targetValue,
    display_order: input.displayOrder
  });

  revalidatePath(`/${locale}/staff/intelligence/flywheel`);
  return { success: true };
}

export async function updateFlywheelStageAction(
  id: string,
  data: {
    name_en?: string;
    name_ar?: string;
    current_value?: number;
    target_value?: number;
  },
  locale: string
) {
  await checkAuth();
  await updateFlywheelStage(id, data);
  revalidatePath(`/${locale}/staff/intelligence/flywheel`);
  return { success: true };
}

export async function deleteFlywheelStageAction(id: string, locale: string) {
  await checkAuth();
  await deleteFlywheelStage(id);
  revalidatePath(`/${locale}/staff/intelligence/flywheel`);
  return { success: true };
}

export async function reorderFlywheelStagesAction(
  updates: Array<{ id: string; display_order: number }>,
  locale: string
) {
  await checkAuth();
  await reorderFlywheelStages(updates);
  revalidatePath(`/${locale}/staff/intelligence/flywheel`);
  return { success: true };
}
