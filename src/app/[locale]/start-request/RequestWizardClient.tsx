'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeature } from '@/lib/feature-flags/useFeature'
import ReviewScreen from './ReviewScreen'
import ReturningCustomerStep, { type ReusedRequestData } from './ReturningCustomerStep'
import type { AIExtractedData } from '@/lib/intelligence/ai-concierge-agent'
import { Modal } from '@/components/ui/Overlays'

// ─── Step Constants ───────────────────────────────────────────────────────────
const STEP_RETURNING  = 0   // Phase 3: Optional returning-customer lookup (feature-flag gated)
const STEP_CATEGORY   = 1   // Category picker + AI concierge input
const STEP_REVIEW     = 15  // AI Review (inserted between AI and details)
const STEP_DETAILS    = 2   // Manual product details
const STEP_LOCATION   = 3   // Location + budget
const STEP_INTAKE     = 4   // Name + phone (contact step)

// ─── Web Speech API types ─────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    interimResults: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
  }
}

interface FieldDefinition {
  key: string
  labelAr: string
  labelEn: string
  type: 'text' | 'select' | 'number'
  options?: { value: string; labelAr: string; labelEn: string }[]
  required?: boolean
  placeholderAr?: string
  placeholderEn?: string
}

// ─── Categories & Subcategories Constants ─────────────────────────────────────
const SUBCATEGORIES_MAP: Record<string, { id: string; labelAr: string; labelEn: string; icon?: string }[]> = {
  electronics: [
    { id: 'mobiles', labelAr: 'موبايلات وهواتف ذكية', labelEn: 'Mobiles & Smartphones', icon: '📱' },
    { id: 'laptops', labelAr: 'أجهزة لابتوب وكمبيوتر', labelEn: 'Laptops & Computers', icon: '💻' },
    { id: 'gaming', labelAr: 'ألعاب فيديو جيم وكونسول', labelEn: 'Video Games & Consoles', icon: '🎮' },
    { id: 'audio_video', labelAr: 'صوتيات ومرئيات وسماعات', labelEn: 'Audio & Video', icon: '🎧' },
    { id: 'other_elec', labelAr: 'إلكترونيات أخرى', labelEn: 'Other Electronics', icon: '🔌' },
  ],
  appliances: [
    { id: 'refrigerator', labelAr: 'ثلاجات وديب فريزر', labelEn: 'Refrigerators & Freezers', icon: '❄️' },
    { id: 'washing_machine', labelAr: 'غسالات ومجففات ملابس', labelEn: 'Washing Machines & Dryers', icon: '🧺' },
    { id: 'ac', labelAr: 'تكييفات وأجهزة تبريد', labelEn: 'Air Conditioners & Cooling', icon: '💨' },
    { id: 'stove_oven', labelAr: 'بوتاجازات وأفران', labelEn: 'Stoves & Ovens', icon: '🔥' },
    { id: 'other_appliances', labelAr: 'أجهزة منزلية أخرى', labelEn: 'Other Home Appliances', icon: '🏠' },
  ],
  automotive: [
    { id: 'cars', labelAr: 'سيارات', labelEn: 'Cars', icon: '🚗' },
    { id: 'spare_parts', labelAr: 'قطع غيار سيارات', labelEn: 'Spare Parts', icon: '⚙️' },
    { id: 'accessories', labelAr: 'إكسسوارات كماليات سيارات', labelEn: 'Car Accessories', icon: '🏎️' },
  ],
  furniture: [
    { id: 'living_room', labelAr: 'أثاث غرفة المعيشة وصالونات', labelEn: 'Living Room Furniture', icon: '🛋️' },
    { id: 'bedroom', labelAr: 'غرف نوم وأسرة', labelEn: 'Bedroom Furniture', icon: '🛏️' },
    { id: 'kitchen', labelAr: 'مطابخ وخزائن', labelEn: 'Kitchen Cabinets', icon: '🍳' },
    { id: 'office', labelAr: 'أثاث مكتبي وللعمل', labelEn: 'Office Furniture', icon: '🗄️' },
    { id: 'other_furniture', labelAr: 'أثاث وديكورات أخرى', labelEn: 'Other Furniture & Decor', icon: '🪑' },
  ],
  fashion: [
    { id: 'clothing', labelAr: 'ملابس وأزياء', labelEn: 'Clothing & Apparel', icon: '👕' },
    { id: 'shoes', labelAr: 'أحذية', labelEn: 'Shoes & Footwear', icon: '👟' },
    { id: 'watches_accessories', labelAr: 'ساعات وإكسسوارات', labelEn: 'Watches & Accessories', icon: '⌚' },
  ],
  real_estate: [
    { id: 'apartments', labelAr: 'شقق سكنية', labelEn: 'Apartments', icon: '🏢' },
    { id: 'villas', labelAr: 'فيلات وتاون هاوس', labelEn: 'Villas & Townhouses', icon: '🏡' },
    { id: 'commercial', labelAr: 'عقارات ومكاتب تجارية', labelEn: 'Commercial & Offices', icon: '🏬' },
    { id: 'lands', labelAr: 'أراضي', labelEn: 'Lands', icon: '🪵' },
  ],
  services: [
    { id: 'finishing', labelAr: 'تشطيب وديكور داخلي متكامل', labelEn: 'Interior Finishing & Decor', icon: '🎨' },
    { id: 'plumbing', labelAr: 'خدمات وأعمال سباكة', labelEn: 'Plumbing Services', icon: '🚰' },
    { id: 'electrical', labelAr: 'أعمال وتمديدات كهربائية', labelEn: 'Electrical Work', icon: '⚡' },
    { id: 'carpentry', labelAr: 'أعمال نجارة وتصنيع أثاث', labelEn: 'Carpentry & Woodwork', icon: '🪵' },
    { id: 'other_services', labelAr: 'خدمات وتشطيبات أخرى', labelEn: 'Other Services', icon: '🔧' },
  ]
}

