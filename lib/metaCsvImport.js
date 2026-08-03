const HEADER_ALIASES = {
  date: ['reporting starts', 'reporting start', 'day', 'date', 'start date', 'بداية إعداد التقارير', 'اليوم', 'التاريخ'],
  campaign: ['campaign name', 'campaign', 'ad set name', 'ad name', 'اسم الحملة', 'الحملة', 'اسم مجموعة الإعلانات', 'اسم الإعلان'],
  spend: ['amount spent sar', 'amount spent', 'spend sar', 'spend', 'المبلغ الذي تم إنفاقه ر س', 'المبلغ الذي تم إنفاقه', 'الإنفاق'],
  reach: ['reach', 'الوصول'],
  impressions: ['impressions', 'مرات الظهور'],
  clicks: ['link clicks', 'outbound clicks', 'clicks all', 'clicks', 'نقرات الرابط', 'النقرات على الرابط', 'النقرات الكل', 'النقرات'],
  forms: ['meta leads', 'on facebook leads', 'instant form leads', 'website leads', 'leads', 'عملاء محتملون', 'العملاء المحتملون'],
  messages: [
    'messaging conversations started',
    'new messaging connections',
    'messaging contacts',
    'conversations started',
    'direct messages',
    'بدء محادثات عبر المراسلة',
    'جهات اتصال عبر المراسلة',
    'الرسائل المباشرة'
  ],
  results: ['results', 'النتائج'],
  resultType: ['result indicator', 'result type', 'results type', 'مؤشر النتيجة', 'نوع النتيجة'],
  age: ['age', 'age range', 'العمر', 'الفئة العمرية'],
  gender: ['gender', 'الجنس'],
  country: ['country', 'country name', 'البلد', 'الدولة'],
  region: ['region', 'region name', 'المنطقة', 'اسم المنطقة'],
  city: ['city', 'city name', 'المدينة', 'اسم المدينة'],
  device: ['device platform', 'device', 'platform device', 'منصة الجهاز', 'الجهاز'],
  publisherPlatform: ['publisher platform', 'platform', 'منصة الناشر', 'المنصة'],
  placement: ['placement', 'platform position', 'position', 'موضع الإعلان', 'موضع المنصة', 'الموضع']
}

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[_()[\]{}]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/, 1)[0] || ''
  const candidates = [',', '\t', ';']
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter
}

function parseDelimited(text, delimiter) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (!quoted && character === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => String(value).trim())) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += character
  }

  row.push(cell)
  if (row.some((value) => String(value).trim())) rows.push(row)
  return rows
}

function findHeaderIndex(headers, aliases) {
  for (const alias of aliases) {
    const index = headers.indexOf(alias)
    if (index >= 0) return index
  }
  return -1
}

function parseNumber(value) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '-' || raw.toLowerCase() === 'n/a') return 0

  let cleaned = raw.replace(/[^\d,.-]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')
      ? cleaned.replace(/,/g, '')
      : cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',')
    cleaned = parts.length === 2 && parts[1].length <= 2
      ? `${parts[0]}.${parts[1]}`
      : parts.join('')
  }

  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

function formatDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashMatch) {
    const first = Number(slashMatch[1])
    const second = Number(slashMatch[2])
    const month = first > 12 ? second : first
    const day = first > 12 ? first : second
    return `${slashMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-')
}

function getRangeStart(range, now = new Date()) {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (String(range || '').startsWith('custom:')) {
    return String(range).slice('custom:'.length)
  }

  if (range === 'this_month') {
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`
  }

  if (range === '7d' || range === '30d') {
    const start = new Date(end)
    start.setDate(start.getDate() - (range === '7d' ? 6 : 29))
    return [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
      String(start.getDate()).padStart(2, '0')
    ].join('-')
  }

  return ''
}

function aggregateRows(rows) {
  return rows.reduce((totals, row) => {
    totals.spend += row.spend
    totals.reach += row.reach
    totals.impressions += row.impressions
    totals.clicks += row.clicks
    totals.formSubmissions += row.formSubmissions
    totals.directMessages += row.directMessages
    return totals
  }, {
    spend: 0,
    reach: 0,
    impressions: 0,
    clicks: 0,
    formSubmissions: 0,
    directMessages: 0
  })
}

function groupRows(rows, keyForRow) {
  const grouped = new Map()
  rows.forEach((row) => {
    const key = keyForRow(row)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  })
  return grouped
}

