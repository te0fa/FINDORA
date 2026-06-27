// src/lib/pricing/findoraPricing.ts

export const REQUEST_TYPES = {
  EVERYDAY_PURCHASE: 'everyday_purchase',
  HIGH_VALUE_DEALS: 'high_value_deals',
  PROJECTS_SUPPLIES: 'projects_supplies',
} as const;

export type RequestType = typeof REQUEST_TYPES[keyof typeof REQUEST_TYPES];

// Backward-compatible aliases
export const REQUEST_TYPE_ALIASES: Record<string, string> = {
  big_deal: REQUEST_TYPES.HIGH_VALUE_DEALS,
  supplies_construction: REQUEST_TYPES.PROJECTS_SUPPLIES,
  everyday_purchase: REQUEST_TYPES.EVERYDAY_PURCHASE,
};

export const PRICING_MODELS = {
  FIXED_FEE: 'fixed_fee',
  PERCENTAGE_FEE: 'percentage_fee',
  FIXED_PLUS_PERCENTAGE: 'fixed_plus_percentage',
  CUSTOM_QUOTE: 'custom_quote',
  RETAINER: 'retainer',
} as const;

export type PricingModel = typeof PRICING_MODELS[keyof typeof PRICING_MODELS];

export const PAYMENT_POLICIES = {
  PAY_AFTER_PREVIEW: 'pay_after_preview',
  UPFRONT_DEPOSIT: 'upfront_deposit',
  MILESTONE_PLAN: 'milestone_plan',
  CUSTOM_AGREEMENT: 'custom_agreement',
  RETAINER: 'retainer',
} as const;

export type PaymentPolicy = typeof PAYMENT_POLICIES[keyof typeof PAYMENT_POLICIES];

export const EFFORT_LEVELS = ['low', 'medium', 'high', 'very_high'] as const;
export const RISK_LEVELS = ['low', 'medium', 'high', 'very_high'] as const;
export const VALUE_LEVELS = ['small', 'medium', 'large', 'major', 'strategic'] as const;

