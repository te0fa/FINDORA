'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  toggleAIFeatureAction, 
  updateAILimitsAction, 
  resetAIFeatureDefaultsAction,
  assignAIManagerRoleAction,
  revokeAIManagerRoleAction
} from '@/app/[locale]/staff/ai-control/actions'

interface FeatureConfig {
  config_key: string;
  value: string;
  status: 'enabled' | 'disabled' | 'restricted';
  daily_limit: number | null;
  monthly_limit: number | null;
  description_en: string;
  description_ar: string;
}

interface UsageLog {
  id: string;
  feature_key: string;
  timestamp: string;
  success: boolean;
  error_message: string | null;
  estimated_cost: number;
}

interface StaffMember {
  id: string;
  full_name: string;
  staff_role: string;
  roles: string[];
}

interface AIControlPanelProps {
  features: FeatureConfig[];
  logs: UsageLog[];
  summary: { runsToday: number; costToday: number };
  staffList: StaffMember[];
  isAdmin: boolean;
  dict: any;
  locale: string;
}

// Meta details for the 8 features
const FEATURE_DETAILS: Record<string, {
  icon: string;
  color: string;
  cost: string;
  funcEn: string;
  funcAr: string;
  recEn: string;
  recAr: string;
}> = {
  flag_ai_parse_request: {
    icon: '📝',
    color: '#06b6d4',
    cost: '0.25 EGP',
    funcEn: 'Automatically extracts sourcing requirements and specs from natural language text inputs.',
    funcAr: 'يستخرج متطلبات التوريد والمواصفات تلقائياً من نصوص طلبات العملاء المكتوبة باللغة الطبيعية.',
    recEn: 'Keep enabled. Disabling forces customers to fill out complex technical specs forms manually, lowering conversion.',
    recAr: 'يُنصح بإبقائه مفعّلاً. إيقافه يجبر العملاء على إدخال المواصفات المعقدة يدوياً مما يقلل نسبة إكمال الطلبات.',
  },
  flag_ai_pricing_suggestions: {
    icon: '💲',
    color: '#6366f1',
    cost: '0.15 EGP',
    funcEn: 'Analyzes marketplace dynamics and historical quotes to recommend optimal sourcing pricing.',
    funcAr: 'يحلل ديناميكيات السوق وعروض الأسعار السابقة لتقديم توصيات تسعير دقيقة للموظفين.',
    recEn: 'Highly recommended. Helps standardize company pricing and prevents manual computation errors.',
    recAr: 'موصى به بشدة. يساعد في توحيد تسعير المنصة ويقلل الأخطاء التشغيلية والحسابية للموظفين.',
  },
  flag_ai_rfq_generation: {
    icon: '📄',
    color: '#3b82f6',
    cost: '0.50 EGP',
    funcEn: 'Compiles technical specifications into structured Markdown B2B Request for Quote templates.',
    funcAr: 'يصيغ المواصفات الفنية في مستندات طلبات عروض أسعار للشركات (RFQ) احترافية بصيغة Markdown.',
    recEn: 'Can be toggled off if needed. Fallback defaults to a generic static templates builder.',
    recAr: 'يمكن تعطيله عند الحاجة. في حال التعطيل، يقوم النظام بإنشاء قوالب مستندات فنية تقليدية ثابتة.',
  },
  flag_ai_report_chat: {
    icon: '💬',
    color: '#10b981',
    cost: '0.40 EGP / msg',
    funcEn: 'Enables interactive chatbot inside B2B client report views for real-time negotiations.',
    funcAr: 'يفعل مساعداً ذكياً داخل تقارير العملاء للإجابة عن استفسارات التوريد والتفاوض حول العروض.',
    recEn: 'Keep active during peak sourcing seasons. Fallback displays a fallback customer support link.',
    recAr: 'يُفضل إبقاؤه نشطاً خلال مواسم التوريد. عند تعطيله، يتم عرض رسالة توجيهية لفتح تذكرة دعم يدوية.',
  },
  flag_ai_support_chat: {
    icon: '🤖',
    color: '#14b8a6',
    cost: '0.40 EGP / msg',
    funcEn: 'Pre-screens platform disputes, merchant claims, and general complaints to resolve common issues.',
    funcAr: 'يقوم بفرز النزاعات وشكاوى العملاء ومطالبات التجار لحل المشكلات الشائعة بشكل آلي.',
    recEn: 'Reduces staff support workload. Fallback prompts user to submit a manual support ticket directly.',
    recAr: 'يقلل ضغط التذاكر على الموظفين. عند التعطيل، يُوجه المستخدم مباشرة لفتح تذكرة دعم تقليدية.',
  },
  flag_ai_receipt_ocr: {
    icon: '🔍',
    color: '#f59e0b',
    cost: '1.00 EGP / img',
    funcEn: 'Scans uploaded InstaPay payment receipts to verify transaction details against ledger records.',
    funcAr: 'يفحص صور إيصالات دفع إنستاباي ويتحقق من البيانات (القيمة والتاريخ) آلياً لمنع التزوير.',
    recEn: 'Highly critical. Disabling queues all payments for manual human verification, slowing orders verification.',
    recAr: 'هام جداً وحرج. إيقافه يجبر النظام على تحويل 100% من الإيصالات إلى طابور المراجعة البشرية مما يؤخر الشحن.',
  },
  flag_ai_demand_expansion: {
    icon: '🚀',
    color: '#ec4899',
    cost: '0.75 EGP',
    funcEn: 'Analyzes user orders to auto-recommend alternative or complementary accessories for scouts to source.',
    funcAr: 'يحلل طلبات العملاء ويقترح تلقائياً سلعاً بديلة أو إضافية للمناديب للبحث عنها وتوسيع سلة الشراء.',
    recEn: 'Optional. Fallback triggers standard deterministic programmatic suggestions system.',
    recAr: 'اختياري. في حال التعطيل، يتم تشغيل محرك حسابات رياضي ثابت لاقتراح السلع البديلة بدون كلفة API.',
  },
  flag_ai_copilot_agents: {
    icon: '🧠',
    color: '#8b5cf6',
    cost: '0.50 - 2.50 EGP',
    funcEn: 'Enables the 8 workspace copilots to assist reviewers, planners, and reporters in their tasks.',
    funcAr: 'يفعل مساعدي مساحة العمل الثمانية المتخصصين لمساعدة الموظفين في التقييم، التخطيط، والصياغة.',
    recEn: 'Core operation feature. Disabling prevents the staff workspace from using intelligent copilot panels.',
    recAr: 'ميزة تشغيلية جوهرية. إيقافها يمنع الموظفين من استخدام مساعد مساحة العمل الذكي ويقيدهم بالعمل اليدوي.',
  },
  flag_ai_intake_review: {
    icon: '🔍',
    color: '#14b8a6',
    cost: '0.50 EGP',
    funcEn: 'Pre-screens new requests and provides an initial intake proposal (Approve/Reject/Clarify). If disabled, staff will not receive any AI suggestions and must analyze and decide on requests entirely from scratch manually.',
    funcAr: 'يفحص الطلبات الجديدة ويقدم اقتراحاً أولياً (قبول/رفض/استفسار). عند التعطيل، لن يحصل الموظف على اقتراح أولي من الذكاء الاصطناعي وسيحتاج لتحليل الطلب وقراره من الصفر يدوياً.',
    recEn: 'Highly recommended. Automates request classification and initial screening while maintaining manual staff oversight.',
    recAr: 'موصى به بشدة. يقوم بأتمتة تصنيف وفحص الطلبات مع الحفاظ على الرقابة والاعتماد البشري للموظفين.',
  },
}

