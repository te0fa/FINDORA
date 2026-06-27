const fs = require('fs');
const path = require('path');

const enPath = path.join(process.cwd(), 'src/dictionaries/en.json');
const arPath = path.join(process.cwd(), 'src/dictionaries/ar.json');

const enAI = {
  "panel_title": "AI Staff Copilot",
  "disclaimer": "AI suggestions require staff review. AI cannot take final actions.",
  "btn_generate": "Generate AI Suggestion",
  "loading": "Consulting AI...",
  "disabled": "AI Copilot is currently disabled.",
  "tab_intake": "Intake",
  "tab_pricing": "Pricing",
  "tab_research": "Research Plan",
  "tab_report": "Report Helper",
  "tab_message": "Message Draft",
  "tab_safety": "Safety Check",
  "summary": "AI Summary",
  "suggestions": "Suggestions",
  "risks": "Risks & Warnings",
  "confidence": "Confidence",
  "apply_suggestion": "Apply Suggestion",
  "copy_draft": "Copy Draft",
  "safety_blocking": "BLOCKING: Security Leak Detected",
  "safety_safe": "SAFE: No leaks detected"
};

const arAI = {
  "panel_title": "مساعد الموظف الذكي (AI)",
  "disclaimer": "اقتراحات الذكاء الاصطناعي تتطلب مراجعة الموظف. لا يمكن للذكاء الاصطناعي اتخاذ إجراءات نهائية.",
  "btn_generate": "إنشاء اقتراح ذكي",
  "loading": "جاري استشارة الذكاء الاصطناعي...",
  "disabled": "مساعد الذكاء الاصطناعي معطل حالياً.",
  "tab_intake": "تحليل الطلب",
  "tab_pricing": "اقتراح التسعير",
  "tab_research": "خطة البحث",
  "tab_report": "مساعد التقرير",
  "tab_message": "مسودة الرسالة",
  "tab_safety": "فحص الأمان",
  "summary": "ملخص الذكاء الاصطناعي",
  "suggestions": "الاقتراحات",
  "risks": "المخاطر والتحذيرات",
  "confidence": "مستوى الثقة",
  "apply_suggestion": "تطبيق الاقتراح",
  "copy_draft": "نسخ المسودة",
  "safety_blocking": "حظر: تم اكتشاف تسريب بيانات أمنية",
  "safety_safe": "آمن: لم يتم اكتشاف تسريبات"
};

function updateDict(filePath, aiData) {
  const dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  dict.ai_copilot = aiData;
  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`Updated ${filePath}`);
}

updateDict(enPath, enAI);
updateDict(arPath, arAI);
