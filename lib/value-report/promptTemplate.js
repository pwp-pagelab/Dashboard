export const SYSTEM_PROMPT = `أنت كاتب تقارير في وكالة PWP. مهمتك تحويل أرقام أداء حملة إعلانية
(مُحسّبة مسبقاً ولا يجوز تعديلها) إلى نص عربي موجّه لصاحب القرار لدى العميل.

- استخدم لغة مباشرة وواضحة من دون مصطلحات تسويقية غير مشروحة.
- كل رقم يُذكر يجب نسخه حرفياً من كائن metrics. ممنوع حساب أو تقريب أو استنتاج رقم جديد.
- اكتب الأرقام كأرقام، لا بالكلمات، حتى يمكن التحقق منها آلياً.
- لا تفترض مبيعات أو إيرادات أو عائد استثمار غير موجود في البيانات.
- لا تضف مقارنات سكانية أو حقائق خارجية.
- ابدأ بالنتيجة ثم اشرح معناها العملي للعميل.
- أعد JSON فقط، مطابقاً للمخطط المطلوب، من دون Markdown أو نص خارجه.`

export function buildUserPrompt(metrics) {
  return `فيما يلي الأرقام المحسوبة لحملة "${metrics.clientName}" للفترة من
${metrics.periodStart} إلى ${metrics.periodEnd}:

${JSON.stringify(metrics, null, 2)}

اكتب نص كل حقل في مخطط JSON التالي، مع الالتزام بالأرقام الموجودة أعلاه فقط:

{
  "openingHook": "جملة أو جملتان تلخّصان الحملة بلغة صاحب القرار",
  "whyTrustLeadsNumber": "فقرة تشرح أن leads تشمل فقط النماذج المكتملة والمحادثات المباشرة الجديدة",
  "funnelNarrative": {
    "reachLine": "جملة تشرح reach بلغة مباشرة",
    "impressionsLine": "جملة تشرح avgFrequency",
    "clicksLine": "جملة تشرح clicksPer100Impressions",
    "leadsLine": "جملة تشرح leads بوصفها الحصيلة المسجلة",
    "closingNote": "جملة تشرح أن الانتقال بين مراحل القمع عملية تصفية"
  },
  "targetingSignals": {
    "engagementRateNote": "فقرة تقارن ctr مع ctrBenchmark؛ لا تدّعِ التفوق إلا إذا كانت ctrAboveBenchmark true",
    "budgetConcentrationNote": "فقرة عن topChannel وحصتها إن كانت متاحة",
    "channelPreferenceNote": "فقرة عن dmSharePct وformSharePct؛ إذا كانتا null استخدم قراءة عامة بلا أرقام",
    "costTrendNote": "فقرة عن costPerLeadTrend"
  },
  "remainingValueBullets": ["أربع جمل قصيرة عن الأصول القابلة للاستخدام بعد انتهاء الصرف، من دون افتراض مبيعات"],
  "remainingValueQuote": "جملة واحدة تؤكد أن قائمة العملاء المحتملين أصل قابل للمتابعة",
  "payoffIntro": "جملة تشرح فكرة جدول breakeven من دون افتراض أن التحويل حدث",
  "payoffClosing": "فقرة تشرح أن الجدول سيناريو تخطيطي وليس عائداً محققاً",
  "unmeasuredPhaseIntro": "فقرة تشرح أن ما يحدث بعد وصول العميل المحتمل لا تقيسه منصات الإعلان",
  "recommendations": ["أربع أو خمس توصيات عملية مبنية فقط على البيانات"],
  "conclusionSummaryLine": "جملة تلخّص days وspend وleads وcostPerLead بالأرقام نفسها",
  "conclusionParagraph": "فقرة ختامية عن دور الحملة والحاجة إلى ربط العملاء المحتملين بنتيجة المبيعات"
}`
}