export default function AIControlPanel({
  features,
  logs,
  summary,
  staffList,
  isAdmin,
  dict,
  locale
}: AIControlPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Render all features including flag_ai_intake_review
  const coreFeatures = features

  const [activeModalFeature, setActiveModalFeature] = useState<FeatureConfig | null>(null)
  const [modalDailyLimit, setModalDailyLimit] = useState<string>('')
  const [modalMonthlyLimit, setModalMonthlyLimit] = useState<string>('')
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  const isRtl = locale === 'ar'

  const handleToggle = (featureKey: string, currentStatus: string, currentValue: string) => {
    const newStatus = currentStatus === 'disabled' ? 'enabled' : 'disabled'
    const newValue = currentStatus === 'disabled' ? 'true' : 'false'
    
    startTransition(async () => {
      try {
        await toggleAIFeatureAction(featureKey, newStatus, newValue)
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Error updating status')
      }
    })
  }

  const openConfigModal = (feature: FeatureConfig) => {
    setActiveModalFeature(feature)
    setModalDailyLimit(feature.daily_limit !== null ? String(feature.daily_limit) : '')
    setModalMonthlyLimit(feature.monthly_limit !== null ? String(feature.monthly_limit) : '')
    setSaveSuccessMsg(null)
  }

  const handleSaveLimits = () => {
    if (!activeModalFeature) return
    const daily = modalDailyLimit === '' ? null : parseInt(modalDailyLimit, 10)
    const monthly = modalMonthlyLimit === '' ? null : parseInt(modalMonthlyLimit, 10)

    if ((daily !== null && isNaN(daily)) || (monthly !== null && isNaN(monthly))) {
      alert(locale === 'ar' ? 'الرجاء إدخال أرقام صالحة للحدود' : 'Please enter valid numbers for limits')
      return
    }

    startTransition(async () => {
      try {
        await updateAILimitsAction(activeModalFeature.config_key, daily, monthly)
        setSaveSuccessMsg(dict.save_success)
        router.refresh()
        setTimeout(() => {
          setActiveModalFeature(null)
        }, 1200)
      } catch (err: any) {
        alert(err.message || 'Error updating limits')
      }
    })
  }

  const handleResetDefaults = (featureKey: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من استعادة الإعدادات الموصى بها؟' : 'Are you sure you want to reset to recommended settings?')) {
      return
    }
    startTransition(async () => {
      try {
        await resetAIFeatureDefaultsAction(featureKey)
        setSaveSuccessMsg(dict.reset_success)
        router.refresh()
        setTimeout(() => {
          setActiveModalFeature(null)
        }, 1200)
      } catch (err: any) {
        alert(err.message || 'Error resetting defaults')
      }
    })
  }

  const handleRoleToggle = (staffId: string, hasRole: boolean) => {
    startTransition(async () => {
      try {
        if (hasRole) {
          await revokeAIManagerRoleAction(staffId)
        } else {
          await assignAIManagerRoleAction(staffId)
        }
        router.refresh()
      } catch (err: any) {
        alert(err.message || 'Error toggling role')
      }
    })
  }

  return (
    <div className="ai-control-panel-container" style={{ direction: isRtl ? 'rtl' : 'ltr', padding: '2rem 1rem' }}>
      
      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ai-control-panel-container {
          max-width: 1200px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
          color: #f8fafc;
        }
        
        .glass-header {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .header-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-subtitle {
          color: #94a3b8;
          font-size: 1rem;
          line-height: 1.5;
        }

        /* Metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .metric-card {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .metric-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .metric-info {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          color: #64748b;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f8fafc;
          margin-top: 0.25rem;
        }

        /* Feature grid */
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .feature-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 1.5rem;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .feature-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .feature-badge-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .feature-icon-box {
          font-size: 1.5rem;
          margin-right: 0.5rem;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .status-enabled {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .status-disabled {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .status-restricted {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .feature-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
        }

        .feature-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.4;
          min-height: 2.8rem;
          margin-bottom: 1.25rem;
        }

        .caps-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          background: rgba(2, 6, 23, 0.35);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1.25rem;
        }

        .cap-item {
          display: flex;
          flex-direction: column;
        }

        .cap-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .cap-val {
          font-size: 0.9rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-top: 0.15rem;
        }

        .feature-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1rem;
        }

        /* Toggle switch */
        .switch-wrap {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }

        .switch-input {
          display: none;
        }

        .switch-slider {
          width: 44px;
          height: 24px;
          background-color: #334155;
          border-radius: 30px;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .switch-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: #f8fafc;
          top: 3px;
          left: 3px;
          transition: transform 0.2s ease;
        }

        .switch-input:checked + .switch-slider {
          background-color: #3b82f6;
        }

        .switch-input:checked + .switch-slider::before {
          transform: translateX(20px);
        }

        .btn-configure {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-configure:hover {
          background: #3b82f6;
          color: #ffffff;
          border-color: #3b82f6;
        }

        /* Logs Table */
        .logs-section {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.5rem;
          margin-bottom: 3rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .logs-table-wrapper {
          overflow-x: auto;
        }

        .logs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        html[dir="rtl"] .logs-table {
          text-align: right;
        }

        .logs-table th {
          padding: 0.85rem 1rem;
          color: #64748b;
          font-weight: 600;
          border-bottom: 2px solid rgba(255, 255, 255, 0.07);
        }

        .logs-table td {
          padding: 0.85rem 1rem;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .log-status-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.15rem 0.4rem;
          border-radius: 12px;
        }

        .log-status-success {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .log-status-failed {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        /* Admin Allocation list */
        .admin-allocation-box {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .staff-card {
          background: rgba(2, 6, 23, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .staff-card-info {
          display: flex;
          flex-direction: column;
        }

        .staff-name {
          font-weight: 700;
          color: #e2e8f0;
        }

        .staff-primary-role {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 0.15rem;
        }

        .staff-badge-manager {
          margin-top: 0.3rem;
          align-self: flex-start;
          font-size: 0.7rem;
          padding: 0.1rem 0.4rem;
          border-radius: 12px;
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .btn-role-toggle {
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-assign {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }

        .btn-assign:hover {
          background: #3b82f6;
          color: #ffffff;
        }

        .btn-revoke {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .btn-revoke:hover {
          background: #ef4444;
          color: #ffffff;
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          max-width: 550px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: modalAppear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalAppear {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-info-item {
          margin-bottom: 1.25rem;
        }

        .modal-info-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .modal-info-content {
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .modal-cost-badge {
          display: inline-block;
          margin-top: 0.25rem;
          background: rgba(255, 255, 255, 0.06);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #e2e8f0;
          font-weight: 600;
        }

        .modal-inputs-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
        }

        .input-label {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.4rem;
        }

        .num-input {
          background: rgba(2, 6, 23, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          padding: 0.6rem;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
        }

        .num-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .modal-footer {
          padding: 1.25rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .btn-reset {
          background: transparent;
          border: none;
          color: #f87171;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-reset:hover {
          text-decoration: underline;
        }

        .btn-save {
          background: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .btn-save:hover {
          background: #2563eb;
        }

        .success-toast {
          color: #34d399;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        /* Disabled loading overlay */
        .panel-loading-overlay {
          opacity: 0.6;
          pointer-events: none;
        }
      ` }} />

      {/* Header Panel */}
      <div className="glass-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="header-title">{dict.title}</h1>
          <p className="header-subtitle">{dict.subtitle}</p>
        </div>
        <div>
          <a href={`/${locale}/staff/ai-control/workflow-reliability`} className="btn-configure" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b', color: '#f59e0b', fontSize: '0.95rem' }}>
            ⚙️ {locale === 'ar' ? 'متابعة موثوقية العمليات' : 'Workflow Reliability Panel'}
          </a>
        </div>
      </div>

      {/* Global Metrics summary */}
      <div className="metrics-grid">
        
        {/* Total Runs Today */}
        <div className="metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
            📊
          </div>
          <div className="metric-info">
            <span className="metric-label">{dict.total_consumption}</span>
            <span className="metric-value">{summary.runsToday}</span>
          </div>
        </div>

        {/* Total Cost Today */}
        <div className="metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}>
            EGP
          </div>
          <div className="metric-info">
            <span className="metric-label">{dict.estimated_cost}</span>
            <span className="metric-value">
              {summary.costToday.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>

        {/* Global Status badge */}
        <div className="metric-card">
          <div className="metric-icon-wrapper" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}>
            ⚙️
          </div>
          <div className="metric-info">
            <span className="metric-label">{dict.global_status}</span>
            <span className="metric-value" style={{ color: '#34d399', fontSize: '1.25rem' }}>
              ● {locale === 'ar' ? 'فعّال ونشط' : 'Active'}
            </span>
          </div>
        </div>

      </div>

      {/* Feature Cards Grid */}
      <div className={`feature-section-container ${isPending ? 'panel-loading-overlay' : ''}`}>
        <h2 className="section-title">
          <span>⚙️</span> {dict.feature_grid}
        </h2>
        
        <div className="feature-grid">
          {coreFeatures.map((feat) => {
            const details = FEATURE_DETAILS[feat.config_key] || {
              icon: '🤖',
              color: '#3b82f6',
              cost: 'N/A',
              funcEn: feat.description_en,
              funcAr: feat.description_ar,
              recEn: 'No recommendations listed.',
              recAr: 'لا توجد توصيات مدرجة.'
            }

            const isEnabled = feat.status === 'enabled'
            const isRestricted = feat.status === 'restricted'

            return (
              <div key={feat.config_key} className="feature-card">
                
                {/* Card Header (Icon and Status Badge) */}
                <div className="feature-card-header">
                  <span className="feature-icon-box">{details.icon}</span>
                  <div className="feature-badge-wrap">
                    {isRestricted ? (
                      <span className="status-badge status-restricted">{dict.status_restricted}</span>
                    ) : isEnabled ? (
                      <span className="status-badge status-enabled">{dict.status_enabled}</span>
                    ) : (
                      <span className="status-badge status-disabled">{dict.status_disabled}</span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <h3 className="feature-title">
                  {locale === 'ar' 
                    ? dict.features[feat.config_key] 
                    : (dict.features[feat.config_key] || feat.config_key.replace('flag_ai_', '').replace(/_/g, ' ')).toUpperCase()}
                </h3>

                {feat.config_key === 'flag_ai_intake_review' && (
                  <div style={{
                    marginBlockStart: '0.2rem',
                    marginBlockEnd: '0.6rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    width: 'fit-content'
                  }}>
                    ⚠️ {locale === 'ar' ? 'يتطلب مراجعة بشرية إلزامية' : 'Requires mandatory human review'}
                  </div>
                )}

                <p className="feature-desc">
                  {locale === 'ar' ? details.funcAr : details.funcEn}
                </p>

                {/* Limits capsule info */}
                <div className="caps-info-grid">
                  <div className="cap-item">
                    <span className="cap-label">{dict.daily_cap}</span>
                    <span className="cap-val">
                      {feat.daily_limit !== null ? feat.daily_limit : '∞'}
                    </span>
                  </div>
                  <div className="cap-item">
                    <span className="cap-label">{dict.monthly_cap}</span>
                    <span className="cap-val">
                      {feat.monthly_limit !== null ? feat.monthly_limit : '∞'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="feature-actions">
                  
                  {/* Status Toggle Switch */}
                  <label className="switch-wrap">
                    <input 
                      type="checkbox" 
                      className="switch-input"
                      checked={feat.status !== 'disabled'}
                      onChange={() => handleToggle(feat.config_key, feat.status, feat.value)}
                    />
                    <span className="switch-slider"></span>
                  </label>

                  {/* Edit Caps Button */}
                  <button 
                    className="btn-configure"
                    onClick={() => openConfigModal(feat)}
                  >
                    {dict.edit_limits}
                  </button>

                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Invocation Audit Logs list */}
      <div className="logs-section">
        <h2 className="section-title">
          <span>📜</span> {dict.recent_logs}
        </h2>

        {logs.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{dict.no_logs}</p>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>{dict.log_feature}</th>
                  <th>{dict.log_time}</th>
                  <th>{dict.log_status}</th>
                  <th>{dict.log_cost}</th>
                  <th>{dict.log_error}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const details = FEATURE_DETAILS[log.feature_key] || { icon: '🤖' }
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600' }}>
                        <span style={{ marginRight: '0.4rem' }}>{details.icon}</span>
                        {locale === 'ar' ? dict.features[log.feature_key] || log.feature_key : log.feature_key}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.82rem' }} suppressHydrationWarning={true}>
                        {new Date(log.timestamp).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td>
                        {log.success ? (
                          <span className="log-status-badge log-status-success">✓ OK</span>
                        ) : (
                          <span className="log-status-badge log-status-failed">✗ Fail</span>
                        )}
                      </td>
                      <td>{log.estimated_cost.toFixed(2)} EGP</td>
                      <td style={{ color: log.success ? '#94a3b8' : '#f87171', fontSize: '0.8rem' }}>
                        {log.error_message || (locale === 'ar' ? 'نجاح' : 'Success')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Allocation Section */}
      {isAdmin && (
        <div className="admin-allocation-box">
          <h2 className="section-title" style={{ color: '#a78bfa' }}>
            <span>🛡️</span> {dict.admin_allocation_title}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {dict.admin_allocation_desc}
          </p>

          <div className="staff-grid">
            {staffList.map((staff) => {
              const isManager = staff.roles.includes('ai_manager')
              return (
                <div key={staff.id} className="staff-card">
                  <div className="staff-card-info">
                    <span className="staff-name">{staff.full_name}</span>
                    <span className="staff-primary-role">
                      {locale === 'ar' ? 'الوظيفة الأساسية: ' : 'Primary Role: '}
                      {staff.staff_role}
                    </span>
                    {isManager && (
                      <span className="staff-badge-manager">
                        {locale === 'ar' ? 'مدير ذكاء اصطناعي' : 'AI Manager'}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => handleRoleToggle(staff.id, isManager)}
                    className={`btn-role-toggle ${isManager ? 'btn-revoke' : 'btn-assign'}`}
                  >
                    {isManager ? dict.revoke_role : dict.assign_role}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Configure Limits Modal */}
      {activeModalFeature && (
        <div className="modal-overlay">
          <div className="modal-card">
            
            {/* Modal Header */}
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem', color: '#f1f5f9' }}>
                {dict.modal_title}: {locale === 'ar' ? dict.features[activeModalFeature.config_key] : activeModalFeature.config_key}
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveModalFeature(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {saveSuccessMsg && (
                <div className="success-toast">
                  {saveSuccessMsg}
                </div>
              )}

              {/* Operational function info */}
              <div className="modal-info-item">
                <span className="modal-info-label">{dict.function_label}</span>
                <p className="modal-info-content">
                  {locale === 'ar' ? (FEATURE_DETAILS[activeModalFeature.config_key]?.funcAr || activeModalFeature.description_ar) : (FEATURE_DETAILS[activeModalFeature.config_key]?.funcEn || activeModalFeature.description_en)}
                </p>
              </div>

              {/* Operational Recommendation */}
              <div className="modal-info-item">
                <span className="modal-info-label">{dict.recommendation_label}</span>
                <p className="modal-info-content" style={{ color: '#38bdf8', fontWeight: '500' }}>
                  💡 {locale === 'ar' ? FEATURE_DETAILS[activeModalFeature.config_key]?.recAr : FEATURE_DETAILS[activeModalFeature.config_key]?.recEn}
                </p>
              </div>

              {/* Economic impact */}
              <div className="modal-info-item">
                <span className="modal-info-label">{dict.economic_impact}</span>
                <div>
                  <span className="modal-info-content">{dict.cost_per_call}: </span>
                  <span className="modal-cost-badge">
                    {FEATURE_DETAILS[activeModalFeature.config_key]?.cost || '0.20 EGP'}
                  </span>
                </div>
              </div>

              {/* Limits inputs */}
              <div className="modal-inputs-row">
                
                <div className="input-group">
                  <label className="input-label">{dict.daily_limit_label}</label>
                  <input 
                    type="number" 
                    placeholder="∞"
                    className="num-input"
                    value={modalDailyLimit}
                    onChange={(e) => setModalDailyLimit(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">{dict.monthly_limit_label}</label>
                  <input 
                    type="number" 
                    placeholder="∞"
                    className="num-input"
                    value={modalMonthlyLimit}
                    onChange={(e) => setModalMonthlyLimit(e.target.value)}
                  />
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                className="btn-reset"
                onClick={() => handleResetDefaults(activeModalFeature.config_key)}
              >
                {dict.reset_recommended}
              </button>

              <button 
                className="btn-save"
                onClick={handleSaveLimits}
              >
                {dict.save_limits}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
