import { SYSTEM_PROMPT, buildUserPrompt } from './promptTemplate.js'

function fallbackNarrative(metrics) {
  const topChannel = metrics.topChannel
  const dmAvailable = metrics.dmSharePct != null && metrics.formSharePct != null
  const trendText = metrics.costPerLeadTrend === 'down'
    ? 'انخفضت تكلفة العميل المحتمل في الجزء الأحدث من الفترة، ما يشير إلى تحسن الكفاءة.'
    : metrics.costPerLeadTrend === 'up'
      ? 'ارتفعت تكلفة العميل المحتمل في الجزء الأحدث من الفترة، لذا يلزم فحص جودة الاستهداف والرسائل.'
      : 'بقي اتجاه تكلفة العميل المحتمل مستقراً تقريباً خلال الفترة المتاحة.'

  return {
    openingHook: `حقق الإنفاق البالغ ${metrics.spend} ريال ${metrics.leads} عميلاً محتملاً مسجلاً، بمتوسط تكلفة ${metrics.costPerLead} ريال للعميل المحتمل.`,
    whyTrustLeadsNumber: 'لا يشمل رقم العملاء المحتملين الإعجابات أو المشاهدات أو النقرات وحدها؛ بل يعتمد على النماذج المكتملة والمحادثات المباشرة الجديدة التي سجلتها منصات الإعلان.',
    funnelNarrative: {
      reachLine: `وصل الإعلان إلى ${metrics.reach} شخصاً مختلفاً خلال الفترة.`,
      impressionsLine: `بلغ متوسط تكرار الظهور ${metrics.avgFrequency} مرة لكل شخص تم الوصول إليه.`,
      clicksLine: `حقق الإعلان ${metrics.clicksPer100Impressions} نقرة لكل 100 ظهور.`,
      leadsLine: `انتهى القمع عند ${metrics.leads} عميلاً محتملاً مسجلاً عبر النماذج أو الرسائل المباشرة.`,
      closingNote: 'الانخفاض بين المراحل يعكس تصفية الجمهور من الظهور إلى الاهتمام ثم إلى طلب تواصل مسجل.'
    },
    targetingSignals: {
      engagementRateNote: metrics.ctrAboveBenchmark
        ? `بلغ معدل النقر ${metrics.ctr}، وهو أعلى من الحد الأعلى المرجعي البالغ ${metrics.ctrBenchmark.high}.`
        : `بلغ معدل النقر ${metrics.ctr} مقارنة بالنطاق المرجعي من ${metrics.ctrBenchmark.low} إلى ${metrics.ctrBenchmark.high}، ويجب قراءة ذلك مع جودة العملاء المحتملين.`,
      budgetConcentrationNote: topChannel
        ? `كانت ${topChannel.name} أكبر مصدر للعملاء المحتملين، إذ سجلت ${topChannel.leads} عميلاً محتملاً بحصة ${topChannel.sharePct} من الإجمالي.`
        : 'لا توجد قناة واحدة مسجلة كمصدر للعملاء المحتملين في البيانات المتاحة.',
      channelPreferenceNote: dmAvailable
        ? `شكّلت الرسائل المباشرة ${metrics.dmSharePct} من العملاء المحتملين، مقابل ${metrics.formSharePct} للنماذج؛ لذلك تؤثر سرعة الرد وجودة المتابعة في الاستفادة من الطلب.`
        : 'تحتاج قراءة تفضيل قنوات التواصل إلى فصل النماذج المكتملة عن الرسائل المباشرة في بيانات المنصة.',
      costTrendNote: trendText
    },
    remainingValueBullets: [
      `قائمة تضم ${metrics.leads} عميلاً محتملاً مسجلاً يمكن متابعة حالته.`,
      'معرفة أوضح بالقنوات التي أسهمت فعلياً في طلبات التواصل.',
      'مرجع لتكلفة العميل المحتمل يمكن استخدامه في مقارنة الفترات القادمة.',
      'بيانات قمع تساعد على تحديد المرحلة التي تحتاج إلى تحسين.'
    ],
    remainingValueQuote: 'قائمة العملاء المحتملين أصل تشغيلي يمكن الاستفادة منه عبر المتابعة المنظمة، حتى بعد توقف الإنفاق.',
    payoffIntro: 'يعرض الجدول عدد العملاء الفعليين المطلوبين لتغطية الإنفاق عند قيم مختلفة للعميل، بوصفه سيناريو تخطيطياً لا نتيجة مبيعات محققة.',
    payoffClosing: 'توضح السيناريوهات الحد الأدنى المطلوب لتغطية الإنفاق، ويظل إثبات العائد الفعلي مرتبطاً بتسجيل المبيعات وقيمتها.',
    unmeasuredPhaseIntro: 'ينتهي قياس منصات الإعلان عند وصول العميل المحتمل. أما سرعة الرد، وجودة التأهيل، والتحول إلى بيع فعلي فتحتاج إلى متابعة داخلية منفصلة.',
    recommendations: [
      'سجلوا نتيجة كل نموذج ومحادثة في مصدر واحد يمكن مراجعته.',
      'قارنوا القنوات بناءً على جودة العملاء المحتملين، لا عددهم فقط.',
      'ضعوا معياراً واضحاً لسرعة الرد على الرسائل وطلبات التواصل.',
      'اربطوا بيانات الحملات بنتائج المبيعات لقياس العائد الفعلي.',
      'راجعوا اتجاه تكلفة العميل المحتمل في فترة القياس التالية قبل توسيع الميزانية.'
    ],
    conclusionSummaryLine: `${metrics.days} يوماً · ${metrics.spend} ريال · ${metrics.leads} عميلاً محتملاً · ${metrics.costPerLead} ريال للعميل المحتمل.`,
    conclusionParagraph: 'أدت الحملة دورها في توليد طلبات تواصل قابلة للقياس. وتكتمل قراءة القيمة عند ربط هذه الطلبات بنتائج المتابعة والمبيعات داخل الجهة.'
  }
}

