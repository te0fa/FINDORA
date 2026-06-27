const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, '../src/dictionaries/ar.json');
const enPath = path.join(__dirname, '../src/dictionaries/en.json');

const arTranslations = {
  "title": "إدارة ميزات الذكاء الاصطناعي",
  "subtitle": "لوحة تحكم مركزية لتفعيل ميزات الذكاء الاصطناعي الثمانية وضبط حدود استهلاكها اليومي والشهري.",
  "global_metrics": "المؤشرات العامة للاستهلاك",
  "global_status": "الحالة العامة لتشغيل AI",
  "total_consumption": "إجمالي الاستدعاءات اليوم",
  "estimated_cost": "التكلفة التقديرية",
  "feature_grid": "ميزات الذكاء الاصطناعي النشطة",
  "status_enabled": "مفعّل",
  "status_disabled": "معطّل",
  "status_restricted": "مقيّد بالاستهلاك",
  "daily_cap": "الحد اليومي",
  "monthly_cap": "الحد الشهري",
  "edit_limits": "تعديل الحدود",
  "modal_title": "ضبط ميزة",
  "function_label": "الوظيفة التشغيلية",
  "recommendation_label": "التوصية التشغيلية",
  "economic_impact": "الأثر الاقتصادي التقديري",
  "cost_per_call": "تكلفة الاستدعاء الواحد",
  "daily_limit_label": "الحد الأقصى لعدد الاستدعاءات اليومية",
  "monthly_limit_label": "الحد الأقصى لعدد الاستدعاءات الشهرية",
  "save_limits": "حفظ الإعدادات",
  "reset_recommended": "استعادة الإعدادات الموصى بها",
  "reset_success": "تمت استعادة الإعدادات الموصى بها بنجاح",
  "save_success": "تم حفظ تعديلات الحدود بنجاح",
  "recent_logs": "سجل استهلاك ميزات AI",
  "log_feature": "الميزة",
  "log_time": "الوقت",
  "log_status": "الحالة",
  "log_cost": "التكلفة التقديرية",
  "log_error": "سبب الفشل / رسالة الخطأ",
  "no_logs": "لا توجد سجلات استهلاك مؤخراً.",
  "admin_allocation_title": "إدارة وتعيين مدراء الذكاء الاصطناعي (AI Managers)",
  "admin_allocation_desc": "تتيح هذه الشاشة للمسؤولين تعيين أو إلغاء صلاحية (AI Manager) للموظفين للتحكم باللوحة.",
  "staff_member": "الموظف",
  "role_status": "صلاحية AI Manager",
  "assign_role": "تعيين الصلاحية",
  "revoke_role": "إلغاء الصلاحية",
  "allocation_success": "تم تحديث صلاحية الموظف بنجاح",
  "features": {
    "flag_ai_parse_request": "تحليل طلبات العملاء باللغة الطبيعية",
    "flag_ai_pricing_suggestions": "اقتراحات تسعير طلبات البحث والتوريد",
    "flag_ai_rfq_generation": "توليد مستندات عروض أسعار الشركات (B2B)",
    "flag_ai_report_chat": "مساعد تقارير التوريد (Chatbot)",
    "flag_ai_support_chat": "مساعد الدعم الفني وحل النزاعات الآلي",
    "flag_ai_receipt_ocr": "التحقق التلقائي الذكي من إإيصالات الدفع",
    "flag_ai_demand_expansion": "محرك توسيع الطلب وتوليد المهام التلقائي",
    "flag_ai_copilot_agents": "مساعدو مساحة العمل الـ 8 المتخصصين"
  }
};

const enTranslations = {
  "title": "AI Feature Control Panel",
  "subtitle": "Centralized dashboard to toggle, monitor, and restrict the 8 operational AI features in FINDORA.",
  "global_metrics": "Global AI Metrics",
  "global_status": "Global AI Toggle Status",
  "total_consumption": "Total Daily Runs",
  "estimated_cost": "Estimated Cost",
  "feature_grid": "Operational AI Features",
  "status_enabled": "Enabled",
  "status_disabled": "Disabled",
  "status_restricted": "Restricted (Limit Reached)",
  "daily_cap": "Daily Cap",
  "monthly_cap": "Monthly Cap",
  "edit_limits": "Edit Limits",
  "modal_title": "Configure Feature",
  "function_label": "Operational Function",
  "recommendation_label": "Operational Recommendation",
  "economic_impact": "Estimated Economic Impact",
  "cost_per_call": "Cost per invocation",
  "daily_limit_label": "Maximum Daily Calls",
  "monthly_limit_label": "Maximum Monthly Calls",
  "save_limits": "Save Configuration",
  "reset_recommended": "Reset to Recommended",
  "reset_success": "Successfully reset configs to recommended guidelines.",
  "save_success": "Successfully saved configuration limits.",
  "recent_logs": "AI Feature Usage Logs",
  "log_feature": "Feature",
  "log_time": "Time",
  "log_status": "Status",
  "log_cost": "Est. Cost",
  "log_error": "Failure Reason / Error Message",
  "no_logs": "No recent invocation logs found.",
  "admin_allocation_title": "AI Manager Role Allocation",
  "admin_allocation_desc": "Allows administrators to assign or revoke the AI Manager role to active staff members.",
  "staff_member": "Staff Member",
  "role_status": "AI Manager Status",
  "assign_role": "Assign Role",
  "revoke_role": "Revoke Role",
  "allocation_success": "Successfully updated staff member role status.",
  "features": {
    "flag_ai_parse_request": "Natural Language Sourcing parsing",
    "flag_ai_pricing_suggestions": "AI Sourcing Pricing Advisor",
    "flag_ai_rfq_generation": "AI B2B RFQ Document Generator",
    "flag_ai_report_chat": "Interactive Report Negotiation Chat",
    "flag_ai_support_chat": "Automated Support & Dispute Chatbot",
    "flag_ai_receipt_ocr": "Vision OCR Receipt Scanner",
    "flag_ai_demand_expansion": "AI Demand Expansion Engine",
    "flag_ai_copilot_agents": "Specialized Workspace AI Copilots"
  }
};

function addTranslations(filePath, newKey, newObj) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const dict = JSON.parse(fileContent);
  dict[newKey] = newObj;
  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`✅ Added ${newKey} to ${filePath}`);
}

addTranslations(arPath, 'ai_control_panel', arTranslations);
addTranslations(enPath, 'ai_control_panel', enTranslations);