const SUBCATEGORY_FIELDS: Record<string, {
  labelAr: string
  labelEn: string
  fields: FieldDefinition[]
}> = {
  mobiles: {
    labelAr: 'موبايلات',
    labelEn: 'Mobiles',
    fields: [
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text', placeholderAr: 'مثال: Apple, Samsung', placeholderEn: 'e.g. Apple, Samsung', required: true },
      { key: 'model', labelAr: 'الموديل', labelEn: 'Model', type: 'text', placeholderAr: 'مثال: iPhone 15 Pro Max', placeholderEn: 'e.g. iPhone 15 Pro Max', required: true },
      { key: 'storage', labelAr: 'سعة التخزين', labelEn: 'Storage', type: 'select', options: [
        { value: '64gb', labelAr: '64 جيجابايت', labelEn: '64 GB' },
        { value: '128gb', labelAr: '128 جيجابايت', labelEn: '128 GB' },
        { value: '256gb', labelAr: '256 جيجابايت', labelEn: '256 GB' },
        { value: '512gb', labelAr: '512 جيجابايت', labelEn: '512 GB' },
        { value: '1tb', labelAr: '1 تيرابايت', labelEn: '1 TB' }
      ], required: true },
      { key: 'ram', labelAr: 'الرامات (الذاكرة العشوائية)', labelEn: 'RAM', type: 'select', options: [
        { value: '4gb', labelAr: '4 جيجا', labelEn: '4 GB' },
        { value: '6gb', labelAr: '6 جيجا', labelEn: '6 GB' },
        { value: '8gb', labelAr: '8 جيجا', labelEn: '8 GB' },
        { value: '12gb', labelAr: '12 جيجا', labelEn: '12 GB' },
        { value: '16gb', labelAr: '16 جيجا', labelEn: '16 GB' }
      ] },
      { key: 'color', labelAr: 'اللون المفضل', labelEn: 'Preferred Color', type: 'text', placeholderAr: 'مثال: تيتانيوم طبيعي', placeholderEn: 'e.g. Natural Titanium' },
      { key: 'condition', labelAr: 'حالة الجهاز', labelEn: 'Condition', type: 'select', options: [
        { value: 'new', labelAr: 'جديد بضمان', labelEn: 'New with Warranty' },
        { value: 'used', labelAr: 'مستعمل بحالة جيدة', labelEn: 'Used (Good condition)' },
        { value: 'any', labelAr: 'أي حالة', labelEn: 'Any Condition' }
      ] }
    ]
  },
  laptops: {
    labelAr: 'لابتوب وكمبيوتر',
    labelEn: 'Laptops & Computers',
    fields: [
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text', placeholderAr: 'مثال: Dell, Lenovo, Apple', placeholderEn: 'e.g. Dell, Lenovo, Apple', required: true },
      { key: 'processor', labelAr: 'المعالج (CPU)', labelEn: 'Processor (CPU)', type: 'text', placeholderAr: 'مثال: Core i7 13th Gen, Apple M2', placeholderEn: 'e.g. Core i7 13th Gen, Apple M2' },
      { key: 'ram', labelAr: 'الرامات (RAM)', labelEn: 'RAM', type: 'select', options: [
        { value: '8gb', labelAr: '8 جيجابايت', labelEn: '8 GB' },
        { value: '16gb', labelAr: '16 جيجابايت', labelEn: '16 GB' },
        { value: '32gb', labelAr: '32 جيجابايت', labelEn: '32 GB' },
        { value: '64gb', labelAr: '64 جيجابايت', labelEn: '64 GB' }
      ], required: true },
      { key: 'storage', labelAr: 'سعة القرص الصلب', labelEn: 'Storage (SSD/HDD)', type: 'text', placeholderAr: 'مثال: 512GB SSD', placeholderEn: 'e.g. 512GB SSD' },
      { key: 'gpu', labelAr: 'كارت الشاشة (GPU)', labelEn: 'Graphics Card (GPU)', type: 'text', placeholderAr: 'مثال: RTX 4060, Integrated', placeholderEn: 'e.g. RTX 4060, Integrated' },
      { key: 'condition', labelAr: 'الحالة', labelEn: 'Condition', type: 'select', options: [
        { value: 'new', labelAr: 'جديد', labelEn: 'New' },
        { value: 'used', labelAr: 'مستعمل', labelEn: 'Used' }
      ] }
    ]
  },
  refrigerator: {
    labelAr: 'ثلاجات وديب فريزر',
    labelEn: 'Refrigerators & Freezers',
    fields: [
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text', placeholderAr: 'مثال: LG, Sharp, Beko', placeholderEn: 'e.g. LG, Sharp, Beko', required: true },
      { key: 'capacity', labelAr: 'السعة (بالقدم أو اللتر)', labelEn: 'Capacity (Feet/Liters)', type: 'text', placeholderAr: 'مثال: 18 قدم / 450 لتر', placeholderEn: 'e.g. 18 Feet / 450 Liters' },
      { key: 'color', labelAr: 'اللون المفضل', labelEn: 'Preferred Color', type: 'text', placeholderAr: 'مثال: سيلفر / أسود ديجيتال', placeholderEn: 'e.g. Silver / Black Digital' }
    ]
  },
  ac: {
    labelAr: 'تكييفات',
    labelEn: 'Air Conditioners',
    fields: [
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text', placeholderAr: 'مثال: Carrier, Sharp, LG', placeholderEn: 'e.g. Carrier, Sharp, LG', required: true },
      { key: 'power', labelAr: 'قوة التكييف (حصان)', labelEn: 'Power (Horsepower)', type: 'select', options: [
        { value: '1.5hp', labelAr: '1.5 حصان', labelEn: '1.5 HP' },
        { value: '2.25hp', labelAr: '2.25 حصان', labelEn: '2.25 HP' },
        { value: '3hp', labelAr: '3 حصان', labelEn: '3 HP' },
        { value: 'other', labelAr: 'أكبر من ذلك', labelEn: 'Higher' }
      ], required: true },
      { key: 'inverter', labelAr: 'تكنولوجيا الانفرتر الموفرة؟', labelEn: 'Inverter Technology?', type: 'select', options: [
        { value: 'yes', labelAr: 'نعم (انفرتر)', labelEn: 'Yes (Inverter)' },
        { value: 'no', labelAr: 'لا (عادي)', labelEn: 'No (Standard)' },
        { value: 'any', labelAr: 'لا يهم', labelEn: 'Does not matter' }
      ] }
    ]
  },
  cars: {
    labelAr: 'سيارات',
    labelEn: 'Cars',
    fields: [
      { key: 'brand', labelAr: 'ماركة السيارة (الصانع)', labelEn: 'Car Brand (Make)', type: 'text', placeholderAr: 'مثال: Toyota, Hyundai', placeholderEn: 'e.g. Toyota, Hyundai', required: true },
      { key: 'model', labelAr: 'الموديل', labelEn: 'Model', type: 'text', placeholderAr: 'مثال: Corolla, Elantra', placeholderEn: 'e.g. Corolla, Elantra', required: true },
      { key: 'year', labelAr: 'سنة الصنع (الموديل)', labelEn: 'Year of Manufacture', type: 'number', placeholderAr: 'مثال: 2023', placeholderEn: 'e.g. 2023' },
      { key: 'transmission', labelAr: 'ناقل الحركة', labelEn: 'Transmission', type: 'select', options: [
        { value: 'automatic', labelAr: 'أوتوماتيك', labelEn: 'Automatic' },
        { value: 'manual', labelAr: 'مانيوال / يدوي', labelEn: 'Manual' }
      ] },
      { key: 'condition', labelAr: 'الحالة', labelEn: 'Condition', type: 'select', options: [
        { value: 'new', labelAr: 'جديد زيرو', labelEn: 'New (Zero)' },
        { value: 'used', labelAr: 'مستعمل', labelEn: 'Used' }
      ] }
    ]
  },
  apartments: {
    labelAr: 'شقق',
    labelEn: 'Apartments',
    fields: [
      { key: 'size', labelAr: 'المساحة (بالمتر المربع)', labelEn: 'Size (Sqm)', type: 'number', placeholderAr: 'مثال: 120', placeholderEn: 'e.g. 120', required: true },
      { key: 'rooms', labelAr: 'عدد الغرف', labelEn: 'Number of Rooms', type: 'number', placeholderAr: 'مثال: 3', placeholderEn: 'e.g. 3' },
      { key: 'finishing', labelAr: 'نوع التشطيب', labelEn: 'Finishing Type', type: 'select', options: [
        { value: 'core_shell', labelAr: 'طوب أحمر / بدون تشطيب', labelEn: 'Core & Shell' },
        { value: 'semi_finished', labelAr: 'نصف تشطيب (محارة وحلوق)', labelEn: 'Semi-finished' },
        { value: 'finished', labelAr: 'تشطيب كامل / سوبر لوكس', labelEn: 'Fully finished' },
        { value: 'ultra_lux', labelAr: 'ألترا سوبر لوكس', labelEn: 'Ultra Super Lux' }
      ] },
      { key: 'purpose', labelAr: 'الغرض', labelEn: 'Purpose', type: 'select', options: [
        { value: 'buy', labelAr: 'شراء / تمليك', labelEn: 'Buy' },
        { value: 'rent', labelAr: 'إيجار', labelEn: 'Rent' }
      ], required: true }
    ]
  },
  clothing: {
    labelAr: 'ملابس وأزياء',
    labelEn: 'Clothing & Apparel',
    fields: [
      { key: 'brand', labelAr: 'الماركة (اختياري)', labelEn: 'Brand (Optional)', type: 'text', placeholderAr: 'مثال: Zara, Nike', placeholderEn: 'e.g. Zara, Nike' },
      { key: 'type', labelAr: 'نوع الملابس', labelEn: 'Type of Clothing', type: 'text', placeholderAr: 'مثال: بدلة رجالي، فستان سهرة، جاكيت', placeholderEn: 'e.g. Men suit, Evening dress, Jacket', required: true },
      { key: 'size', labelAr: 'المقاس', labelEn: 'Size', type: 'select', options: [
        { value: 's', labelAr: 'Small (S)', labelEn: 'Small (S)' },
        { value: 'm', labelAr: 'Medium (M)', labelEn: 'Medium (M)' },
        { value: 'l', labelAr: 'Large (L)', labelEn: 'Large (L)' },
        { value: 'xl', labelAr: 'X-Large (XL)', labelEn: 'X-Large (XL)' },
        { value: 'xxl', labelAr: 'XX-Large (XXL)', labelEn: 'XX-Large (XXL)' }
      ], required: true },
      { key: 'color', labelAr: 'اللون', labelEn: 'Color', type: 'text', placeholderAr: 'مثال: كحلي / أسود', placeholderEn: 'e.g. Navy / Black' }
    ]
  },
  finishing: {
    labelAr: 'تشطيب وديكور داخلي',
    labelEn: 'Interior Finishing',
    fields: [
      { key: 'project_type', labelAr: 'نوع الوحدة', labelEn: 'Unit Type', type: 'select', options: [
        { value: 'apartment', labelAr: 'شقة سكنية', labelEn: 'Residential Apartment' },
        { value: 'villa', labelAr: 'فيلا', labelEn: 'Villa' },
        { value: 'office', labelAr: 'مكتب / مقر إداري', labelEn: 'Office / Corporate' },
        { value: 'store', labelAr: 'محل تجاري', labelEn: 'Retail Store' }
      ], required: true },
      { key: 'area_size', labelAr: 'المساحة المراد تشطيبها (متر مربع)', labelEn: 'Area Size (Sqm)', type: 'number', placeholderAr: 'مثال: 150', placeholderEn: 'e.g. 150', required: true },
      { key: 'style', labelAr: 'نمط الديكور المفضل', labelEn: 'Preferred Style', type: 'select', options: [
        { value: 'modern', labelAr: 'مودرن / حديث', labelEn: 'Modern' },
        { value: 'classic', labelAr: 'كلاسيك / كلاسيكي', labelEn: 'Classic' },
        { value: 'neo_classic', labelAr: 'نيو كلاسيك', labelEn: 'Neo-classic' },
        { value: 'industrial', labelAr: 'صناعي / مودرن صناعي', labelEn: 'Industrial' }
      ] }
    ]
  }
}

const GENERAL_FIELDS: FieldDefinition[] = [
  { key: 'brand', labelAr: 'الماركة (اختياري)', labelEn: 'Brand (Optional)', type: 'text', placeholderAr: 'مثال: Samsung', placeholderEn: 'e.g. Samsung' },
  { key: 'condition', labelAr: 'الحالة', labelEn: 'Condition', type: 'select', options: [
    { value: 'new', labelAr: 'جديد', labelEn: 'New' },
    { value: 'used', labelAr: 'مستعمل', labelEn: 'Used' },
    { value: 'any', labelAr: 'أي حالة', labelEn: 'Any' }
  ] },
  { key: 'color', labelAr: 'اللون (اختياري)', labelEn: 'Color (Optional)', type: 'text', placeholderAr: 'مثال: أسود', placeholderEn: 'e.g. Black' },
  { key: 'size', labelAr: 'المقاس / الحجم (اختياري)', labelEn: 'Size / Dimensions (Optional)', type: 'text', placeholderAr: 'مثال: XL أو 65 بوصة', placeholderEn: 'e.g. XL or 65 inch' }
]

interface AdvancedQuestionDefinition {
  key: string
  labelAr: string
  labelEn: string
  type: 'text' | 'select'
  options?: { value: string; labelAr: string; labelEn: string }[]
  placeholderAr?: string
  placeholderEn?: string
}

