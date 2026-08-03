/**
 * Input shape: the same dashboard response used by the PDF report.
 *
 * {
 *   client: { name },
 *   filters: { range },
 *   summaryCards: [{ label, value }],
 *   campaignRows: [{ platform, spend, reach, impressions, clicks, conversions,
 *                    formSubmissions, directMessages }],
 *   exportRows: [{ platform, spendSar, reach, impressions, clicks, leads,
 *                  formSubmissions, directMessages }]
 * }
 *
 * Every number in the value report is produced here. The language model never
 * performs calculations.
 */

function numberFrom(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function divide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor
}

function summaryValue(rawReport, label) {
  const card = (rawReport?.summaryCards || []).find((item) => (
    String(item?.label || '').toLowerCase() === String(label).toLowerCase()
  ))
  return numberFrom(card?.value)
}

function normalizePlatformRows(rawReport) {
  const exportRows = Array.isArray(rawReport?.exportRows) ? rawReport.exportRows : []
  const sourceRows = exportRows.length
    ? exportRows
    : (Array.isArray(rawReport?.campaignRows) ? rawReport.campaignRows : [])

  return sourceRows.map((row) => ({
    platform: String(row?.platform || 'Other'),
    spend: numberFrom(row?.spendSar ?? row?.spend),
    reach: numberFrom(row?.reach),
    impressions: numberFrom(row?.impressions),
    clicks: numberFrom(row?.clicks),
    leads: numberFrom(row?.leads ?? row?.results ?? row?.conversions),
    formSubmissions: numberFrom(row?.formSubmissions ?? row?.leadBreakdown?.formSubmissions),
    directMessages: numberFrom(row?.directMessages ?? row?.leadBreakdown?.directMessages)
  }))
}

function aggregatePlatforms(rows) {
  const groups = new Map()

  rows.forEach((row) => {
    const current = groups.get(row.platform) || {
      platform: row.platform,
      spend: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      formSubmissions: 0,
      directMessages: 0
    }

    Object.keys(current).forEach((key) => {
      if (key !== 'platform') current[key] += row[key]
    })
    groups.set(row.platform, current)
  })

  const totals = Array.from(groups.values()).reduce((sum, row) => ({
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

  return Array.from(groups.values())
    .map((row) => ({
      ...row,
      ctrPercent: round(divide(row.clicks * 100, row.impressions)),
      clickToLeadPercent: round(divide(row.leads * 100, row.clicks)),
      costPerLead: round(divide(row.spend, row.leads)),
      spendSharePercent: round(divide(row.spend * 100, totals.spend)),
      clickSharePercent: round(divide(row.clicks * 100, totals.clicks)),
      leadSharePercent: round(divide(row.leads * 100, totals.leads))
    }))
    .sort((a, b) => b.spend - a.spend)
}

export function computeMetrics(rawReport = {}) {
  const rows = normalizePlatformRows(rawReport)
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
  const leads = summaryValue(rawReport, 'Results') || summaryValue(rawReport, 'Leads') || rowTotals.leads
  const formSubmissions = rowTotals.formSubmissions
  const directMessages = rowTotals.directMessages

  return {
    clientName: String(rawReport?.client?.name || rawReport?.clientName || 'العميل'),
    range: String(rawReport?.filters?.range || rawReport?.range || ''),
    generatedAt: new Date().toISOString(),
    totals: {
      spend: round(spend),
      reach: round(reach, 0),
      impressions: round(impressions, 0),
      clicks: round(clicks, 0),
      leads: round(leads, 0),
      formSubmissions: round(formSubmissions, 0),
      directMessages: round(directMessages, 0)
    },
    efficiency: {
      ctrPercent: round(divide(clicks * 100, impressions)),
      clickToLeadPercent: round(divide(leads * 100, clicks)),
      costPerClick: round(divide(spend, clicks)),
      costPerLead: round(divide(spend, leads)),
      frequency: round(divide(impressions, reach)),
      reachPerSar: round(divide(reach, spend))
    },
    breakEven: {
      minimumValuePerLead: leads > 0 ? round(divide(spend, leads)) : null,
      explanation: leads > 0
        ? 'Minimum gross value required from each recorded lead to recover media spend, before operating costs.'
        : 'A break-even value per lead cannot be calculated until at least one lead is recorded.'
    },
    funnel: [
      { stage: 'Impressions', value: round(impressions, 0), rateFromPreviousPercent: 100 },
      { stage: 'Clicks', value: round(clicks, 0), rateFromPreviousPercent: round(divide(clicks * 100, impressions)) },
      { stage: 'Leads', value: round(leads, 0), rateFromPreviousPercent: round(divide(leads * 100, clicks)) }
    ],
    leadMix: [
      {
        type: 'Form submissions',
        value: round(formSubmissions, 0),
        sharePercent: round(divide(formSubmissions * 100, leads))
      },
      {
        type: 'Direct messages',
        value: round(directMessages, 0),
        sharePercent: round(divide(directMessages * 100, leads))
      }
    ],
    platforms: aggregatePlatforms(rows)
  }
}