function formatSar(value) {
  return `SAR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatInteger(value) {
  return Math.round(Number(value || 0)).toLocaleString()
}

function buildDailyRows(rows) {
  const dated = rows.filter((row) => row.date)
  return Array.from(groupRows(dated, (row) => row.date).entries())
    .map(([date, dateRows]) => {
      const totals = aggregateRows(dateRows)
      return {
        date,
        spend: totals.spend,
        conversions: totals.formSubmissions + totals.directMessages
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

function buildAudienceBreakdown(rows) {
  const dimensions = [
    ['Age', 'age'],
    ['Gender', 'gender'],
    ['Country', 'country'],
    ['Region', 'region'],
    ['City', 'city'],
    ['Device', 'device'],
    ['Platform', 'publisherPlatform'],
    ['Placement', 'placement']
  ]
  const breakdown = []

  dimensions.forEach(([dimension, key]) => {
    const segmentedRows = rows.filter((row) => row.audience?.[key])
    if (!segmentedRows.length) return

    groupRows(segmentedRows, (row) => row.audience[key]).forEach((segmentRows, segment) => {
      const totals = aggregateRows(segmentRows)
      breakdown.push({
        dimension,
        segment,
        spend: totals.spend,
        reach: totals.reach,
        impressions: totals.impressions,
        clicks: totals.clicks,
        leads: totals.formSubmissions + totals.directMessages,
        formSubmissions: totals.formSubmissions,
        directMessages: totals.directMessages
      })
    })
  })

  return breakdown
}

export function parseMetaCsv(text, {
  accountId = '640964945046086',
  accountName = 'Cloud Chefs',
  fileName = 'Meta report.csv',
  uploadedAt = new Date().toISOString()
} = {}) {
  const rawRows = parseDelimited(String(text || ''), detectDelimiter(text))
  if (rawRows.length < 2) throw new Error('The CSV does not contain any report rows.')

  const headers = rawRows[0].map(normalizeHeader)
  const indexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findHeaderIndex(headers, aliases)])
  )

  if (indexes.spend < 0 && indexes.impressions < 0 && indexes.clicks < 0) {
    throw new Error('This does not look like a Meta Ads report. Include Amount spent, Impressions, or Clicks.')
  }

  const rows = rawRows.slice(1).map((values) => {
    const resultType = indexes.resultType >= 0 ? String(values[indexes.resultType] || '').toLowerCase() : ''
    const explicitForms = indexes.forms >= 0 ? parseNumber(values[indexes.forms]) : 0
    const explicitMessages = indexes.messages >= 0 ? parseNumber(values[indexes.messages]) : 0
    const genericResults = indexes.results >= 0 ? parseNumber(values[indexes.results]) : 0
    const genericIsMessage = /messag|conversation|contact|محادث|مراسلة|رسائل|جهات اتصال/.test(resultType)
    const genericIsLead = /lead|form|registration|عميل|عملاء|نموذج|تسجيل/.test(resultType)

    return {
      date: indexes.date >= 0 ? formatDate(values[indexes.date]) : '',
      campaign: indexes.campaign >= 0
        ? String(values[indexes.campaign] || '').trim() || accountName
        : accountName,
      spend: indexes.spend >= 0 ? parseNumber(values[indexes.spend]) : 0,
      reach: indexes.reach >= 0 ? parseNumber(values[indexes.reach]) : 0,
      impressions: indexes.impressions >= 0 ? parseNumber(values[indexes.impressions]) : 0,
      clicks: indexes.clicks >= 0 ? parseNumber(values[indexes.clicks]) : 0,
      formSubmissions: explicitForms || (genericIsLead && !genericIsMessage ? genericResults : 0),
      directMessages: explicitMessages || (genericIsMessage ? genericResults : 0),
      audience: {
        age: indexes.age >= 0 ? String(values[indexes.age] || '').trim() : '',
        gender: indexes.gender >= 0 ? String(values[indexes.gender] || '').trim() : '',
        country: indexes.country >= 0 ? String(values[indexes.country] || '').trim() : '',
        region: indexes.region >= 0 ? String(values[indexes.region] || '').trim() : '',
        city: indexes.city >= 0 ? String(values[indexes.city] || '').trim() : '',
        device: indexes.device >= 0 ? String(values[indexes.device] || '').trim() : '',
        publisherPlatform: indexes.publisherPlatform >= 0 ? String(values[indexes.publisherPlatform] || '').trim() : '',
        placement: indexes.placement >= 0 ? String(values[indexes.placement] || '').trim() : ''
      }
    }
  }).filter((row) => (
    row.spend || row.reach || row.impressions || row.clicks ||
    row.formSubmissions || row.directMessages
  ))

  if (!rows.length) throw new Error('The Meta CSV contains no usable metric rows.')

  return {
    version: 1,
    platform: 'Meta',
    accountId: String(accountId),
    accountName,
    fileName,
    uploadedAt,
    rows
  }
}

export function applyMetaImportToDashboard(data, metaImport, { range = '30d', platform = 'all', now = new Date() } = {}) {
  if (!data || !metaImport || data?.client?.id !== 'cloud-chefs') return data
  if (platform !== 'all' && platform !== 'meta') return data

  const rangeStart = getRangeStart(range, now)
  const rangedRows = metaImport.rows.filter((row) => !row.date || !rangeStart || row.date >= rangeStart)
  const campaigns = Array.from(groupRows(rangedRows, (row) => row.campaign || metaImport.accountName).entries())
  const importedCampaignRows = campaigns.map(([campaign, rows]) => {
    const totals = aggregateRows(rows)
    const leads = totals.formSubmissions + totals.directMessages
    return {
      platform: 'Meta',
      campaign: `${campaign} (uploaded)`,
      spend: formatSar(totals.spend),
      reach: formatInteger(totals.reach),
      engagements: '0',
      videoViews: '0',
      clicks: formatInteger(totals.clicks),
      conversions: formatInteger(leads),
      leads: formatInteger(leads),
      formSubmissions: Math.round(totals.formSubmissions),
      directMessages: Math.round(totals.directMessages),
      platformResults: formatInteger(leads),
      conversionLabel: 'Leads (forms + messages)',
      conversionBreakdown: {
        leads: totals.formSubmissions,
        messagingConversations: totals.directMessages
      },
      leadBreakdown: {
        totalLeads: leads,
        formSubmissions: totals.formSubmissions,
        directMessages: totals.directMessages
      }
    }
  })

  const importedExportRows = campaigns.map(([campaign, rows]) => {
    const totals = aggregateRows(rows)
    const leads = totals.formSubmissions + totals.directMessages
    return {
      platform: 'Meta',
      accountName: `${campaign} (uploaded)`,
      spendSar: totals.spend,
      originalSpend: totals.spend,
      originalCurrencyCode: 'SAR',
      spendConversionRate: 1,
      spendNote: `Uploaded from ${metaImport.fileName}.`,
      reach: totals.reach,
      impressions: totals.impressions,
      clicks: totals.clicks,
      engagements: 0,
      videoViews: 0,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpcSar: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      results: leads,
      platformResults: leads,
      leads,
      formSubmissions: totals.formSubmissions,
      directMessages: totals.directMessages,
      leadBreakdown: {
        totalLeads: leads,
        formSubmissions: totals.formSubmissions,
        directMessages: totals.directMessages
      },
      resultType: 'Uploaded Meta leads',
      rawMetrics: { source: 'manual_csv', fileName: metaImport.fileName },
      daily: buildDailyRows(rows),
      audienceBreakdown: buildAudienceBreakdown(rows),
      meta: {
        accountId: metaImport.accountId,
        accountName: metaImport.accountName,
        businessKey: 'MANUAL_UPLOAD',
        dateRange: {
          since: rangeStart || null,
          until: null
        }
      }
    }
  })

  const exportRows = [
    ...(Array.isArray(data.exportRows) ? data.exportRows : []).filter((row) => row.platform !== 'Meta'),
    ...importedExportRows
  ]
  const campaignRows = [
    ...(Array.isArray(data.campaignRows) ? data.campaignRows : []).filter((row) => row.platform !== 'Meta'),
    ...importedCampaignRows
  ]
  const totals = exportRows.reduce((acc, row) => {
    acc.spend += Number(row.spendSar || 0)
    acc.reach += Number(row.reach || 0)
    acc.impressions += Number(row.impressions || 0)
    acc.clicks += Number(row.clicks || 0)
    acc.formSubmissions += Number(row.formSubmissions || 0)
    acc.directMessages += Number(row.directMessages || 0)
    return acc
  }, {
    spend: 0,
    reach: 0,
    impressions: 0,
    clicks: 0,
    formSubmissions: 0,
    directMessages: 0
  })
  const leads = totals.formSubmissions + totals.directMessages
  const importedTotals = aggregateRows(rangedRows)
  const importedLeads = importedTotals.formSubmissions + importedTotals.directMessages
  const activePlatforms = new Set(exportRows.filter((row) => (
    Number(row.spendSar || 0) || Number(row.impressions || 0) || Number(row.clicks || 0) || Number(row.leads || 0)
  )).map((row) => row.platform)).size
  const summaryValues = {
    'Total Spend': formatSar(totals.spend),
    Reach: totals.reach > 0 ? formatInteger(totals.reach) : 'N/A',
    Impressions: formatInteger(totals.impressions),
    Clicks: formatInteger(totals.clicks),
    CTR: `${(totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0).toFixed(2)}%`,
    Leads: formatInteger(leads),
    'Form Submissions': formatInteger(totals.formSubmissions),
    'Direct Messages': formatInteger(totals.directMessages),
    'Cost per Lead': leads > 0 ? formatSar(totals.spend / leads) : 'N/A',
    'Lead Rate': `${(totals.clicks > 0 ? (leads / totals.clicks) * 100 : 0).toFixed(2)}%`,
    'Platforms Active': String(activePlatforms)
  }
  const existingCards = Array.isArray(data.summaryCards) ? data.summaryCards : []
  const summaryCards = existingCards.map((card) => (
    Object.hasOwn(summaryValues, card.label) ? { ...card, value: summaryValues[card.label] } : card
  ))
  Object.entries(summaryValues).forEach(([label, value]) => {
    if (!summaryCards.some((card) => card.label === label)) summaryCards.push({ label, value })
  })

  const platformTotals = exportRows.reduce((acc, row) => {
    const key = String(row.platform || '').toLowerCase().replace(/\s+/g, '_')
    const current = acc[key] || { spend: 0, leads: 0, forms: 0, messages: 0 }
    current.spend += Number(row.spendSar || 0)
    current.leads += Number(row.leads || 0)
    current.forms += Number(row.formSubmissions || 0)
    current.messages += Number(row.directMessages || 0)
    acc[key] = current
    return acc
  }, {})
  const platformSplit = Object.fromEntries(Object.entries(platformTotals).map(([key, value]) => [
    key,
    {
      spend: formatSar(value.spend),
      conversions: formatInteger(value.leads),
      leads: formatInteger(value.leads),
      formSubmissions: formatInteger(value.forms),
      directMessages: formatInteger(value.messages)
    }
  ]))
  const daily = Array.from(groupRows(
    exportRows.flatMap((row) => Array.isArray(row.daily) ? row.daily : []),
    (row) => row.date
  ).entries()).map(([date, rows]) => ({
    date,
    spend: rows.reduce((sum, row) => sum + Number(row.spend || 0), 0),
    conversions: rows.reduce((sum, row) => sum + Number(row.conversions || 0), 0)
  })).sort((a, b) => a.date.localeCompare(b.date))

  const metaStatusId = `meta:cloud-chefs:${metaImport.accountId}`
  const otherStatuses = (Array.isArray(data.accountStatuses) ? data.accountStatuses : [])
    .filter((status) => status.platform !== 'meta')
  const accountStatuses = [
    ...otherStatuses,
    {
      id: metaStatusId,
      platform: 'meta',
      platformLabel: 'Meta',
      clientId: 'cloud-chefs',
      clientName: 'Cloud Chefs',
      accountId: metaImport.accountId,
      accountName: metaImport.accountName,
      status: rangedRows.length ? 'loaded' : 'no_data',
      message: rangedRows.length
        ? `Uploaded Meta report · ${metaImport.fileName}`
        : `The uploaded Meta report has no rows in the selected date range · ${metaImport.fileName}`,
      spend: importedTotals.spend,
      currencyCode: 'SAR',
      conversionBreakdown: {
        leads: importedTotals.formSubmissions,
        messagingConversations: importedTotals.directMessages
      }
    }
  ]
  const accountOptions = (Array.isArray(data.accountOptions) ? data.accountOptions : []).map((option) => (
    option.platform === 'meta' && option.clientId === 'cloud-chefs'
      ? {
          ...option,
          id: metaStatusId,
          accountId: metaImport.accountId,
          accountName: metaImport.accountName
        }
      : option
  ))
  const loadedAccounts = accountStatuses.filter((status) => status.status === 'loaded').length
  const noDataAccounts = accountStatuses.filter((status) => status.status === 'no_data').length
  const failedAccounts = accountStatuses.filter((status) => status.status === 'error').length

  return {
    ...data,
    updatedAt: metaImport.uploadedAt,
    summaryCards,
    campaignRows,
    exportRows,
    platformSplit,
    accountOptions,
    accountStatuses,
    dataQuality: {
      ...(data.dataQuality || {}),
      selectedAccounts: accountStatuses.length,
      loadedAccounts,
      noDataAccounts,
      failedAccounts
    },
    trends: { ...(data.trends || {}), daily },
    diagnostics: {
      ...(data.diagnostics || {}),
      meta: {
        source: 'manual_csv',
        fileName: metaImport.fileName,
        uploadedAt: metaImport.uploadedAt,
        account: {
          id: metaImport.accountId,
          name: metaImport.accountName,
          businessKey: 'MANUAL_UPLOAD'
        },
        spend: importedTotals.spend,
        leads: importedLeads
      }
    },
    insights: {
      ...(data.insights || {}),
      suggested: `${data.client.name} spent ${formatSar(totals.spend)} and generated ${formatInteger(totals.impressions)} impressions, ${formatInteger(totals.clicks)} clicks, and ${formatInteger(leads)} leads in the selected period. Meta figures include the uploaded report ${metaImport.fileName}.`
    },
    manualImports: {
      ...(data.manualImports || {}),
      meta: {
        fileName: metaImport.fileName,
        uploadedAt: metaImport.uploadedAt,
        rowCount: rangedRows.length,
        accountId: metaImport.accountId
      }
    }
  }
}