const SUBCATEGORY_ADVANCED_QUESTIONS: Record<string, AdvancedQuestionDefinition[]> = {
  mobiles: [
    {
      key: 'accessories',
      labelAr: 'الملحقات والإكسسوارات المطلوبة',
      labelEn: 'Required Accessories',
      type: 'select',
      options: [
        { value: 'device_only', labelAr: 'الجهاز فقط', labelEn: 'Device Only' },
        { value: 'with_charger', labelAr: 'مع شاحن كامل وسماعة رأس', labelEn: 'With charger & headset' },
        { value: 'full_bundle', labelAr: 'باقة كاملة (لاصقة حماية وغطاء)', labelEn: 'Full bundle (screen protector & cover)' }
      ]
    },
    {
      key: 'sim_support',
      labelAr: 'دعم الشرائح والشبكات',
      labelEn: 'SIM & Network Support',
      type: 'select',
      options: [
        { value: 'any', labelAr: 'أي نسخة شريحة', labelEn: 'Any SIM version' },
        { value: 'dual_physical', labelAr: 'شريحتين اتصال فعليتين (Dual SIM)', labelEn: 'Dual Physical SIM' },
        { value: 'esim', labelAr: 'شريحة إلكترونية مدمجة (eSIM)', labelEn: 'eSIM support' }
      ]
    },
    {
      key: 'origin_pref',
      labelAr: 'نسخة الجهاز الإقليمية المفضلة',
      labelEn: 'Preferred Regional Version',
      type: 'select',
      options: [
        { value: 'any', labelAr: 'لا يهم / أي نسخة', labelEn: 'Does not matter' },
        { value: 'local_warranty', labelAr: 'نسخة محلية بضمان الوكيل الرسمي', labelEn: 'Local official agent warranty' },
        { value: 'international', labelAr: 'نسخة دولية (سعر أرخص)', labelEn: 'International version (better price)' }
      ]
    }
  ],
  cars: [
    {
      key: 'car_history',
      labelAr: 'الحالة وتاريخ الحوادث المقبول',
      labelEn: 'Acceptable Vehicle History',
      type: 'select',
      options: [
        { value: 'no_accidents', labelAr: 'خالية تماماً من الرش والحوادث (فابريكا)', labelEn: 'Factory paint, no accidents' },
        { value: 'minor_scratches', labelAr: 'مقبول رش أجزاء بسيطة للنظافة', labelEn: 'Minor cosmetic paint accepted' },
        { value: 'any', labelAr: 'أي حالة فنية نظيفة', labelEn: 'Any clean technical status' }
      ]
    },
    {
      key: 'fuel_type',
      labelAr: 'نوع الوقود المفضل',
      labelEn: 'Preferred Fuel Type',
      type: 'select',
      options: [
        { value: 'gasoline', labelAr: 'بنزين / غازولين', labelEn: 'Gasoline' },
        { value: 'diesel', labelAr: 'ديزل / سولار', labelEn: 'Diesel' },
        { value: 'electric_hybrid', labelAr: 'كهربائية بالكامل أو هجينة (Hybrid)', labelEn: 'Electric / Hybrid' }
      ]
    },
    {
      key: 'interior_color',
      labelAr: 'لون وتنجيد فرش السيارة المفضل',
      labelEn: 'Preferred Interior/Seat Color & Material',
      type: 'text',
      placeholderAr: 'مثال: جلد جملي، أو قماش أسود',
      placeholderEn: 'e.g. Camel leather, black fabric'
    }
  ],
  apartments: [
    {
      key: 'payment_plan',
      labelAr: 'طريقة الدفع والسداد المقبولة',
      labelEn: 'Acceptable Payment & Installments',
      type: 'select',
      options: [
        { value: 'cash_only', labelAr: 'كاش بالكامل دفعة واحدة', labelEn: 'Cash only' },
        { value: 'installments', labelAr: 'تقسيط (مقدم + دفعات متساوية)', labelEn: 'Installments (downpayment + terms)' },
        { value: 'any', labelAr: 'أي نظام متاح', labelEn: 'Any plan' }
      ]
    },
    {
      key: 'floor_range',
      labelAr: 'الطابق المفضل للوحدة السكنية',
      labelEn: 'Preferred Floor Range',
      type: 'select',
      options: [
        { value: 'ground', labelAr: 'أرضي (يفضل بحديقة)', labelEn: 'Ground floor (garden preferred)' },
        { value: 'middle', labelAr: 'طابق متكرر (وسط)', labelEn: 'Middle floor' },
        { value: 'top_penthouse', labelAr: 'طابق أخير / بنتهاوس مع روف', labelEn: 'Top floor / Penthouse' },
        { value: 'any', labelAr: 'لا يهم / أي طابق', labelEn: 'Any floor' }
      ]
    },
    {
      key: 'view_type',
      labelAr: 'إطلالة العقار المفضلة',
      labelEn: 'Preferred View / Outlook',
      type: 'text',
      placeholderAr: 'مثال: إطلالة على حديقة، شارع رئيسي، نيل',
      placeholderEn: 'e.g. Facing park, main street, river view'
    }
  ],
  villas: [
    {
      key: 'payment_plan',
      labelAr: 'طريقة الدفع والسداد المقبولة',
      labelEn: 'Acceptable Payment & Installments',
      type: 'select',
      options: [
        { value: 'cash_only', labelAr: 'كاش بالكامل دفعة واحدة', labelEn: 'Cash only' },
        { value: 'installments', labelAr: 'تقسيط (مقدم + دفعات متساوية)', labelEn: 'Installments (downpayment + terms)' },
        { value: 'any', labelAr: 'أي نظام متاح', labelEn: 'Any plan' }
      ]
    },
    {
      key: 'view_type',
      labelAr: 'إطلالة العقار المفضلة',
      labelEn: 'Preferred View / Outlook',
      type: 'text',
      placeholderAr: 'مثال: إطلالة على حديقة، شارع رئيسي، نيل',
      placeholderEn: 'e.g. Facing park, main street, river view'
    }
  ],
  finishing: [
    {
      key: 'design_status',
      labelAr: 'هل يتوفر لديك تصميم ثلاثي الأبعاد (3D Design) جاهز؟',
      labelEn: 'Do you already have a 3D design ready?',
      type: 'select',
      options: [
        { value: 'yes_ready', labelAr: 'نعم، يتوفر تصميم ومخطط هندسي كامل', labelEn: 'Yes, full design & blueprints ready' },
        { value: 'need_design', labelAr: 'لا، أحتاج لعمل التصميم والديكور أولاً', labelEn: 'No, design work is needed first' },
        { value: 'execution_only', labelAr: 'لا، وأريد البدء في التنفيذ مباشرة بدون تصميم ثلاثي الأبعاد', labelEn: 'No, start execution directly' }
      ]
    },
    {
      key: 'material_grade',
      labelAr: 'درجة جودة خامات ومواد التشطيب المطلوبة',
      labelEn: 'Desired Finishing Material Grade',
      type: 'select',
      options: [
        { value: 'ultra_high', labelAr: 'مستورد بالكامل وفخم جداً (Ultra Luxury)', labelEn: 'Ultra luxury & imported' },
        { value: 'premium', labelAr: 'مستوى راقي وخامات ممتازة (Premium/Deluxe)', labelEn: 'Premium / Deluxe quality' },
        { value: 'economical', labelAr: 'تشطيب اقتصادي وعملي بجودة مقبولة', labelEn: 'Economical & functional' }
      ]
    }
  ]
}

const GENERAL_ADVANCED_QUESTIONS: AdvancedQuestionDefinition[] = [
  {
    key: 'warranty',
    labelAr: 'مدة الضمان المفضلة',
    labelEn: 'Preferred Warranty Duration',
    type: 'select',
    options: [
      { value: 'no_pref', labelAr: 'لا يهم / أي ضمان', labelEn: 'Does not matter / Any warranty' },
      { value: '1_year', labelAr: 'سنة واحدة على الأقل', labelEn: 'At least 1 year' },
      { value: '2_years', labelAr: 'سنتين أو أكثر', labelEn: '2 years or more' }
    ]
  },
  {
    key: 'origin',
    labelAr: 'بلد المنشأ المفضل',
    labelEn: 'Preferred Origin/Manufacture Country',
    type: 'text',
    placeholderAr: 'مثال: محلي، مستورد، ألمانيا، اليابان',
    placeholderEn: 'e.g. Local, Imported, Germany, Japan'
  },
  {
    key: 'supplier_tier',
    labelAr: 'فئة المورد المفضل',
    labelEn: 'Preferred Supplier Tier',
    type: 'select',
    options: [
      { value: 'any', labelAr: 'أرخص عرض متاح (أي مورد)', labelEn: 'Cheapest available (Any supplier)' },
      { value: 'verified', labelAr: 'مورد معتمد أو موزع رسمي فقط', labelEn: 'Verified supplier or official distributor only' },
      { value: 'original_only', labelAr: 'ضمان الوكيل الأصلي فقط', labelEn: 'Original agent warranty only' }
    ]
  },
  {
    key: 'buying_stage',
    labelAr: 'مرحلة الشراء الفعلي',
    labelEn: 'Actual Sourcing Stage',
    type: 'select',
    options: [
      { value: 'immediate', labelAr: 'جاهز للشراء اليوم فور توفر العرض', labelEn: 'Ready to buy today once offer is ready' },
      { value: 'comparing', labelAr: 'مقارنة أسعار ومواصفات فقط حالياً', labelEn: 'Comparing prices and specs only' },
      { value: 'future', labelAr: 'تخطيط لشراء مستقبلي (خلال شهر)', labelEn: 'Planning for future purchase (within a month)' }
    ]
  }
]