export interface InternalPackage {
  code: string;
  nameEn: string;
  nameAr: string;
  basePrice?: number;
  priceRange?: string;
  defaultPaymentPolicy: PaymentPolicy;
  allowedPaymentPolicies: PaymentPolicy[];
  publicPaymentExplanationEn: string;
  publicPaymentExplanationAr: string;
  staffPaymentNotesEn: string;
  staffPaymentNotesAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const INTERNAL_PACKAGES: Record<RequestType, InternalPackage[]> = {
  [REQUEST_TYPES.EVERYDAY_PURCHASE]: [
    {
      code: 'EDP-1',
      nameEn: 'Exact Product Hunt',
      nameAr: 'بحث عن منتج محدد',
      basePrice: 299,
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Pay only after you preview the findings.',
      publicPaymentExplanationAr: 'ادفع فقط بعد معاينة النتائج.',
      staffPaymentNotesEn: 'Standard trust-based flow.',
      staffPaymentNotesAr: 'مسار الثقة القياسي.',
      descriptionEn: 'Exact product/model search, best price, trusted seller.',
      descriptionAr: 'البحث عن منتج أو موديل محدد، بأفضل سعر، من تاجر موثوق.',
    },
    {
      code: 'EDP-2',
      nameEn: 'Smart Comparison',
      nameAr: 'مقارنة ذكية',
      priceRange: '499-699',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Pay only after you preview the findings.',
      publicPaymentExplanationAr: 'ادفع فقط بعد معاينة النتائج.',
      staffPaymentNotesEn: 'Higher effort for comparison.',
      staffPaymentNotesAr: 'مجهود أكبر للمقارنة.',
      descriptionEn: 'Customer compares multiple models/options.',
      descriptionAr: 'مقارنة بين عدة موديلات أو خيارات.',
    },
    {
      code: 'EDP-3',
      nameEn: 'Bundle Purchase',
      nameAr: 'شروة منتجات',
      priceRange: '999-1499',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.MILESTONE_PLAN],
      publicPaymentExplanationEn: 'Flexible payment for multiple items.',
      publicPaymentExplanationAr: 'دفع مرن لعدة منتجات.',
      staffPaymentNotesEn: 'Consider milestone for large bundles.',
      staffPaymentNotesAr: 'فكر في نظام المراحل للشروات الكبيرة.',
      descriptionEn: 'Multiple items or simple home setup.',
      descriptionAr: 'عدة منتجات أو تجهيز منزلي بسيط.',
    },
    {
      code: 'EDP-4',
      nameEn: 'Urgent Hunt',
      nameAr: 'بحث عاجل',
      descriptionEn: '+50% on base fee. Urgent request within ~24 hours.',
      descriptionAr: '+50% على الرسوم الأساسية. طلب عاجل خلال 24 ساعة تقريباً.',
      defaultPaymentPolicy: PAYMENT_POLICIES.UPFRONT_DEPOSIT,
      allowedPaymentPolicies: [PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.PAY_AFTER_PREVIEW],
      publicPaymentExplanationEn: 'Upfront deposit required for priority handling.',
      publicPaymentExplanationAr: 'مطلوب عربون مقدم للتعامل مع الطلب بصفة عاجلة.',
      staffPaymentNotesEn: 'Justify urgency if choosing pay_after_preview.',
      staffPaymentNotesAr: 'يجب تبرير العجلة في حالة اختيار الدفع بعد المعاينة.',
    }
  ],
  [REQUEST_TYPES.HIGH_VALUE_DEALS]: [
    {
      code: 'BD-1',
      nameEn: 'High-Value Review',
      nameAr: 'مراجعة صفقة عالية القيمة',
      priceRange: 'starts from 1500',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Review the deal first, then pay to unlock details.',
      publicPaymentExplanationAr: 'راجع الصفقة أولاً، ثم ادفع لفتح التفاصيل.',
      staffPaymentNotesEn: 'Standard for initial high-value reviews.',
      staffPaymentNotesAr: 'قياسي للمراجعات الأولية عالية القيمة.',
      descriptionEn: 'Initial comparison or review of high-value purchase.',
      descriptionAr: 'مقارنة أولية أو مراجعة لعملية شراء عالية القيمة.',
    },
    {
      code: 'BD-2',
      nameEn: 'Deep Comparison',
      nameAr: 'مقارنة عميقة',
      priceRange: '3500-7500',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Detailed findings preview available before payment.',
      publicPaymentExplanationAr: 'معاينة للنتائج التفصيلية متاحة قبل الدفع.',
      staffPaymentNotesEn: 'Use upfront_deposit if effort/risk is high.',
      staffPaymentNotesAr: 'استخدم العربون المقدم إذا كان المجهود أو المخاطرة عالية.',
      descriptionEn: 'Detailed comparison of high-value options.',
      descriptionAr: 'مقارنة تفصيلية لخيارات عالية القيمة.',
    },
    {
      code: 'BD-3',
      nameEn: 'Negotiation Support',
      nameAr: 'دعم التفاوض',
      priceRange: 'starts from 3000',
      defaultPaymentPolicy: PAYMENT_POLICIES.UPFRONT_DEPOSIT,
      allowedPaymentPolicies: [PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.CUSTOM_AGREEMENT],
      publicPaymentExplanationEn: 'Deposit required to start active negotiation.',
      publicPaymentExplanationAr: 'مطلوب عربون لبدء التفاوض الفعلي.',
      staffPaymentNotesEn: 'Active intervention requires commitment.',
      staffPaymentNotesAr: 'التدخل النشط يتطلب التزاماً.',
      descriptionEn: 'Seller communication, negotiation preparation, better terms.',
      descriptionAr: 'التواصل مع البائع، التحضير للتفاوض، شروط أفضل.',
    },
    {
      code: 'BD-4',
      nameEn: 'Deal Coordination',
      nameAr: 'تنسيق الصفقة',
      descriptionEn: 'Percentage-based coordination for major deals.',
      descriptionAr: 'تنسيق صفقات كبرى بنسبة مئوية.',
      defaultPaymentPolicy: PAYMENT_POLICIES.MILESTONE_PLAN,
      allowedPaymentPolicies: [PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.CUSTOM_AGREEMENT],
      publicPaymentExplanationEn: 'Milestone-based fees during deal lifecycle.',
      publicPaymentExplanationAr: 'رسوم على مراحل خلال دورة حياة الصفقة.',
      staffPaymentNotesEn: 'Coordinate with finance for large percentages.',
      staffPaymentNotesAr: 'نسق مع المالية للنسب المئوية الكبيرة.',
    },
    {
      code: 'BD-5',
      nameEn: 'Premium Case',
      nameAr: 'حالة مميزة (Premium)',
      defaultPaymentPolicy: PAYMENT_POLICIES.CUSTOM_AGREEMENT,
      allowedPaymentPolicies: [PAYMENT_POLICIES.CUSTOM_AGREEMENT, PAYMENT_POLICIES.MILESTONE_PLAN],
      publicPaymentExplanationEn: 'Customized payment terms for strategic cases.',
      publicPaymentExplanationAr: 'شروط دفع مخصصة للحالات الاستراتيجية.',
      staffPaymentNotesEn: 'Requires owner approval.',
      staffPaymentNotesAr: 'يتطلب موافقة المالك.',
      descriptionEn: 'Complex, sensitive, high-risk, or strategic deals.',
      descriptionAr: 'صفقات معقدة، حساسة، عالية المخاطرة أو استراتيجية.',
    }
  ],
  [REQUEST_TYPES.PROJECTS_SUPPLIES]: [
    {
      code: 'SC-1',
      nameEn: 'Materials Hunt',
      nameAr: 'بحث عن خامات',
      priceRange: '699-1499',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Pay only after you preview material sources.',
      publicPaymentExplanationAr: 'ادفع فقط بعد معاينة مصادر الخامات.',
      staffPaymentNotesEn: 'Standard sourcing logic.',
      staffPaymentNotesAr: 'منطق توريد قياسي.',
      descriptionEn: 'One material/item/supplier comparison.',
      descriptionAr: 'مقارنة لنوع واحد من الخامات أو مورد واحد.',
    },
    {
      code: 'SC-2',
      nameEn: 'Multi-Item Materials List',
      nameAr: 'قائمة خامات متعددة',
      priceRange: '1499-3500',
      defaultPaymentPolicy: PAYMENT_POLICIES.PAY_AFTER_PREVIEW,
      allowedPaymentPolicies: [PAYMENT_POLICIES.PAY_AFTER_PREVIEW, PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.MILESTONE_PLAN],
      publicPaymentExplanationEn: 'Review the list findings before payment.',
      publicPaymentExplanationAr: 'راجع نتائج القائمة قبل الدفع.',
      staffPaymentNotesEn: 'Can move to upfront if scope is very large.',
      staffPaymentNotesAr: 'يمكن التحول للعربون المقدم إذا كان النطاق كبيراً جداً.',
      descriptionEn: 'Multiple items from a list.',
      descriptionAr: 'عدة أصناف من قائمة خامات.',
    },
    {
      code: 'SC-3',
      nameEn: 'Room / Shop Package',
      nameAr: 'باقة غرفة / محل',
      priceRange: '2500-7500',
      defaultPaymentPolicy: PAYMENT_POLICIES.UPFRONT_DEPOSIT,
      allowedPaymentPolicies: [PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.PAY_AFTER_PREVIEW],
      publicPaymentExplanationEn: 'Deposit required for comprehensive sourcing.',
      publicPaymentExplanationAr: 'مطلوب عربون للبحث الشامل.',
      staffPaymentNotesEn: 'High operational effort.',
      staffPaymentNotesAr: 'مجهود تشغيلي عالي.',
      descriptionEn: 'Sourcing for a complete room or shop section.',
      descriptionAr: 'البحث عن مستلزمات غرفة كاملة أو جزء من محل.',
    },
    {
      code: 'SC-4',
      nameEn: 'Supplier Sourcing',
      nameAr: 'البحث عن موردين',
      priceRange: 'starts from 2500 + %',
      defaultPaymentPolicy: PAYMENT_POLICIES.UPFRONT_DEPOSIT,
      allowedPaymentPolicies: [PAYMENT_POLICIES.UPFRONT_DEPOSIT, PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.CUSTOM_AGREEMENT],
      publicPaymentExplanationEn: 'Commitment required for professional sourcing.',
      publicPaymentExplanationAr: 'مطلوب التزام للبحث الاحترافي.',
      staffPaymentNotesEn: 'Includes merchant verification.',
      staffPaymentNotesAr: 'يشمل التحقق من التجار.',
      descriptionEn: 'Detailed supplier sourcing and comparison.',
      descriptionAr: 'البحث المفصل عن الموردين والمقارنة بينهم.',
    },
    {
      code: 'SC-5',
      nameEn: 'Construction / Finishing Scope',
      nameAr: 'نطاق بناء وتشطيبات',
      defaultPaymentPolicy: PAYMENT_POLICIES.MILESTONE_PLAN,
      allowedPaymentPolicies: [PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.CUSTOM_AGREEMENT, PAYMENT_POLICIES.UPFRONT_DEPOSIT],
      publicPaymentExplanationEn: 'Payment by project milestones.',
      publicPaymentExplanationAr: 'الدفع على مراحل المشروع.',
      staffPaymentNotesEn: 'Define milestones clearly.',
      staffPaymentNotesAr: 'حدد المراحل بوضوح.',
      descriptionEn: 'Large scope construction or finishing procurement.',
      descriptionAr: 'توريدات بناء أو تشطيبات لنطاق واسع.',
    },
    {
      code: 'SC-6',
      nameEn: 'Business Supply Contract',
      nameAr: 'تعاقد توريدات أعمال',
      defaultPaymentPolicy: PAYMENT_POLICIES.MILESTONE_PLAN,
      allowedPaymentPolicies: [PAYMENT_POLICIES.MILESTONE_PLAN, PAYMENT_POLICIES.RETAINER, PAYMENT_POLICIES.CUSTOM_AGREEMENT],
      publicPaymentExplanationEn: 'Continuous support via milestones or retainer.',
      publicPaymentExplanationAr: 'دعم مستمر عبر مراحل أو نظام اشتراك.',
      staffPaymentNotesEn: 'Strategic partnership.',
      staffPaymentNotesAr: 'شراكة استراتيجية.',
      descriptionEn: 'Ongoing supply sourcing for business needs.',
      descriptionAr: 'توريدات مستمرة لاحتياجات الأعمال.',
    }
  ]
};

