const fs = require('fs');
const path = require('path');

const enPath = path.join(process.cwd(), 'src/dictionaries/en.json');
const arPath = path.join(process.cwd(), 'src/dictionaries/ar.json');

const enAIControl = {
  "page_title": "AI Control Center",
  "page_subtitle": "Manage AI agents, providers, limits, and operational logs.",
  "global_status": "Global AI Status",
  "enabled_agents": "Enabled Agents",
  "runs_today": "Runs Today",
  "cost_today": "Est. Cost Today",
  "last_error": "Last Error",
  "provider_status": "Provider Environment Status",
  "agent_settings": "Agent Configuration",
  "edit_agent": "Edit Agent",
  "test_agent": "Test Agent",
  "agent_name": "Agent",
  "enabled": "Enabled",
  "provider": "Provider",
  "model": "Model",
  "temperature": "Temp",
  "max_tokens": "Max Tokens",
  "daily_limit": "Daily Limit",
  "monthly_limit": "Monthly Limit",
  "search_results": "Max Search",
  "safety_level": "Safety Level",
  "allow_draft": "Allow Drafts",
  "allow_research": "Allow Items",
  "allow_snapshots": "Allow Snapshots",
  "prompt_version": "Prompt Version",
  "latest_runs": "Latest AI Runs",
  "safety_rules": "AI Safety & Compliance Rules",
  "rule_no_status": "AI cannot change request status.",
  "rule_no_external": "AI cannot send external messages.",
  "rule_no_payment": "AI cannot confirm payments.",
  "rule_no_unlock": "AI cannot unlock source details.",
  "rule_no_leak": "AI cannot expose hidden source data."
};

const arAIControl = {
  "page_title": "مركز التحكم بالذكاء الاصطناعي",
  "page_subtitle": "إدارة وكلاء الذكاء الاصطناعي، المزودين، الحدود، وسجلات العمليات.",
  "global_status": "حالة الذكاء الاصطناعي العامة",
  "enabled_agents": "الوكلاء المفعلون",
  "runs_today": "عمليات اليوم",
  "cost_today": "التكلفة التقديرية اليوم",
  "last_error": "آخر خطأ",
  "provider_status": "حالة بيئة المزودين",
  "agent_settings": "إعدادات الوكلاء",
  "edit_agent": "تعديل الوكيل",
  "test_agent": "اختبار الوكيل",
  "agent_name": "الوكيل",
  "enabled": "مفعل",
  "provider": "المزود",
  "model": "النموذج",
  "temperature": "الحرارة",
  "max_tokens": "أقصى رموز",
  "daily_limit": "الحد اليومي",
  "monthly_limit": "الحد الشهري",
  "search_results": "نتائج البحث",
  "safety_level": "مستوى الأمان",
  "allow_draft": "السماح بالمسودات",
  "allow_research": "السماح بالعناصر",
  "allow_snapshots": "السماح باللقطات",
  "prompt_version": "إصدار الموجه",
  "latest_runs": "آخر العمليات",
  "safety_rules": "قواعد الأمان والامتثال للذكاء الاصطناعي",
  "rule_no_status": "لا يمكن للذكاء الاصطناعي تغيير حالة الطلب.",
  "rule_no_external": "لا يمكن للذكاء الاصطناعي إرسال رسائل خارجية.",
  "rule_no_payment": "لا يمكن للذكاء الاصطناعي تأكيد المدفوعات.",
  "rule_no_unlock": "لا يمكن للذكاء الاصطناعي فتح تفاصيل المصدر.",
  "rule_no_leak": "لا يمكن للذكاء الاصطناعي كشف بيانات المصدر المخفية."
};

function updateDict(filePath, data) {
  const dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  dict.ai_control = data;
  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`Updated ${filePath}`);
}

updateDict(enPath, enAIControl);
updateDict(arPath, arAIControl);