export default function RequestWizardClient({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const router = useRouter()

  // ── Feature Flags (client Realtime-subscribed) ──────────────────────────────
  const voiceFlag       = useFeature('voice_input')
  const imageFlag       = useFeature('image_upload')
  const textFlag        = useFeature('ai_concierge_text')
  const manualV2        = useFeature('manual_builder_v2')
  const productLinkFlag = useFeature('product_link_input')
  const historyFlag     = useFeature('request_history_lookup')  // Phase 3

  // ── Wizard State ─────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false)

  // Step starts at STEP_CATEGORY (safe default). Once the history flag finishes
  // loading, if it is enabled we rewind to STEP_RETURNING (the optional lookup
  // step). This avoids a flash of the lookup UI for customers on a page where
  // the flag is off, and ensures zero behavior change when flag is disabled.
  const [step, setStep] = useState(STEP_CATEGORY)

  // Pre-fill phone from the returning-customer lookup (convenience only —
  // the customer can still edit it freely in the Intake step).
  const [lookupPhone, setLookupPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false)
  const [aiData, setAiData] = useState<AIExtractedData | null>(null)

  const [formData, setFormData] = useState({
    category:      '',
    subcategory:   '',
    customSpecs:   {} as Record<string, string>,
    advancedSpecs: {} as Record<string, string>,
    productName:   '',
    targetLocation: '',
    maxPrice:      '',
    notes:         '',
    customerName:  '',
    customerPhone: '',
    isBusiness:    false,
    companyName:   '',
    crNumber:      '',
    taxNumber:     '',
    quantity:      '1',
    // manual_builder_v2 extra fields (stored in requests.metadata)
    brand:         '',
    condition:     '',
    budgetMin:     '',
    budgetMax:     '',
    urgency:       '',
    color:         '',
    size:          '',
    referenceLink: '',
    sourceType:    'manual' as 'manual' | 'ai_text' | 'ai_voice' | 'ai_image' | 'product_link',
    aiConfidence:  null as number | null,
    aiMetadata:    {} as Record<string, unknown>,
  })

  function getCurrentSpecsFields() {
    if (formData.subcategory && SUBCATEGORY_FIELDS[formData.subcategory]) {
      return SUBCATEGORY_FIELDS[formData.subcategory].fields
    }
    return GENERAL_FIELDS
  }

  function getProductNamePlaceholder() {
    const map: Record<string, { ar: string; en: string }> = {
      mobiles: { ar: 'مثال: آيفون 15 برو ماكس 256 جيجا', en: 'e.g. iPhone 15 Pro Max 256GB' },
      laptops: { ar: 'مثال: لابتوب ديل XPS 15 بذاكرة 16 جيجا', en: 'e.g. Dell XPS 15 Laptop 16GB RAM' },
      gaming: { ar: 'مثال: بلايستيشن 5 سليم مع ذراعين', en: 'e.g. PlayStation 5 Slim with 2 Controllers' },
      audio_video: { ar: 'مثال: شاشة إل جي OLED 65 بوصة 4K', en: 'e.g. LG OLED 65 inch 4K TV' },
      refrigerator: { ar: 'مثال: ثلاجة شارب 18 قدم سيلفر ديجيتال', en: 'e.g. Sharp Refrigerator 18 Feet Silver Digital' },
      washing_machine: { ar: 'مثال: غسالة إل جي 9 كيلو اتوماتيك بالبخار', en: 'e.g. LG Washing Machine 9kg Steam Front Load' },
      ac: { ar: 'مثال: تكييف كاريير سبليت 2.25 حصان انفرتر بارد/ساخن', en: 'e.g. Carrier Split AC 2.25 HP Inverter Cool/Heat' },
      stove_oven: { ar: 'مثال: بوتاجاز يونيفرسال 5 شعلة ستانلس ستيل', en: 'e.g. Universal Stove 5 Burners Stainless Steel' },
      cars: { ar: 'مثال: تويوتا كورولا 2023 فئة ثانية', en: 'e.g. Toyota Corolla 2023 Active Pack' },
      spare_parts: { ar: 'مثال: مساعدين خلفيين تويوتا ياريس 2015', en: 'e.g. Rear Shock Absorbers Toyota Yaris 2015' },
      living_room: { ar: 'مثال: طقم انتريه مودرن 4 قطع لون رمادي', en: 'e.g. Modern Living Room Sofa Set 4 Pieces Grey' },
      bedroom: { ar: 'مثال: غرفة نوم خشب زان كاملة سرير ودولاب', en: 'e.g. Full Beech Wood Bedroom Set Bed & Wardrobe' },
      kitchen: { ar: 'مثال: مطبخ خشب الوميتال خامات مستوردة 3 متر', en: 'e.g. Custom Alumital Kitchen 3 Meters' },
      clothing: { ar: 'مثال: بدلة رجالي رسمية كحلي مقاس 52', en: 'e.g. Navy Blue Formal Men Suit Size 52' },
      shoes: { ar: 'مثال: حذاء جري نايكي مقاس 43 أسود', en: 'e.g. Nike Running Shoes Size 43 Black' },
      apartments: { ar: 'مثال: شقة 3 غرف وصالة للإيجار بالمعادي', en: 'e.g. 3-Bedroom Apartment for Rent in Maadi' },
      villas: { ar: 'مثال: تاون هاوس للبيع في زايد بضواحي القاهرة', en: 'e.g. Townhouse for Sale in Zayed City' },
      finishing: { ar: 'مثال: تصميم وتشطيب شقة 150 متر التجمع الخامس', en: 'e.g. Interior Design & Finishing for 150 Sqm Apartment' }
    }
    const val = map[formData.subcategory] || {
      ar: 'اسم المنتج، الماركة، الموديل، التفاصيل بدقة',
      en: 'Exact product name, brand, model, detailed specs'
    }
    return isAr ? val.ar : val.en
  }

  function getCurrentAdvancedQuestions() {
    if (formData.subcategory && SUBCATEGORY_ADVANCED_QUESTIONS[formData.subcategory]) {
      return SUBCATEGORY_ADVANCED_QUESTIONS[formData.subcategory]
    }
    return GENERAL_ADVANCED_QUESTIONS
  }

  // ── AI Concierge text area ───────────────────────────────────────────────────
  const [conciergeText, setConciergeText] = useState('')
  const [isParsing, setIsParsing]         = useState(false)
  const [aiError, setAiError]             = useState('')

  // ── Load state from sessionStorage on mount ──────────────────────────────────
  useEffect(() => {
    if (isRestored) return

    setMounted(true)
    const supported =
      typeof window !== 'undefined' &&
      (typeof window.SpeechRecognition !== 'undefined' ||
        typeof window.webkitSpeechRecognition !== 'undefined')
    setSpeechSupported(supported)

    let restoredStep: number | null = null
    let savedStepExists = false
    try {
      const savedStep = sessionStorage.getItem('wizard_step')
      const savedFormData = sessionStorage.getItem('wizard_form_data')
      const savedAiData = sessionStorage.getItem('wizard_ai_data')
      const savedLookupPhone = sessionStorage.getItem('wizard_lookup_phone')
      const savedConciergeText = sessionStorage.getItem('wizard_concierge_text')

      if (savedStep !== null) {
        savedStepExists = true
        restoredStep = Number(savedStep)
        setStep(restoredStep)
      }
      if (savedFormData !== null) setFormData(JSON.parse(savedFormData))
      if (savedAiData !== null) setAiData(JSON.parse(savedAiData))
      if (savedLookupPhone !== null) setLookupPhone(savedLookupPhone)
      if (savedConciergeText !== null) setConciergeText(savedConciergeText)
    } catch (e) {
      console.warn('Failed to load wizard state from sessionStorage:', e)
    }

    if (!historyFlag.loading) {
      if (!savedStepExists && historyFlag.enabled) {
        setStep(STEP_RETURNING)
      }
      setIsRestored(true)
    }
  }, [historyFlag.loading, historyFlag.enabled, isRestored])

  // ── Save state to sessionStorage on change ───────────────────────────────────
  useEffect(() => {
    if (!mounted || !isRestored) return
    try {
      sessionStorage.setItem('wizard_step', String(step))
      sessionStorage.setItem('wizard_form_data', JSON.stringify(formData))
      sessionStorage.setItem('wizard_ai_data', aiData ? JSON.stringify(aiData) : '')
      sessionStorage.setItem('wizard_lookup_phone', lookupPhone)
      sessionStorage.setItem('wizard_concierge_text', conciergeText)
    } catch (e) {
      console.warn('Failed to save wizard state to sessionStorage:', e)
    }
  }, [step, formData, aiData, lookupPhone, conciergeText, mounted, isRestored])

  // ── Product Link input ──────────────────────────────────────────────
  const [productLinkUrl, setProductLinkUrl]     = useState('')
  const [isParsingLink, setIsParsingLink]       = useState(false)

  // ── Image upload ─────────────────────────────────────────────────────────────
  const [imageFile, setImageFile]         = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Voice input ──────────────────────────────────────────────────────────────
  const [isListening, setIsListening]     = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // ─── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { id: 'electronics', label: isAr ? 'إلكترونيات وموبايلات' : 'Electronics & Mobiles', icon: '📱' },
    { id: 'appliances',  label: isAr ? 'أجهزة منزلية'        : 'Home Appliances',        icon: '🏠' },
    { id: 'automotive',  label: isAr ? 'سيارات وقطع غيار'    : 'Automotive',             icon: '🚗' },
    { id: 'furniture',   label: isAr ? 'أثاث وديكور'         : 'Furniture & Decor',      icon: '🪑' },
    { id: 'fashion',     label: isAr ? 'ملابس وموضة'         : 'Fashion & Apparel',      icon: '👕' },
    { id: 'real_estate', label: isAr ? 'عقارات'              : 'Real Estate',            icon: '🏢' },
    { id: 'services',    label: isAr ? 'خدمات وتشطيب'        : 'Services & Finishing',   icon: '🔧' },
  ]

  const nextStep = () => setStep(s => s === STEP_LOCATION ? STEP_INTAKE : s + 1)
  const prevStep = () => {
    setStep(s => {
      if (s === STEP_REVIEW)  return STEP_CATEGORY
      if (s === STEP_DETAILS) return STEP_CATEGORY
      if (s === STEP_LOCATION) return STEP_DETAILS
      if (s === STEP_INTAKE)  return STEP_LOCATION
      return Math.max(STEP_CATEGORY, s - 1)
    })
  }

  // ── Voice: start/stop listening ───────────────────────────────────────────────
  function toggleVoice() {
    if (!speechSupported) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechAPI()

    // Use Arabic if that's the page locale, else detect from flag config
    const voiceLangs = (voiceFlag.config?.languages as string[]) ?? ['ar', 'en']
    recognition.lang = voiceLangs.includes('ar') ? 'ar-EG' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      // Only the TRANSCRIBED TEXT leaves the browser — no audio blob is sent
      setConciergeText(prev => prev ? `${prev} ${transcript}` : transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      console.warn('[SpeechRecognition] error:', event.error)
      if (event.error === 'not-allowed') {
        setShowMicPermissionModal(true)
      } else {
        alert(isAr 
          ? 'حدث خطأ في التسجيل الصوتي. حاول مرة أخرى.' 
          : 'Voice recognition failed. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.warn('[SpeechRecognition] failed to start:', err)
      setIsListening(false)
    }
  }

  // ── Image: client-side pre-validation ────────────────────────────────────────
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side pre-validation using flag config (server also validates)
    const maxMb = typeof imageFlag.config?.max_size_mb === 'number' ? imageFlag.config.max_size_mb : 8
    const allowed = Array.isArray(imageFlag.config?.allowed_types)
      ? (imageFlag.config.allowed_types as string[])
      : ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxMb * 1024 * 1024) {
      setAiError(isAr ? `الملف أكبر من ${maxMb} ميجابايت` : `File exceeds ${maxMb}MB limit`)
      return
    }
    if (!allowed.includes(file.type)) {
      setAiError(isAr ? 'نوع الملف غير مدعوم' : 'Unsupported file type')
      return
    }

    setAiError('')
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── AI Concierge Submit ───────────────────────────────────────────────────────
  const handleConciergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conciergeText.trim() && !imageFile) return

    setIsParsing(true)
    setAiError('')

    try {
      const fd = new FormData()
      if (conciergeText.trim()) fd.append('text', conciergeText.trim())
      if (imageFile)             fd.append('image', imageFile)

      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()

      if (res.status === 403) {
        setAiError(isAr ? 'هذه الميزة غير متاحة حالياً' : 'This feature is currently disabled')
        return
      }

      if (!res.ok && !data.rejected) {
        setAiError(data.messageAr || (isAr ? 'خطأ في الخادم' : 'Server error'))
        return
      }

      if (data.rejected) {
        setAiError(data.messageAr || (isAr ? 'تعذّر تحليل الطلب' : 'Could not process request'))
        return
      }

      // Success — navigate to Review Step (no auto-fill yet)
      setAiData(data.data)
      setStep(STEP_REVIEW)
    } catch {
      setAiError(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsParsing(false)
    }
  }

  // ── Product Link Submit ─────────────────────────────────────────────────
  const handleProductLinkSubmit = async () => {
    const trimmed = productLinkUrl.trim()
    if (!trimmed) return

    // Client-side quick check — looks like a URL? (real validation is server-side)
    const looksLikeUrl = /^https?:\/\//.test(trimmed)
    if (!looksLikeUrl) {
      setAiError(isAr ? 'يرجى إدخال رابط صحيح يبدأ بـ https://' : 'Please enter a valid URL starting with https://')
      return
    }

    setIsParsingLink(true)
    setAiError('')

    try {
      const res = await fetch('/api/ai/concierge/product-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      const data = await res.json()

      if (res.status === 403) {
        setAiError(isAr ? 'هذه الميزة غير متاحة حالياً' : 'This feature is currently disabled')
        return
      }

      if (!res.ok || data.rejected) {
        setAiError(
          data.messageAr ||
          (isAr ? 'تعذّر استخراج بيانات المنتج، تأكد من الرابط وحاول مرة أخرى' : 'Could not extract product data, please check the link and try again')
        )
        return
      }

      // Success — navigate to Review Step (same as AI concierge text/image path)
      setAiData(data.data)
      setStep(STEP_REVIEW)
    } catch {
      setAiError(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsParsingLink(false)
    }
  }

  // ── Review Confirmed — populate wizard form ───────────────────────────────────
  function handleReviewConfirm(edited: AIExtractedData) {
    // Detect source type: product_link is indicated by sourceUrl in edited data
    const isProductLink = !!edited.sourceUrl
    const hasImage = !!imageFile
    const hasText  = !!conciergeText.trim() && !hasImage
    const newSourceType: 'ai_text' | 'ai_voice' | 'ai_image' | 'product_link' =
      isProductLink ? 'product_link' :
      hasImage      ? 'ai_image'     :
      hasText       ? 'ai_text'      : 'ai_voice'

    setFormData(prev => ({
      ...prev,
      targetLocation: prev.targetLocation || 'القاهرة',
      productName:  edited.productName || prev.productName,
      category:     edited.category    || prev.category,
      quantity:     edited.quantity != null ? String(edited.quantity) : prev.quantity,
      maxPrice:     edited.budgetMax   != null ? String(edited.budgetMax) : prev.maxPrice,
      notes:        edited.notes       || prev.notes,
      brand:        edited.brand       || prev.brand,
      condition:    edited.condition   || prev.condition,
      budgetMin:    edited.budgetMin   != null ? String(edited.budgetMin) : prev.budgetMin,
      budgetMax:    edited.budgetMax   != null ? String(edited.budgetMax) : prev.budgetMax,
      color:        edited.color       || prev.color,
      sourceType:   newSourceType,
      aiConfidence: edited.confidence,
      aiMetadata: {
        isMultipleItems: edited.isMultipleItems,
        items:           edited.items,
        missingFields:   edited.missingFields,
        // Product-link specific traceability fields
        ...(edited.sourceUrl ? { sourceUrl: edited.sourceUrl }     : {}),
        ...(edited.imageUrl  ? { productImageUrl: edited.imageUrl } : {}),
      },
    }))

    // Advance to Intake step (name/phone) — skips manual steps for AI path
    setStep(STEP_INTAKE)
  }

  // ── Final Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const specs = formData.customSpecs || {}
    const adv = formData.advancedSpecs || {}

    // Build metadata for extra fields (manual_builder_v2 + AI)
    const metadata: Record<string, unknown> = {
      ...formData.aiMetadata,
      subcategory:   formData.subcategory || undefined,
      customSpecs:   specs,
      advancedSpecs: adv,
      brand:         specs.brand         || formData.brand        || undefined,
      condition:     specs.condition     || formData.condition    || undefined,
      color:         specs.color         || formData.color        || undefined,
      size:          specs.size          || formData.size         || undefined,
      warranty:      adv.warranty        || undefined,
      origin:        adv.origin          || undefined,
      supplier_tier: adv.supplier_tier   || undefined,
      buying_stage:  adv.buying_stage    || undefined,
      ...(manualV2.enabled
        ? {
            budgetMin:     formData.budgetMin    ? Number(formData.budgetMin)  : undefined,
            budgetMax:     formData.budgetMax    ? Number(formData.budgetMax)  : undefined,
            urgency:       formData.urgency      || undefined,
            referenceLink: formData.referenceLink || undefined,
          }
        : {}),
    }

    let finalNotes = formData.notes || ''
    if (formData.subcategory) {
      const specsList: string[] = []
      const subInfo = SUBCATEGORY_FIELDS[formData.subcategory]
      
      if (formData.customSpecs) {
        Object.entries(formData.customSpecs).forEach(([k, v]) => {
          if (!v) return
          const fieldDef = subInfo?.fields.find(f => f.key === k) || GENERAL_FIELDS.find(f => f.key === k)
          const label = isAr ? fieldDef?.labelAr : fieldDef?.labelEn
          specsList.push(`- **${label}**: ${v}`)
        })
      }
      
      if (formData.advancedSpecs) {
        Object.entries(formData.advancedSpecs).forEach(([k, v]) => {
          if (!v) return
          const advDef = getCurrentAdvancedQuestions().find(q => q.key === k)
          const label = isAr ? advDef?.labelAr : advDef?.labelEn
          specsList.push(`- **${label}**: ${v}`)
        })
      }

      if (specsList.length > 0) {
        const titleText = isAr ? '📋 تفاصيل المواصفات المطلوبة:' : '📋 Requested Specifications:'
        finalNotes = `${titleText}\n${specsList.join('\n')}\n\n${finalNotes}`
      }
    }

    try {
      const res = await fetch('/api/customers/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          notes:          finalNotes,
          customerPhone:  formData.customerPhone || lookupPhone,
          metadata,
          source_type:    formData.sourceType,
          ai_confidence:  formData.aiConfidence,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        try {
          sessionStorage.clear()
        } catch {}
        if (data.isExistingRegisteredAccount) {
          router.push(`/${locale}/customer/dashboard?requestId=${data.requestId}&code=${data.requestCode}&returning=true`)
        } else {
          router.push(`/${locale}/customer/dashboard?requestId=${data.requestId}&code=${data.requestCode}`)
        }
      } else {
        alert(data.error || 'Failed to submit request')
        setIsSubmitting(false)
      }
    } catch {
      alert(isAr ? 'خطأ في الاتصال بالخادم' : 'Network error')
      setIsSubmitting(false)
    }
  }

  // ── Progress calculation (4 visual steps for progress bar) ───────────────────
  const progressStep =
    step === STEP_CATEGORY ? 1 :
    step === STEP_REVIEW   ? 2 :
    step === STEP_DETAILS  ? 2 :
    step === STEP_LOCATION ? 3 : 4

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'} data-testid="start-request-page">
        <div className="wizard-header relative z-10" style={{ opacity: 0.5 }}>
          <h1 className="wizard-title">
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard-container" dir={isAr ? 'rtl' : 'ltr'} data-testid="start-request-page">
      {/* Decorative Glow */}
      <div className="wizard-glow-top" />
      <div className="wizard-glow-bottom" />

      {/* Header */}
      <div className="wizard-header relative z-10">
        <Link href={`/${locale}`} className="wizard-back-link">
          {isAr ? '← العودة للرئيسية' : '← Back to Home'}
        </Link>
        <h1 className="wizard-title">
          {isAr ? 'ابحث عن ما تريد 🎯' : 'Find What You Need 🎯'}
        </h1>
        <div className="wizard-progress-bar">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`wizard-progress-step ${s <= progressStep ? 'is-active' : ''}`} />
          ))}
        </div>
      </div>

      {/* ── STEP 1: Category + AI Concierge ──────────────────────────────────── */}
      {step === STEP_CATEGORY && (
        <div className="wizard-step-panel">
          {/* AI Concierge Card — only if flag enabled and not loading */}
          {!textFlag.loading && textFlag.enabled && (
            <div className="wizard-ai-card">
              <div className="wizard-ai-header">
                <span className="wizard-ai-emoji">🔮</span>
                <div className="wizard-ai-titles">
                  <h3 className="wizard-ai-title">
                    {isAr ? 'المساعد الذكي للطلبات (AI Concierge)' : 'AI Concierge Sourcing Assistant'}
                  </h3>
                  <p className="wizard-ai-subtitle">
                    {isAr
                      ? 'اكتب ما تبحث عنه أو ارفع صورة وسنستخرج التفاصيل تلقائياً'
                      : 'Type what you need or upload a photo and we will extract the details'}
                  </p>
                </div>
              </div>

              <div className="wizard-ai-body">
                {/* Textarea + Voice button row */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={conciergeText}
                    onChange={e => setConciergeText(e.target.value)}
                    disabled={isParsing}
                    rows={2}
                    className="wizard-textarea"
                    placeholder={isAr
                      ? 'عايز تكييف 1.5 حصان في حدود 20 ألف جنيه في القاهرة...'
                      : 'I want a 1.5 HP air conditioner around 20k EGP in Cairo...'}
                    style={{ paddingInlineEnd: '48px' }}
                  />

                  {/* Microphone button — only if voice flag enabled + speech API available */}
                  {!voiceFlag.loading && voiceFlag.enabled && speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      disabled={isParsing}
                      className={`wizard-mic-btn ${isListening ? 'is-listening' : ''}`}
                      title={isAr ? (isListening ? 'إيقاف الاستماع' : 'تحدث الآن') : (isListening ? 'Stop listening' : 'Speak now')}
                    >
                      🎙️
                    </button>
                  )}
                </div>

                {/* Listening indicator */}
                {isListening && (
                  <div className="wizard-listening-badge">
                    <span className="wizard-listening-dot" />
                    {isAr ? '...جاري الاستماع' : '...Listening'}
                  </div>
                )}

                {/* Image upload area — only if image flag enabled */}
                {!imageFlag.loading && imageFlag.enabled && (
                  <div>
                    {imagePreviewUrl ? (
                      <div className="wizard-image-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreviewUrl} alt="preview" className="wizard-image-thumb" />
                        <div className="wizard-image-info">
                          <span className="wizard-image-name">{imageFile?.name}</span>
                          <button type="button" onClick={removeImage} className="wizard-image-remove">
                            {isAr ? 'حذف' : 'Remove'} ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="wizard-image-upload-label">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={(imageFlag.config?.allowed_types as string[] | undefined)?.join(',') ?? 'image/jpeg,image/png,image/webp'}
                          onChange={handleImageSelect}
                          style={{ display: 'none' }}
                          disabled={isParsing}
                        />
                        <span className="wizard-image-upload-icon">📎</span>
                        <span>
                          {isAr
                            ? `ارفع صورة المنتج أو الفاتورة (حتى ${imageFlag.config?.max_size_mb ?? 8} ميجابايت)`
                            : `Upload product image or invoice (up to ${imageFlag.config?.max_size_mb ?? 8}MB)`}
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Product Link input — only if product_link_input flag enabled */}
                {!productLinkFlag.loading && productLinkFlag.enabled && (
                  <div className="wizard-product-link-section">
                    <div className="wizard-product-link-divider">
                      <div className="wizard-product-link-divider-line" />
                      <span className="wizard-product-link-divider-text">
                        {isAr ? 'أو ألصق رابط المنتج' : 'Or paste product link'}
                      </span>
                      <div className="wizard-product-link-divider-line" />
                    </div>
                    <div className="wizard-product-link-row">
                      <input
                        id="product-link-input"
                        type="url"
                        value={productLinkUrl}
                        onChange={e => { setProductLinkUrl(e.target.value); setAiError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleProductLinkSubmit() } }}
                        disabled={isParsingLink || isParsing}
                        className="wizard-product-link-input"
                        placeholder={isAr
                          ? 'https://www.amazon.eg/... أو noon.com أو AliExpress'
                          : 'https://www.amazon.eg/... or noon.com or AliExpress'}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        id="product-link-submit"
                        onClick={handleProductLinkSubmit}
                        disabled={isParsingLink || isParsing || !productLinkUrl.trim()}
                        className="wizard-product-link-btn"
                      >
                        {isParsingLink ? (
                          <>
                            <span className="wizard-spinner" />
                            {isAr ? 'جاري...' : 'Fetching...'}
                          </>
                        ) : (
                          <>🔗 {isAr ? 'استخراج' : 'Extract'}</>
                        )}
                      </button>
                    </div>
                    <p className="wizard-product-link-hint">
                      {isAr
                        ? '💡 سنستخرج اسم المنتج والسعر تلقائياً — أمازون ، نون ، AliExpress'
                        : '💡 We’ll auto-extract the product name and price — Amazon, Noon, AliExpress'}
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {aiError && (
                  <div className="wizard-error-banner">⚠️ {aiError}</div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleConciergeSubmit}
                  disabled={isParsing || isParsingLink || (!conciergeText.trim() && !imageFile)}
                  className="wizard-btn-concierge"
                >
                  {isParsing ? (
                    <>
                      <span className="wizard-spinner" />
                      {isAr ? 'جاري التحليل...' : 'Analysing...'}
                    </>
                  ) : (
                    isAr ? 'خلوا Findora تدورلي 🔮' : 'Let Findora Search For Me 🔮'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="wizard-divider">
            <div className="wizard-divider-line" />
            <span className="wizard-divider-text">
              {isAr ? 'أو حدد الفئة يدوياً' : 'Or select category manually'}
            </span>
            <div className="wizard-divider-line" />
          </div>

          {/* Category Grid */}
          <h2 className="wizard-step-title">{isAr ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}</h2>
          <div className="wizard-categories-grid">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFormData({ 
                    ...formData, 
                    category: cat.id,
                    subcategory: '',
                    customSpecs: {},
                    advancedSpecs: {}
                  })
                }}
                className={`wizard-category-btn ${formData.category === cat.id ? 'is-selected' : ''}`}
                data-testid={`wizard-category-${cat.id}`}
              >
                <div className="wizard-category-icon">{cat.icon}</div>
                <div className="wizard-category-label">{cat.label}</div>
              </button>
            ))}
          </div>

          {/* Subcategory Selector */}
          {formData.category && SUBCATEGORIES_MAP[formData.category] && (
            <div className="wizard-subcategory-section mt-8 animate-fade-in text-start">
              <h3 className="wizard-step-subtitle text-sm font-bold mb-4 text-center text-[hsl(258,89%,76%)]">
                {isAr ? 'اختر التصنيف الفرعي الأكثر دقة:' : 'Choose the most accurate subcategory:'}
              </h3>
              <div className="wizard-subcategories-grid">
                {SUBCATEGORIES_MAP[formData.category].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        subcategory: sub.id,
                        customSpecs: {}
                      })
                    }}
                    className={`wizard-subcategory-btn ${formData.subcategory === sub.id ? 'is-selected' : ''}`}
                  >
                    <span className="wizard-sub-icon">{sub.icon}</span>
                    <span>{isAr ? sub.labelAr : sub.labelEn}</span>
                  </button>
                ))}
              </div>

              {formData.subcategory && (
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(STEP_DETAILS)}
                    className="wizard-btn-primary px-8 py-3"
                    data-testid="wizard-continue-details"
                  >
                    {isAr ? 'متابعة تفاصيل المنتج ←' : 'Continue to Product Details ←'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 0 (RETURNING): Optional returning-customer lookup ────────────── */}
      {step === STEP_RETURNING && historyFlag.enabled && (
        <div className="wizard-step-panel">
          <ReturningCustomerStep
            isAr={isAr}
            onSkip={() => setStep(STEP_CATEGORY)}
            onReuse={(data: ReusedRequestData) => {
              // Map the reused request to the AIExtractedData shape that
              // ReviewScreen expects. Confidence = 100 (customer-confirmed data),
              // no missing fields, no AI uncertainty warnings.
              const mapped: AIExtractedData = {
                confidence:      100,
                productName:     data.productName,
                category:        data.category,
                quantity:        null,
                budgetMin:       null,
                budgetMax:       data.maxPrice ?? null,
                brand:           null,
                condition:       null,
                color:           null,
                notes:           data.notes ?? '',
                missingFields:   [],
                isMultipleItems: false,
                items:           null,
                imageUrl:        null,
                sourceUrl:       null,
              }
              setAiData(mapped)
              setLookupPhone(data.lookupPhone)
              // Populate the formData state fully to ensure no missing required fields
              setFormData(prev => ({
                ...prev,
                productName:    data.productName,
                category:       data.category,
                targetLocation: data.targetLocation || 'القاهرة',
                maxPrice:       data.maxPrice != null ? String(data.maxPrice) : '',
                notes:          data.notes || '',
                customerPhone:  data.lookupPhone,
                sourceType:     data.sourceType,
              }))
              setStep(STEP_REVIEW)
            }}
          />
        </div>
      )}

      {/* ── STEP REVIEW: AI Extracted Data Review ────────────────────────────── */}
      {step === STEP_REVIEW && aiData && (
        <div className="wizard-step-panel">
          <ReviewScreen
            aiData={aiData}
            confidence={aiData.confidence}
            isAr={isAr}
            onConfirm={handleReviewConfirm}
            onBack={() => setStep(step === STEP_REVIEW && lookupPhone ? STEP_RETURNING : STEP_CATEGORY)}
          />
        </div>
      )}

      {/* ── STEP 2: Product Details (manual path) ──────────────────────────── */}
      {step === STEP_DETAILS && (
        <form onSubmit={e => { e.preventDefault(); setStep(STEP_LOCATION) }} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'تفاصيل الطلب' : 'Request Details'}</h2>

            <div className="wizard-form-group">
              <label className="wizard-label">
                {isAr ? 'اسم المنتج أو الخدمة بدقة *' : 'Exact Product or Service Name *'}
              </label>
              <input
                required
                autoFocus
                value={formData.productName}
                onChange={e => setFormData({ ...formData, productName: e.target.value })}
                className="wizard-input"
                data-testid="start-request-title-input"
                placeholder={getProductNamePlaceholder()}
              />
            </div>

            {/* Dynamic Product Specifications */}
            <div className="wizard-specs-section text-start">
              <h3 className="wizard-specs-title text-sm font-bold text-[hsl(258,89%,76%)] mb-4">
                {isAr ? '📋 مواصفات المنتج المطلوبة:' : '📋 Required Product Specifications:'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getCurrentSpecsFields().map(field => (
                  <div key={field.key} className="wizard-form-group">
                    <label className="wizard-label-sm">
                      {isAr ? field.labelAr : field.labelEn}
                      {field.required && ' *'}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData.customSpecs?.[field.key] || ''}
                        onChange={e => setFormData({
                          ...formData,
                          customSpecs: {
                            ...formData.customSpecs,
                            [field.key]: e.target.value
                          }
                        })}
                        className="wizard-input-sm wizard-select"
                      >
                        <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {isAr ? opt.labelAr : opt.labelEn}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required={field.required}
                        type={field.type}
                        value={formData.customSpecs?.[field.key] || ''}
                        onChange={e => setFormData({
                          ...formData,
                          customSpecs: {
                            ...formData.customSpecs,
                            [field.key]: e.target.value
                          }
                        })}
                        className="wizard-input-sm"
                        placeholder={isAr ? field.placeholderAr : field.placeholderEn}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expandable Advanced Sourcing Section */}
            <div className="wizard-advanced-toggle-panel mt-6 text-start">
              <button
                type="button"
                onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
                className="flex items-center justify-between w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧠</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? 'أسئلة إضافية متقدمة (لتحسين دقة البحث)' : 'Optional Advanced Questions (Optimize Search)'}
                    </h4>
                    <p className="text-xs text-[hsl(220,10%,60%)] mt-0.5">
                      {isAr ? 'وفر 1-2 دقيقة إضافية للحصول على نتائج مطابقة بنسبة 100%' : 'Spend 1-2 minutes extra to get 100% matched results'}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-[hsl(220,10%,60%)] font-bold">
                  {showAdvancedSpecs ? '▲' : '▼'}
                </span>
              </button>

              {showAdvancedSpecs && (
                <div className="p-4 mt-3 rounded-xl border border-white/10 bg-black/40 space-y-4 animate-slide-down">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getCurrentAdvancedQuestions().map(q => (
                      <div key={q.key} className="wizard-form-group">
                        <label className="wizard-label-sm">{isAr ? q.labelAr : q.labelEn}</label>
                        {q.type === 'select' ? (
                          <select
                            value={formData.advancedSpecs?.[q.key] || ''}
                            onChange={e => setFormData({
                              ...formData,
                              advancedSpecs: {
                                ...formData.advancedSpecs,
                                [q.key]: e.target.value
                              }
                            })}
                            className="wizard-input-sm wizard-select"
                          >
                            <option value="">{isAr ? '— لا يهم —' : '— Does not matter —'}</option>
                            {q.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {isAr ? opt.labelAr : opt.labelEn}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.advancedSpecs?.[q.key] || ''}
                            onChange={e => setFormData({
                              ...formData,
                              advancedSpecs: {
                                ...formData.advancedSpecs,
                                [q.key]: e.target.value
                              }
                            })}
                            className="wizard-input-sm"
                            placeholder={isAr ? q.placeholderAr : q.placeholderEn}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* B2B Toggle */}
            <div className="wizard-toggle-container">
              <input
                type="checkbox"
                id="isBusiness"
                checked={formData.isBusiness}
                onChange={e => setFormData({ ...formData, isBusiness: e.target.checked })}
                className="wizard-checkbox-input"
              />
              <label htmlFor="isBusiness" className="wizard-checkbox-label">
                {isAr ? '🏢 طلب شراء لشركة / مؤسسة (B2B Request)' : '🏢 Corporate / B2B Sourcing Request'}
              </label>
            </div>

            {formData.isBusiness && (
              <div className="wizard-b2b-panel">
                <h3 className="wizard-b2b-title">
                  {isAr ? 'تفاصيل الشركة والمشتريات' : 'Company & Procurement Details'}
                </h3>
                <div className="wizard-grid-2">
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'اسم الشركة *' : 'Company Name *'}</label>
                    <input required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'مثال: شركة فايندورا للتجارة' : 'e.g. Findora Trading Co.'} />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الكمية المطلوبة *' : 'Required Quantity *'}</label>
                    <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="wizard-input-sm" placeholder="1" />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'رقم السجل التجاري *' : 'CR Number *'}</label>
                    <input required value={formData.crNumber} onChange={e => setFormData({ ...formData, crNumber: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'السجل التجاري' : '6-7 digit CR'} />
                  </div>
                  <div className="wizard-form-group">
                    <label className="wizard-label-sm">{isAr ? 'الرقم الضريبي *' : 'Tax Number *'}</label>
                    <input required value={formData.taxNumber} onChange={e => setFormData({ ...formData, taxNumber: e.target.value })} className="wizard-input-sm" placeholder={isAr ? 'الرقم الضريبي' : '9 digit Tax ID'} />
                  </div>
                </div>
              </div>
            )}

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'أي ملاحظات إضافية؟ (اختياري)' : 'Any additional notes? (Optional)'}</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="wizard-textarea" placeholder={isAr ? 'مثال: يفضل اللون الأسود، أو أريد جهاز جديد بضمان محلي' : 'e.g. Prefer black color, must have local warranty'} />
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={() => setStep(STEP_CATEGORY)} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={!formData.productName || (formData.isBusiness && (!formData.companyName || !formData.crNumber || !formData.taxNumber))} className="wizard-btn-primary" data-testid="wizard-next-details">{isAr ? 'التالي' : 'Next'}</button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 3: Location & Budget ─────────────────────────────────────────── */}
      {step === STEP_LOCATION && (
        <form onSubmit={e => { e.preventDefault(); setStep(STEP_INTAKE) }} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'المكان والميزانية' : 'Location & Budget'}</h2>

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'في أي منطقة تبحث؟' : 'Which area are you searching in?'}</label>
              <input required autoFocus value={formData.targetLocation} onChange={e => setFormData({ ...formData, targetLocation: e.target.value })} className="wizard-input" data-testid="wizard-location-input" placeholder={isAr ? 'مثال: المعادي، القاهرة' : 'e.g. Maadi, Cairo'} />
            </div>

            <div className="wizard-form-group">
              <label className="wizard-label">{isAr ? 'أقصى ميزانية (EGP) - اختياري' : 'Maximum Budget (EGP) - Optional'}</label>
              <input type="number" value={formData.maxPrice} onChange={e => setFormData({ ...formData, maxPrice: e.target.value })} className="wizard-input" placeholder="0.00" />
              <p className="wizard-input-hint">
                {isAr ? 'إذا تركتها فارغة، سنحضر لك أرخص الأسعار في السوق.' : 'If left blank, we will find the absolute lowest prices available.'}
              </p>
            </div>

            <div className="wizard-actions">
              <button type="button" onClick={() => setStep(STEP_DETAILS)} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={!formData.targetLocation} className="wizard-btn-primary" data-testid="wizard-next-location">{isAr ? 'التالي' : 'Next'}</button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 4 (INTAKE): Contact & Submit ─────────────────────────────────── */}
      {step === STEP_INTAKE && (
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="wizard-step-panel space-y-6">
            <h2 className="wizard-step-title">{isAr ? 'الخطوة الأخيرة 🚀' : 'Final Step 🚀'}</h2>

            <div className="wizard-upsell-banner">
              <div className="wizard-upsell-emoji">🎁</div>
              <div className="wizard-upsell-content">
                <h4 className="wizard-upsell-title">{isAr ? 'احصل على خدمة "المشتريات العادية" مجاناً!' : 'Get "Everyday Purchase" service for FREE!'}</h4>
                <p className="wizard-upsell-text">{isAr ? 'إذا أنشأت حساباً مجانياً الآن، ستحصل على بحث مجاني تماماً.' : 'If you create a free account now, this search is on us.'}</p>
                <Link href={`/${locale}/auth/signup`} className="wizard-upsell-link">
                  {isAr ? 'إنشاء حساب والحصول على العرض' : 'Create Account & Claim Offer'}
                </Link>
              </div>
            </div>

            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label className="wizard-label">{isAr ? 'الاسم *' : 'Your Name *'}</label>
                <input required autoFocus value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="wizard-input" data-testid="start-request-full-name-input" />
              </div>
              <div className="wizard-form-group">
                <label className="wizard-label">{isAr ? 'رقم الهاتف (لإرسال العروض) *' : 'Phone Number (to send offers) *'}</label>
                {/* Phase 3: pre-filled from returning-customer lookup if customer used that step.
                    Customer can still edit freely — this is convenience only, not locked. */}
                <input required type="tel"
                  value={formData.customerPhone || lookupPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="wizard-input"
                  data-testid="start-request-phone-input" />
              </div>
            </div>

            {/* Target Location input — required for database request creation */}
            <div className="wizard-form-group" style={{ marginTop: '16px' }}>
              <label className="wizard-label">{isAr ? 'المدينة / المنطقة (لتوصيل العروض) *' : 'City / Region (for delivering offers) *'}</label>
              <input required
                value={formData.targetLocation}
                onChange={e => setFormData({ ...formData, targetLocation: e.target.value })}
                className="wizard-input"
                placeholder={isAr ? 'مثال: القاهرة، المعادي' : 'e.g. Cairo, Maadi'} />
            </div>

            <div className="wizard-actions wizard-footer-actions">
              <button type="button" onClick={prevStep} disabled={isSubmitting} className="wizard-btn-secondary">{isAr ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={isSubmitting || !formData.customerName || !formData.customerPhone || !formData.targetLocation} className="wizard-btn-submit" data-testid="start-request-submit">
                {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'أرسل الطلب الآن' : 'Submit Request')}
              </button>
            </div>
          </div>
        </form>
      )}

      <Modal
        isOpen={showMicPermissionModal}
        onClose={() => setShowMicPermissionModal(false)}
        title={isAr ? 'تفعيل صلاحية استخدام المايكروفون' : 'Enable Microphone Permission'}
      >
        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'start' }}>
          <p style={{ marginBottom: 'var(--space-16)', color: 'var(--text-secondary)' }}>
            {isAr 
              ? 'يبدو أن الوصول للميكروفون محجوب من إعدادات المتصفح أو نظام التشغيل. يرجى اتباع الخطوات التالية للتفعيل:'
              : 'Microphone access is blocked by your browser or operating system settings. Please follow these steps to enable it:'}
          </p>

          <div style={{ marginBottom: 'var(--space-20)' }}>
            <h4 style={{ color: 'hsl(258, 89%, 76%)', margin: '0 0 var(--space-8) 0', fontSize: '1rem', fontWeight: 700 }}>
              {isAr ? '1. من إعدادات المتصفح (الموقع):' : '1. Browser Site Settings:'}
            </h4>
            <ul style={{ margin: 0, paddingInlineStart: 'var(--space-20)', listStyleType: 'disc' }}>
              <li>
                {isAr
                  ? 'اضغط على أيقونة القفل أو الإعدادات 🔒 بجانب رابط الموقع في شريط العنوان بالأعلى.'
                  : 'Click the padlock or settings icon 🔒 next to the website URL in the address bar at the top.'}
              </li>
              <li>
                {isAr
                  ? 'ابحث عن "الميكروفون" (Microphone) وقم بتعديل الخيار إلى "سماح" (Allow).'
                  : 'Find "Microphone" and change the option to "Allow".'}
              </li>
              <li>
                {isAr
                  ? 'قم بتحديث الصفحة (Refresh) وحاول مجدداً.'
                  : 'Refresh the page and try again.'}
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'hsl(258, 89%, 76%)', margin: '0 0 var(--space-8) 0', fontSize: '1rem', fontWeight: 700 }}>
              {isAr ? '2. من إعدادات الويندوز (إذا ظل معطلاً):' : '2. Windows Settings (if still disabled):'}
            </h4>
            <ul style={{ margin: 0, paddingInlineStart: 'var(--space-20)', listStyleType: 'disc' }}>
              <li>
                {isAr
                  ? 'افتح قائمة ابدأ (Start) ثم الإعدادات (Settings ⚙️).'
                  : 'Open the Start menu and go to Settings ⚙️.'}
              </li>
              <li>
                {isAr
                  ? 'اذهب إلى الخصوصية والأمان (Privacy & security) -> الميكروفون (Microphone).'
                  : 'Go to Privacy & security -> Microphone.'}
              </li>
              <li>
                {isAr
                  ? 'تأكد من تفعيل "الوصول إلى الميكروفون" (Microphone access).'
                  : 'Ensure "Microphone access" is turned On.'}
              </li>
              <li>
                {isAr
                  ? 'تأكد من تفعيل "السماح للتطبيقات بالوصول إلى الميكروفون" (Let apps access your microphone).'
                  : 'Ensure "Let apps access your microphone" is turned On.'}
              </li>
              <li>
                {isAr
                  ? 'انزل لأسفل وتأكد من تفعيل "السماح لبرامج سطح المكتب بالوصول للميكروفون" (Let desktop apps access your microphone) وتأكد من السماح للمتصفح (Chrome).'
                  : 'Scroll down and ensure "Let desktop apps access your microphone" is turned On, and that your browser (e.g. Chrome) is allowed.'}
              </li>
            </ul>
          </div>

          <div style={{ marginTop: 'var(--space-24)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowMicPermissionModal(false)}
              className="wizard-btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              {isAr ? 'حسناً، فهمت' : 'OK, Got it'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Scoped CSS ─────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wizard-container {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.7);
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }
        .wizard-glow-top {
          position: absolute; top: 0; right: 0; width: 256px; height: 256px;
          background: hsl(258, 89%, 66%); opacity: 0.2; filter: blur(100px);
          border-radius: 50%; pointer-events: none;
        }
        .wizard-glow-bottom {
          position: absolute; bottom: 0; left: 0; width: 256px; height: 256px;
          background: hsl(152, 69%, 51%); opacity: 0.1; filter: blur(100px);
          border-radius: 50%; pointer-events: none;
        }
        .wizard-header { margin-bottom: 32px; }
        .wizard-back-link {
          font-size: 14px; color: #94a3b8; text-decoration: none;
          margin-bottom: 16px; display: inline-block; transition: color 0.2s ease;
        }
        .wizard-back-link:hover { color: white; }
        .wizard-title { font-size: 28px; font-weight: 800; color: white; margin-bottom: 16px; }
        .wizard-progress-bar { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
        .wizard-progress-step {
          height: 8px; border-radius: 9999px; flex: 1;
          background: rgba(255,255,255,0.1); transition: background-color 0.5s ease;
        }
        .wizard-progress-step.is-active { background: hsl(258, 89%, 66%); }
        .wizard-step-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: white; text-align: start; }

        /* AI Concierge card */
        .wizard-ai-card {
          padding: 24px; border-radius: 16px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: linear-gradient(to right, rgba(139, 92, 246, 0.05), transparent);
          margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
        }
        .wizard-ai-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .wizard-ai-emoji { font-size: 24px; }
        .wizard-ai-titles { text-align: start; }
        .wizard-ai-title { font-size: 18px; font-weight: 700; color: white; margin: 0 0 4px 0; }
        .wizard-ai-subtitle { font-size: 12px; color: #94a3b8; margin: 0; }
        .wizard-ai-body { display: flex; flex-direction: column; gap: 16px; }

        /* Mic button */
        .wizard-mic-btn {
          position: absolute !important; inset-inline-end: 10px; top: 50%; transform: translateY(-50%);
          width: 36px !important; height: 36px !important; border-radius: 50% !important;
          background: rgba(139,92,246,0.15) !important; border: 1px solid rgba(139,92,246,0.3) !important;
          cursor: pointer !important; font-size: 16px !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        .wizard-mic-btn:hover:not(:disabled) { background: rgba(139,92,246,0.3) !important; }
        .wizard-mic-btn.is-listening {
          background: rgba(239,68,68,0.2) !important; border-color: rgba(239,68,68,0.5) !important;
          animation: micPulse 1s ease-in-out infinite;
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }

        /* Listening badge */
        .wizard-listening-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #ef4444; font-weight: 700; padding: 8px 0;
        }
        .wizard-listening-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
          animation: micPulse 1s ease-in-out infinite;
        }

        /* Image upload */
        .wizard-image-upload-label {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          border: 1.5px dashed rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.04);
          cursor: pointer; font-size: 13px; color: #94a3b8;
          transition: all 0.2s ease;
        }
        .wizard-image-upload-label:hover {
          border-color: rgba(139,92,246,0.6); background: rgba(139,92,246,0.08); color: white;
        }
        .wizard-image-upload-icon { font-size: 18px; }
        .wizard-image-preview {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          border: 1px solid rgba(139,92,246,0.3); background: rgba(139,92,246,0.06);
        }
        .wizard-image-thumb {
          width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .wizard-image-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
        .wizard-image-name { font-size: 13px; color: white; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        button.wizard-image-remove {
          font-size: 11px !important; color: #ef4444 !important; background: transparent !important;
          border: none !important; cursor: pointer !important; padding: 0 !important;
          font-weight: 700 !important; text-align: start !important;
        }

        /* Product link section */
        .wizard-product-link-section {
          display: flex; flex-direction: column; gap: 10px; margin-top: 4px;
        }
        .wizard-product-link-divider {
          display: flex; align-items: center; gap: 10px;
        }
        .wizard-product-link-divider-line {
          flex: 1; height: 1px; background: rgba(255,255,255,0.08);
        }
        .wizard-product-link-divider-text {
          font-size: 11px; color: #64748b; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
        }
        .wizard-product-link-row {
          display: flex; gap: 8px; align-items: center;
        }
        .wizard-product-link-input {
          flex: 1; border-radius: 10px; background: rgba(0,0,0,0.4);
          padding: 12px 14px; color: white; font-size: 13px;
          border: 1px solid rgba(59,130,246,0.25); outline: none;
          transition: border-color 0.2s ease; box-sizing: border-box;
          min-width: 200px;
        }
        .wizard-product-link-input:focus {
          border-color: rgba(59,130,246,0.6);
        }
        .wizard-product-link-input::placeholder { color: #475569; }
        button.wizard-product-link-btn {
          padding: 0 16px !important; border-radius: 10px !important;
          background: rgba(59,130,246,0.15) !important;
          border: 1px solid rgba(59,130,246,0.3) !important;
          color: #60a5fa !important; font-weight: 700 !important;
          font-size: 13px !important; cursor: pointer !important;
          transition: all 0.2s ease !important; white-space: nowrap !important;
          display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;
          width: 140px !important; height: 43px !important; box-sizing: border-box !important;
          flex-shrink: 0 !important;
        }
        button.wizard-product-link-btn:hover:not(:disabled) {
          background: rgba(59,130,246,0.25) !important;
          border-color: rgba(59,130,246,0.5) !important;
        }
        button.wizard-product-link-btn:disabled {
          opacity: 0.4 !important; cursor: not-allowed !important;
        }
        .wizard-product-link-hint {
          font-size: 11px; color: #475569; margin: 0; text-align: start;
        }


        /* v2 extended fields */
        .wizard-v2-fields {
          padding: 16px; border-radius: 12px;
          border: 1px solid rgba(200,151,59,0.2); background: rgba(200,151,59,0.04);
          margin-bottom: 8px;
        }

        /* Select styling */
        .wizard-select {
          appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: calc(100% - 12px) center;
          padding-inline-end: 32px !important;
        }

        /* Textarea */
        .wizard-textarea {
          width: 100%; border-radius: 12px; background: rgba(0,0,0,0.4);
          padding: 16px; color: white; border: 1px solid rgba(255,255,255,0.1);
          font-size: 14px; transition: border-color 0.2s ease;
          outline: none; box-sizing: border-box; resize: vertical;
        }
        .wizard-textarea:focus { border-color: hsl(258, 89%, 66%); }

        /* Error */
        .wizard-error-banner {
          font-size: 12px; color: #f87171; font-weight: 500;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
          padding: 12px; border-radius: 8px; text-align: start;
        }

        /* Divider */
        .wizard-divider { display: flex; padding: 16px 0; align-items: center; }
        .wizard-divider-line { flex-grow: 1; border-top: 1px solid rgba(255,255,255,0.05); }
        .wizard-divider-text {
          flex-shrink: 0; margin: 0 16px; font-size: 12px;
          color: rgba(255,255,255,0.45); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        /* Categories Grid */
        .wizard-categories-grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
          gap: 20px; 
          margin-top: 24px;
        }
        button.wizard-category-btn {
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%) !important; 
          color: rgba(255,255,255,0.7) !important;
          border: 1px solid rgba(255,255,255,0.05) !important; 
          padding: 28px 24px !important;
          border-radius: 16px !important; 
          display: flex !important; 
          flex-direction: column !important;
          align-items: center !important; 
          justify-content: center !important;
          text-align: center !important; 
          cursor: pointer !important;
          backdrop-filter: blur(10px);
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important; 
          width: 100% !important;
        }
        button.wizard-category-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        button.wizard-category-btn:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%) !important; 
          border-color: rgba(255,255,255,0.15) !important;
          color: white !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.05) !important;
        }
        button.wizard-category-btn.is-selected {
          background: linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.05) 100%) !important; 
          border-color: rgba(139,92,246,0.5) !important;
          color: white !important;
          box-shadow: 0 0 25px rgba(139,92,246,0.2), inset 0 0 12px rgba(139,92,246,0.1) !important;
        }
        button.wizard-category-btn.is-selected::before {
          background: linear-gradient(135deg, rgba(139,92,246,0.6), rgba(99,102,241,0.3));
        }
        .wizard-category-icon { 
          font-size: 40px; 
          margin-bottom: 14px; 
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        button.wizard-category-btn:hover .wizard-category-icon { 
          transform: scale(1.15) rotate(2deg); 
        }
        .wizard-category-label { 
          font-weight: 700; 
          font-size: 15px; 
          color: white !important; 
          letter-spacing: -0.01em;
        }

        /* Subcategories Container */
        .wizard-subcategory-section {
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 24px;
          margin-top: 32px;
          backdrop-filter: blur(12px);
        }
        .wizard-subcategories-grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); 
          gap: 12px; 
          margin-top: 16px;
        }
        button.wizard-subcategory-btn {
          background: rgba(255,255,255,0.02) !important; 
          color: rgba(255,255,255,0.6) !important;
          border: 1px solid rgba(255,255,255,0.04) !important; 
          padding: 14px 18px !important;
          border-radius: 12px !important; 
          display: flex !important; 
          align-items: center !important;
          justify-content: flex-start !important; 
          cursor: pointer !important;
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important; 
          width: 100% !important; 
          font-size: 13px !important;
          font-weight: 600 !important;
        }
        button.wizard-subcategory-btn:hover {
          background: rgba(255,255,255,0.06) !important; 
          border-color: rgba(255,255,255,0.1) !important;
          color: white !important;
          transform: scale(1.02);
        }
        button.wizard-subcategory-btn.is-selected {
          background: linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.1) 100%) !important; 
          border-color: rgba(139,92,246,0.5) !important;
          color: white !important; 
          box-shadow: 0 4px 12px rgba(139,92,246,0.15) !important;
        }
        .wizard-sub-icon { 
          margin-inline-end: 10px; 
          font-size: 18px; 
        }

        /* Inputs & Labels */
        .wizard-form-group { margin-bottom: 20px; text-align: start; }
        .wizard-label { display: block; font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .wizard-label-sm { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .wizard-input {
          width: 100%; 
          border-radius: 14px; 
          background: rgba(0,0,0,0.4) !important;
          padding: 16px !important; 
          color: white !important; 
          border: 1px solid rgba(255,255,255,0.08) !important;
          outline: none !important; 
          font-size: 15px !important; 
          transition: all 0.3s ease !important; 
          box-sizing: border-box !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .wizard-input:focus { 
          border-color: rgba(139,92,246,0.6) !important; 
          background: rgba(0,0,0,0.6) !important;
          box-shadow: 0 0 15px rgba(139,92,246,0.15), inset 0 2px 4px rgba(0,0,0,0.3) !important;
        }
        .wizard-input-hint { font-size: 12px; color: #64748b; margin-top: 8px; }
        .wizard-input-sm {
          width: 100%; 
          border-radius: 12px; 
          background: rgba(0,0,0,0.4) !important;
          padding: 12px 14px !important; 
          color: white !important; 
          border: 1px solid rgba(255,255,255,0.08) !important;
          outline: none !important; 
          font-size: 13px !important; 
          transition: all 0.3s ease !important; 
          box-sizing: border-box !important;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .wizard-input-sm:focus { 
          border-color: rgba(139,92,246,0.6) !important; 
          background: rgba(0,0,0,0.6) !important;
          box-shadow: 0 0 10px rgba(139,92,246,0.15), inset 0 1px 2px rgba(0,0,0,0.3) !important;
        }

        /* Grid */
        .wizard-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

        /* B2B */
        .wizard-toggle-container {
          display: flex; align-items: center; gap: 12px; padding: 16px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); margin-bottom: 20px;
        }
        .wizard-checkbox-input { width: 20px; height: 20px; accent-color: hsl(258, 89%, 66%); cursor: pointer; }
        .wizard-checkbox-label { font-size: 14px; font-weight: 700; color: white; cursor: pointer; user-select: none; }
        .wizard-b2b-panel {
          padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.4); margin-bottom: 20px;
        }
        .wizard-b2b-title {
          font-size: 14px; font-weight: 700; color: hsl(258, 89%, 66%);
          margin-top: 0; margin-bottom: 16px; text-align: start;
        }

        /* Upsell */
        .wizard-upsell-banner {
          padding: 16px; border-radius: 12px; border: 1px solid rgba(217,119,6,0.5);
          background: rgba(217,119,6,0.1); display: flex; gap: 16px;
          margin-bottom: 24px; text-align: start;
        }
        .wizard-upsell-emoji { font-size: 24px; }
        .wizard-upsell-title { font-weight: 700; color: #d97706; margin: 0 0 4px 0; }
        .wizard-upsell-text { font-size: 14px; color: white; margin: 0 0 8px 0; }
        .wizard-upsell-link {
          font-size: 12px; font-weight: 700; background: #d97706; color: black;
          padding: 4px 12px; border-radius: 6px; text-decoration: none;
          transition: background-color 0.2s ease; display: inline-block;
        }
        .wizard-upsell-link:hover { background-color: white; }

        /* Actions */
        .wizard-actions { display: flex; justify-content: space-between; margin-top: 28px; gap: 16px; }
        .wizard-footer-actions { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }

        /* Buttons */
        button.wizard-btn-concierge {
          width: 100% !important; padding: 12px 16px !important;
          background: hsl(258, 89%, 66%) !important; color: white !important;
          font-weight: 800 !important; border-radius: 12px !important;
          border: none !important; cursor: pointer !important;
          transition: all 0.2s ease !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          gap: 8px !important; box-shadow: 0 0 20px rgba(139,92,246,0.3) !important;
          font-size: 14px !important;
        }
        button.wizard-btn-concierge:hover:not(:disabled) {
          background: hsl(258, 89%, 76%) !important; transform: translateY(-1px) !important;
        }
        button.wizard-btn-concierge:disabled {
          opacity: 0.5 !important; cursor: not-allowed !important; transform: none !important; box-shadow: none !important;
        }
        button.wizard-btn-primary {
          position: relative;
          width: auto !important; 
          padding: 14px 28px !important;
          background: linear-gradient(135deg, hsl(258, 89%, 66%) 0%, hsl(243, 75%, 59%) 100%) !important; 
          color: white !important;
          font-weight: 800 !important; 
          border-radius: 14px !important;
          border: none !important; 
          cursor: pointer !important;
          transition: background 0.15s ease, box-shadow 0.15s ease !important; 
          display: inline-flex !important;
          align-items: center !important; 
          justify-content: center !important;
          box-shadow: 0 4px 20px rgba(139,92,246,0.3) !important;
          letter-spacing: -0.01em;
        }
        button.wizard-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, hsl(258, 89%, 71%) 0%, hsl(243, 75%, 64%) 100%) !important; 
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(139,92,246,0.5) !important;
        }
        button.wizard-btn-primary:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        button.wizard-btn-primary:disabled { opacity: 0.4 !important; cursor: not-allowed !important; box-shadow: none !important; transform: none !important; }
        
        button.wizard-btn-secondary {
          width: auto !important; 
          padding: 14px 28px !important;
          background: rgba(255,255,255,0.02) !important; 
          color: white !important;
          font-weight: 700 !important; 
          border-radius: 14px !important;
          border: 1px solid rgba(255,255,255,0.08) !important; 
          cursor: pointer !important;
          transition: background 0.15s ease, border-color 0.15s ease !important; 
          display: inline-flex !important;
          align-items: center !important; 
          justify-content: center !important;
        }
        button.wizard-btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08) !important; 
          border-color: rgba(255,255,255,0.15) !important;
          transform: translateY(-2px) !important;
        }
        button.wizard-btn-secondary:disabled { opacity: 0.4 !important; cursor: not-allowed !important; transform: none !important; }
        
        button.wizard-btn-submit {
          width: auto !important; 
          padding: 14px 28px !important;
          background: linear-gradient(135deg, hsl(152, 69%, 46%) 0%, hsl(162, 79%, 40%) 100%) !important; 
          color: white !important;
          font-weight: 800 !important; 
          border-radius: 14px !important;
          border: none !important; 
          cursor: pointer !important;
          transition: background 0.15s ease, box-shadow 0.15s ease !important; 
          display: inline-flex !important;
          align-items: center !important; 
          justify-content: center !important;
          box-shadow: 0 4px 20px rgba(16,185,129,0.3) !important;
          letter-spacing: -0.01em;
        }
        button.wizard-btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, hsl(152, 69%, 51%) 0%, hsl(162, 79%, 45%) 100%) !important; 
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(16,185,129,0.5) !important;
        }
        button.wizard-btn-submit:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        button.wizard-btn-submit:disabled { opacity: 0.4 !important; cursor: not-allowed !important; box-shadow: none !important; transform: none !important; }

        .wizard-spinner {
          width: 16px; height: 16px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 1s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive */
        @media (max-width: 768px) {
          .wizard-grid-2, .wizard-categories-grid { grid-template-columns: 1fr; }
          .wizard-container { padding: 20px; }
        }

        /* Select options dark background */
        .wizard-select option, select.wizard-input-sm option { background: #0b0f19; color: white; }

        .wizard-spinner {
          width: 16px; height: 16px; border: 2px solid white;
          border-top-color: transparent; border-radius: 50%;
          animation: spin 1s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive */
        @media (max-width: 768px) {
          .wizard-grid-2, .wizard-categories-grid { grid-template-columns: 1fr; }
          .wizard-container { padding: 20px; }
        }

        /* Select options dark background */
        .wizard-select option, select.wizard-input-sm option { background: #0b0f19; color: white; }
      ` }} />
    </div>
  )
}
