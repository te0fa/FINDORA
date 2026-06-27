// src/lib/pricing/helpers.ts

import { 
  INTERNAL_PACKAGES, 
  REQUEST_TYPES, 
  RequestType, 
  InternalPackage,
  PaymentPolicy,
  PAYMENT_POLICIES
} from './findoraPricing';

export function getPackageByCode(requestType: RequestType, code: string): InternalPackage | undefined {
  return INTERNAL_PACKAGES[requestType]?.find(p => p.code === code);
}

export function getDefaultPaymentPolicy(requestType: RequestType, packageCode: string): PaymentPolicy {
  const pkg = getPackageByCode(requestType, packageCode);
  return pkg?.defaultPaymentPolicy || PAYMENT_POLICIES.PAY_AFTER_PREVIEW;
}

export function isPolicyAllowed(requestType: RequestType, packageCode: string, policy: PaymentPolicy): boolean {
  const pkg = getPackageByCode(requestType, packageCode);
  if (!pkg) return false;
  return pkg.allowedPaymentPolicies.includes(policy);
}

export function getPublicPaymentExplanation(requestType: RequestType, packageCode: string, locale: string = 'ar'): string {
  const pkg = getPackageByCode(requestType, packageCode);
  if (!pkg) return '';
  return locale === 'ar' ? pkg.publicPaymentExplanationAr : pkg.publicPaymentExplanationEn;
}

/**
 * Maps legacy or internal request kinds to the 3 main customer-facing categories.
 */
export function mapRequestType(kind: string): RequestType {
  if (kind === 'high_value_deals' || kind === 'big_deal') return REQUEST_TYPES.HIGH_VALUE_DEALS;
  if (kind === 'projects_supplies' || kind === 'supplies_construction') return REQUEST_TYPES.PROJECTS_SUPPLIES;
  return REQUEST_TYPES.EVERYDAY_PURCHASE;
}

export function getCategoryLabel(type: RequestType, locale: string = 'ar'): string {
  const labels: Record<RequestType, { ar: string; en: string }> = {
    [REQUEST_TYPES.EVERYDAY_PURCHASE]: { ar: 'مشتريات يومية', en: 'Everyday Purchase' },
    [REQUEST_TYPES.HIGH_VALUE_DEALS]: { ar: 'صفقات عالية القيمة', en: 'High-Value Deals' },
    [REQUEST_TYPES.PROJECTS_SUPPLIES]: { ar: 'مشاريع وتوريدات', en: 'Projects & Supplies' },
  };
  return labels[type][locale as 'ar' | 'en'] || labels[type]['ar'];
}