function normalizeDigits(value) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[٬,]/g, '')
    .replace(/٫/g, '.')
}

function collectAllowedNumbers(value, numbers = new Set()) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    numbers.add(roundForComparison(value))
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectAllowedNumbers(item, numbers))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectAllowedNumbers(item, numbers))
  }
  return numbers
}

function roundForComparison(value) {
  return Math.round(Number(value) * 100) / 100
}

function usesOnlyComputedNumbers(narrative, metrics) {
  const allowed = collectAllowedNumbers(metrics)
  allowed.add(100)
  const tokens = JSON.stringify(narrative).match(/[0-9٠-٩][0-9٠-٩.,٬٫]*/g) || []
  return tokens.every((token) => {
    const parsed = Number(normalizeDigits(token))
    return Number.isFinite(parsed) && allowed.has(roundForComparison(parsed))
  })
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeNarrative(value, metrics) {
  const narrative = {
    openingHook: String(value?.openingHook || '').trim(),
    whyTrustLeadsNumber: String(value?.whyTrustLeadsNumber || '').trim(),
    funnelNarrative: {
      reachLine: String(value?.funnelNarrative?.reachLine || '').trim(),
      impressionsLine: String(value?.funnelNarrative?.impressionsLine || '').trim(),
      clicksLine: String(value?.funnelNarrative?.clicksLine || '').trim(),
      leadsLine: String(value?.funnelNarrative?.leadsLine || '').trim(),
      closingNote: String(value?.funnelNarrative?.closingNote || '').trim()
    },
    targetingSignals: {
      engagementRateNote: String(value?.targetingSignals?.engagementRateNote || '').trim(),
      budgetConcentrationNote: String(value?.targetingSignals?.budgetConcentrationNote || '').trim(),
      channelPreferenceNote: String(value?.targetingSignals?.channelPreferenceNote || '').trim(),
      costTrendNote: String(value?.targetingSignals?.costTrendNote || '').trim()
    },
    remainingValueBullets: Array.isArray(value?.remainingValueBullets)
      ? value.remainingValueBullets.slice(0, 4).map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    remainingValueQuote: String(value?.remainingValueQuote || '').trim(),
    payoffIntro: String(value?.payoffIntro || '').trim(),
    payoffClosing: String(value?.payoffClosing || '').trim(),
    unmeasuredPhaseIntro: String(value?.unmeasuredPhaseIntro || '').trim(),
    recommendations: Array.isArray(value?.recommendations)
      ? value.recommendations.slice(0, 5).map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    conclusionSummaryLine: String(value?.conclusionSummaryLine || '').trim(),
    conclusionParagraph: String(value?.conclusionParagraph || '').trim()
  }

  const textFields = [
    narrative.openingHook,
    narrative.whyTrustLeadsNumber,
    ...Object.values(narrative.funnelNarrative),
    ...Object.values(narrative.targetingSignals),
    ...narrative.remainingValueBullets,
    narrative.remainingValueQuote,
    narrative.payoffIntro,
    narrative.payoffClosing,
    narrative.unmeasuredPhaseIntro,
    ...narrative.recommendations,
    narrative.conclusionSummaryLine,
    narrative.conclusionParagraph
  ]
  const complete = textFields.every(validText) &&
    narrative.remainingValueBullets.length >= 3 &&
    narrative.recommendations.length >= 4

  return complete && usesOnlyComputedNumbers(narrative, metrics) ? narrative : null
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
  if (!apiKey) return { ...fallbackNarrative(metrics), source: 'fallback' }

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
        max_tokens: 4000,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(metrics) }]
      })
    })

    if (!response.ok) throw new Error(`Anthropic request failed with ${response.status}`)
    const payload = await response.json()
    const text = (payload?.content || [])
      .filter((item) => item?.type === 'text')
      .map((item) => item.text)
      .join('\n')
    const narrative = normalizeNarrative(extractJson(text), metrics)
    if (!narrative) throw new Error('Narrative schema or numeric validation failed.')
    return { ...narrative, source: 'anthropic' }
  } catch (error) {
    console.error('Value report narrative fallback:', error.message)
    return { ...fallbackNarrative(metrics), source: 'fallback' }
  }
}

export { fallbackNarrative }
