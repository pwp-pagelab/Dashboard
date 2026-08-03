/**
 * Pure, deterministic math for the Arabic value report.
 *
 * Accepts either the normalized shape supplied with the original value-report
 * package or the dashboard response used by the current PDF report. The LLM
 * receives only the object returned by computeMetrics and never calculates a
 * figure.
 */

function numberFrom(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor
}

export function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)
  const milliseconds = endDate.getTime() - startDate.getTime()
  return Number.isFinite(milliseconds)
    ? Math.max(1, Math.round(milliseconds / (1000 * 60 * 60 * 24)))
    : 1
}

function divide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0
}

function dateOnly(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10)
}

function addUtcDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return dateOnly(date)
}

function summaryValue(rawReport, label) {
  const card = (rawReport?.summaryCards || []).find((item) => (
    String(item?.label || '').toLowerCase() === String(label).toLowerCase()
  ))
  return numberFrom(card?.value)
}

function collectReportedDates(rawReport) {
  const dates = []

  ;(rawReport?.exportRows || []).forEach((row) => {
    ;(row?.daily || []).forEach((day) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(day?.date || ''))) dates.push(day.date)
    })
    ;[row?.meta?.dateRange?.since, row?.meta?.dateRange?.until].forEach((date) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) dates.push(date)
    })
  })

  return dates.sort()
}

function inferPeriod(rawReport) {
  if (rawReport?.periodStart && rawReport?.periodEnd) {
    return {
      periodStart: String(rawReport.periodStart),
      periodEnd: String(rawReport.periodEnd)
    }
  }

  const reportedDates = collectReportedDates(rawReport)
  if (reportedDates.length) {
    return {
      periodStart: reportedDates[0],
      periodEnd: reportedDates[reportedDates.length - 1]
    }
  }

  const periodEnd = dateOnly(rawReport?.updatedAt || new Date())
  const range = String(rawReport?.filters?.range || rawReport?.range || '30d')
  const customMatch = /^custom:(\d{4}-\d{2}-\d{2})$/.exec(range)

  if (customMatch) return { periodStart: customMatch[1], periodEnd }
  if (range === '7d') return { periodStart: addUtcDays(periodEnd, -6), periodEnd }
  if (range === 'this_month') return { periodStart: `${periodEnd.slice(0, 7)}-01`, periodEnd }
  return { periodStart: addUtcDays(periodEnd, -29), periodEnd }
}

function normalizeRows(rawReport) {
  const exportRows = Array.isArray(rawReport?.exportRows) ? rawReport.exportRows : []
  const source = exportRows.length
    ? exportRows
    : (Array.isArray(rawReport?.campaignRows) ? rawReport.campaignRows : [])

  return source.map((row) => ({
    name: String(row?.platform || 'Other'),
    spend: numberFrom(row?.spendSar ?? row?.spend),
    reach: numberFrom(row?.reach),
    impressions: numberFrom(row?.impressions),
    clicks: numberFrom(row?.clicks),
    leads: numberFrom(row?.leads ?? row?.results ?? row?.conversions),
    formSubmissions: numberFrom(row?.formSubmissions ?? row?.leadBreakdown?.formSubmissions),
    directMessages: numberFrom(row?.directMessages ?? row?.leadBreakdown?.directMessages),
    daily: Array.isArray(row?.daily) ? row.daily : []
  }))
}

function aggregatePlatforms(rows) {
  const groups = new Map()

  rows.forEach((row) => {
    const current = groups.get(row.name) || { name: row.name, leads: 0 }
    current.leads += row.leads
    groups.set(row.name, current)
  })

  return Array.from(groups.values())
}

