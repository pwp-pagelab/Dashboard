import { getClientById } from '../data/clients.js'

function safeNum(value) {
  return Number(value || 0)
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function getDateRange(range, client) {
  const endDate = new Date()
  const startDate = new Date()

  if (range === '7d') {
    startDate.setDate(endDate.getDate() - 7)
  } else if (range === 'this_month') {
    startDate.setDate(1)
  } else if (range === 'max' && client?.reportingStartDate) {
    startDate.setTime(new Date(client.reportingStartDate).getTime())
  } else {
    startDate.setDate(endDate.getDate() - 30)
  }

  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  }
}

function toEpochRange(start, end) {
  const startMs = new Date(`${start}T00:00:00.000Z`).getTime()
  const endMs = new Date(`${end}T23:59:59.999Z`).getTime()
  return { startMs, endMs }
}

function sumAnalytics(elements = []) {
  return elements.reduce(
    (acc, row) => {
      acc.impressions += safeNum(row.impressions)
      acc.clicks += safeNum(row.clicks)
      acc.spend += safeNum(row.costInLocalCurrency)
      acc.conversions += safeNum(row.conversions)
      return acc
    },
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0
    }
  )
}

export async function getLinkedInData({ clientId, range = '30d' } = {}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  if (!accessToken) return null

  const client = getClientById(clientId)
  if (!client?.linkedinAccountId) return null

  const { start, end } = getDateRange(range, client)
  const { startMs, endMs } = toEpochRange(start, end)

  const accountUrn = `urn:li:sponsoredAccount:${client.linkedinAccountId}`

  const params = new URLSearchParams({
    q: 'analytics',
    pivot: 'ACCOUNT',
    accounts: `List(${accountUrn})`,
    dateRange: `(start:(year:${new Date(startMs).getUTCFullYear()},month:${new Date(startMs).getUTCMonth() + 1},day:${new Date(startMs).getUTCDate()}),end:(year:${new Date(endMs).getUTCFullYear()},month:${new Date(endMs).getUTCMonth() + 1},day:${new Date(endMs).getUTCDate()}))`,
    fields: 'impressions,clicks,costInLocalCurrency,conversions'
  })

  const response = await fetch(`https://api.linkedin.com/rest/adAnalytics?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202604',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  })

  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`LinkedIn returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data.message || data.errorDetails || 'LinkedIn API error')
  }

  const elements = Array.isArray(data?.elements) ? data.elements : []
  if (!elements.length) return null

  const totals = sumAnalytics(elements)
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0

  return {
    platform: 'LinkedIn',
    campaign: client.name,
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr,
    cpc,
    conversions: totals.conversions
  }
}
