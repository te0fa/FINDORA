'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberByAuthUserId, getStaffUiPermissions } from '@/lib/dal/staff';
import {
  setBeachheadActive,
  updateBeachheadConfig,
  createSpecialization,
  hardDeleteSpecialization,
  reorderSpecializations
} from '@/lib/dal/specializations';

// Helper to verify that the logged-in user is an authorized staff member
async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const staff = await getStaffMemberByAuthUserId(user.id);
  const perms = staff ? getStaffUiPermissions(staff) : null;
  
  if (!perms?.isAdmin && !perms?.canManageVendors) {
    throw new Error('Forbidden: Unauthorized staff member');
  }
  return { staff, perms };
}

export async function activateBeachheadAction(id: string, locale: string) {
  await checkAuth();
  await setBeachheadActive(id);
  revalidatePath(`/${locale}/staff/intelligence/beachhead`);
  return { success: true };
}

export async function updateBeachheadAction(
  id: string,
  data: {
    priority_stars?: number;
    description_ar?: string;
    description_en?: string;
    target_merchants?: number;
    target_deals?: number;
    criteria_json?: any;
  },
  locale: string
) {
  await checkAuth();
  await updateBeachheadConfig(id, data);
  revalidatePath(`/${locale}/staff/intelligence/beachhead`);
  return { success: true };
}

export async function createCategoryAction(
  input: {
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    stars: number;
    targetMerchants: number;
    targetDeals: number;
    displayOrder: number;
  },
  locale: string
) {
  await checkAuth();

  const slug = input.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  
  const defaultCriteria = [
    { label_ar: 'أعلى تكرار شراء', label_en: 'Highest Purchase Frequency', checked: false },
    { label_ar: 'سهل التحقق من السعر', label_en: 'Easy Price Validation', checked: false },
    { label_ar: 'قاعدة تجار كبيرة', label_en: 'Large Merchant Base', checked: false },
    { label_ar: 'Price Data متاحة', label_en: 'Price Data Available', checked: false },
    { label_ar: 'Reverse Auction يشتغل أحسن', label_en: 'Reverse Auction Works Better', checked: false }
  ];

  await createSpecialization({
    slug,
    name_en: input.nameEn,
    name_ar: input.nameAr,
    parent_id: null,
    display_order: input.displayOrder
  });

  // Fetch the created category to get its ID, then set its beachhead configurations
  const supabase = await createClient() as any;
  const { data: spec } = await supabase
    .from('specializations')
    .select('id')
    .eq('slug', slug)
    .single();

  if (spec?.id) {
    await updateBeachheadConfig(spec.id, {
      priority_stars: input.stars,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      target_merchants: input.targetMerchants,
      target_deals: input.targetDeals,
      criteria_json: defaultCriteria
    });
  }

  revalidatePath(`/${locale}/staff/intelligence/beachhead`);
  return { success: true };
}

export async function deleteCategoryAction(id: string, locale: string) {
  await checkAuth();
  await hardDeleteSpecialization(id);
  revalidatePath(`/${locale}/staff/intelligence/beachhead`);
  return { success: true };
}

export async function reorderCategoriesAction(
  updates: Array<{ id: string; display_order: number }>,
  locale: string
) {
  await checkAuth();
  await reorderSpecializations(updates);
  revalidatePath(`/${locale}/staff/intelligence/beachhead`);
  return { success: true };
}
