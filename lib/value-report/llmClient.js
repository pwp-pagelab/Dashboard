import { buildValueReportPrompt } from './promptTemplate.js'

const FALLBACK_NARRATIVE = {
  executiveSummary: 'يعرض التقرير صورة موحدة لأداء الاستثمار الإعلاني خلال الفترة المحددة، مع ربط الإنفاق بالوصول والتفاعل والعملاء المحتملين المسجلين.',
  performanceNarrative: 'توضح قراءة القمع أين يتحول الظهور إلى نقرات ثم إلى طلبات تواصل فعلية، بينما يبين توزيع المنصات مساهمة كل قناة في النتائج.',
  breakEvenNarrative: 'يعرض مؤشر التعادل الحد الأدنى من القيمة الإجمالية المطلوبة من كل عميل محتمل لتغطية الإنفاق الإعلامي، من دون افتراض مبيعات أو تكاليف تشغيلية غير متاحة.',
  recommendations: [
    'حافظوا على دقة تتبع النماذج والمحادثات قبل اتخاذ قرارات التوسع.',
    'قارنوا جودة العملاء المحتملين بين المنصات إلى جانب تكلفة الحصول عليهم.',
    'أعيدوا توزيع الميزانية تدريجياً نحو القنوات التي تجمع بين الكفاءة وجودة الطلب.'
  ],
  conclusion: 'تتحسن قيمة التقرير عند ربط العملاء المحتملين لاحقاً بنتائج المبيعات الفعلية، مع إبقاء أرقام الإنفاق والأداء مصدرها منصات الإعلان.'
}

function hasDigits(value) {
  return /[0-9٠-٩]/.test(JSON.stringify(value))
}

function normalizeNarrative(value) {
  const narrative = {
    executiveSummary: String(value?.executiveSummary || '').trim(),
    performanceNarrative: String(value?.performanceNarrative || '').trim(),
    breakEvenNarrative: String(value?.breakEvenNarrative || '').trim(),
    recommendations: Array.isArray(value?.recommendations)
      ? value.recommendations.slice(0, 3).map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    conclusion: String(value?.conclusion || '').trim()
  }

  const isComplete = narrative.executiveSummary &&
    narrative.performanceNarrative &&
    narrative.breakEvenNarrative &&
    narrative.recommendations.length === 3 &&
    narrative.conclusion

  return isComplete && !hasDigits(narrative) ? narrative : null
}

function extractJson(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

export async function writeValueReportNarrative(metrics, {
  apiKey = process.env.ANTHROPIC_API_KEY,
  fetchImpl = fetch
} = {}) {
  if (!apiKey) return { ...FALLBACK_NARRATIVE, source: 'fallback' }

  try {
    const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 1200,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: buildValueReportPrompt(metrics)
        }]
      })
    })

    if (!response.ok) throw new Error(`Anthropic request failed with ${response.status}`)
    const payload = await response.json()
    const text = (payload?.content || [])
      .filter((item) => item?.type === 'text')
      .map((item) => item.text)
      .join('\n')
    const narrative = normalizeNarrative(extractJson(text))
    if (!narrative) throw new Error('The narrative response did not pass numeric-safety validation.')
    return { ...narrative, source: 'anthropic' }
  } catch (error) {
    console.error('Value report narrative fallback:', error.message)
    return { ...FALLBACK_NARRATIVE, source: 'fallback' }
  }
}

export { FALLBACK_NARRATIVE }