function inferCostPerLeadTrend(rows) {
  const daily = rows
    .flatMap((row) => row.daily)
    .filter((row) => row?.date)
    .map((row) => ({
      date: row.date,
      spend: numberFrom(row.spend),
      leads: numberFrom(row.leads ?? row.conversions)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (daily.length < 2) return 'flat'
  const splitAt = Math.max(1, Math.floor(daily.length / 2))
  const costFor = (period) => {
    const totals = period.reduce((sum, row) => ({
      spend: sum.spend + row.spend,
      leads: sum.leads + row.leads
    }), { spend: 0, leads: 0 })
    return totals.leads > 0 ? totals.spend / totals.leads : null
  }
  const firstCost = costFor(daily.slice(0, splitAt))
  const recentCost = costFor(daily.slice(splitAt))
  if (firstCost == null || recentCost == null) return 'flat'
  if (recentCost < firstCost * 0.95) return 'down'
  if (recentCost > firstCost * 1.05) return 'up'
  return 'flat'
}

export function normalizeValueReportInput(rawReport = {}) {
  if (
    rawReport.clientName &&
    rawReport.periodStart &&
    rawReport.periodEnd &&
    Number.isFinite(Number(rawReport.spend))
  ) {
    return {
      ...rawReport,
      spend: numberFrom(rawReport.spend),
      reach: numberFrom(rawReport.reach),
      impressions: numberFrom(rawReport.impressions),
      clicks: numberFrom(rawReport.clicks),
      ctr: numberFrom(rawReport.ctr),
      leads: numberFrom(rawReport.leads),
      costPerLead: numberFrom(rawReport.costPerLead)
    }
  }

  const rows = normalizeRows(rawReport)
  const rowTotals = rows.reduce((sum, row) => ({
    spend: sum.spend + row.spend,
    reach: sum.reach + row.reach,
    impressions: sum.impressions + row.impressions,
    clicks: sum.clicks + row.clicks,
    leads: sum.leads + row.leads,
    formSubmissions: sum.formSubmissions + row.formSubmissions,
    directMessages: sum.directMessages + row.directMessages
  }), {
    spend: 0,
    reach: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    formSubmissions: 0,
    directMessages: 0
  })
  const spend = summaryValue(rawReport, 'Total Spend') || rowTotals.spend
  const reach = summaryValue(rawReport, 'Reach') || rowTotals.reach
  const impressions = summaryValue(rawReport, 'Impressions') || rowTotals.impressions
  const clicks = summaryValue(rawReport, 'Clicks') || rowTotals.clicks
  const leads = summaryValue(rawReport, 'Leads') || summaryValue(rawReport, 'Results') || rowTotals.leads
  const period = inferPeriod(rawReport)

  return {
    clientName: String(rawReport?.client?.name || rawReport?.clientName || 'العميل'),
    ...period,
    spend,
    reach,
    impressions,
    clicks,
    ctr: summaryValue(rawReport, 'CTR') || divide(clicks * 100, impressions),
    leads,
    costPerLead: summaryValue(rawReport, 'Cost per Lead') || divide(spend, leads),
    leadsBySourceType: {
      formSubmissions: summaryValue(rawReport, 'Form Submissions') || rowTotals.formSubmissions,
      directMessages: summaryValue(rawReport, 'Direct Messages') || rowTotals.directMessages
    },
    platforms: aggregatePlatforms(rows),
    costPerLeadTrend: rawReport?.costPerLeadTrend || inferCostPerLeadTrend(rows),
    benchmarkCtrLow: numberFrom(rawReport?.benchmarkCtrLow) || 1,
    benchmarkCtrHigh: numberFrom(rawReport?.benchmarkCtrHigh) || 2,
    customerValueScenarios: Array.isArray(rawReport?.customerValueScenarios)
      ? rawReport.customerValueScenarios.map(numberFrom).filter((value) => value > 0)
      : [500, 1000, 2000, 5000]
  }
}

export function computeMetrics(rawReport = {}) {
  const raw = normalizeValueReportInput(rawReport)
  const {
    clientName,
    periodStart,
    periodEnd,
    spend,
    reach,
    impressions,
    clicks,
    ctr,
    leads,
    costPerLead,
    leadsBySourceType = { formSubmissions: 0, directMessages: 0 },
    platforms = [],
    costPerLeadTrend = 'flat',
    benchmarkCtrLow = 1,
    benchmarkCtrHigh = 2,
    customerValueScenarios = [500, 1000, 2000, 5000]
  } = raw

  const days = daysBetween(periodStart, periodEnd)
  const totalSourced = leadsBySourceType.formSubmissions + leadsBySourceType.directMessages
  const platformRows = platforms
    .filter((platform) => platform.leads > 0)
    .sort((a, b) => b.leads - a.leads)
    .map((platform) => ({
      name: platform.name,
      leads: platform.leads,
      sharePct: round(divide(platform.leads * 100, leads), 0)
    }))

  return {
    clientName,
    periodStart,
    periodEnd,
    days,
    spend: round(spend, 2),
    spendPerDay: round(divide(spend, days), 0),
    reach: round(reach, 0),
    impressions: round(impressions, 0),
    clicks: round(clicks, 0),
    ctr: round(ctr, 2),
    ctrBenchmark: { low: benchmarkCtrLow, high: benchmarkCtrHigh },
    ctrAboveBenchmark: ctr > benchmarkCtrHigh,
    leads: round(leads, 0),
    costPerLead: round(costPerLead || divide(spend, leads), 2),
    costPerLeadTrend,
    clickToLeadRate: round(divide(leads * 100, clicks), 2),
    leadShareOfImpressions: round(divide(leads * 100, impressions), 2),
    avgFrequency: round(divide(impressions, reach), 1),
    clicksPer100Impressions: round(divide(clicks * 100, impressions), 1),
    platformRows,
    topChannel: platformRows[0] || null,
    secondaryChannels: platformRows.slice(1),
    leadsBySourceType,
    dmSharePct: totalSourced
      ? round(divide(leadsBySourceType.directMessages * 100, totalSourced), 0)
      : null,
    formSharePct: totalSourced
      ? round(divide(leadsBySourceType.formSubmissions * 100, totalSourced), 0)
      : null,
    breakeven: customerValueScenarios.map((customerValue) => {
      const customersNeeded = customerValue > 0 ? Math.ceil(spend / customerValue) : 0
      return {
        customerValue,
        customersNeeded,
        pctOfLeads: round(divide(customersNeeded * 100, leads), 1)
      }
    })
  }
}
