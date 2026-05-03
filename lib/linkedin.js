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

function toDateRangeParam(start, end) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return `(start:(year:${startDate.getUTCFullYear()},month:${startDate.getUTCMonth() + 1},day:${startDate.getUTCDate()}),end:(year:${endDate.getUTCFullYear()},month:${endDate.getUTCMonth() + 1},day:${endDate.getUTCDate()}))`
}

function buildBaseUrl(accountId, start, end) {
  const accountUrn = `urn:li:sponsoredAccount:${accountId}`
  const dateRange = toDateRangeParam(start, end)

  // IMPORTANT:
  // Build the query string manually for LinkedIn Rest.li-style params.
  // Do not encode the whole List(...) or dateRange=(...) shapes.
  return (
    `https://api.linkedin.com/rest/adAnalytics` +
    `?q=analytics` +
    `&pivot=ACCOUNT` +
    `&accounts=List(${accountUrn})` +
    `&dateRange=${dateRange}`
  )
}

async function runLinkedInRequest(url, accessToken) {
  const response = await fetch(url, {
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

  return data
}

function sumMetrics(elements = []) {
  return elements.reduce(
    (acc, row) => {
      acc.impressions += safeNum(row.impressions)
      acc.clicks += safeNum(row.clicks || row.landingPageClicks)
      acc.spend += safeNum(row.costInLocalCurrency)
      acc.conversions += safeNum(
        row.externalWebsiteConversions ||
        row.conversions
      )
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
  const baseUrl = buildBaseUrl(client.linkedinAccountId, start, end)

  // Fallback order:
  // 1) no fields at all -> LinkedIn should default to impressions and clicks
  // 2) add spend
  // 3) add conversions
  const attempts = [
    `${baseUrl}`,
    `${baseUrl}&fields=impressions,clicks,costInLocalCurrency`,
    `${baseUrl}&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions`,
    `${baseUrl}&fields=impressions,landingPageClicks,costInLocalCurrency,externalWebsiteConversions`
  ]

  let lastError = null
  let data = null

  for (const url of attempts) {
    try {
      data = await runLinkedInRequest(url, accessToken)
      if (data) break
    } catch (error) {
      lastError = error
    }
  }

  if (!data) {
    throw lastError || new Error('LinkedIn API error')
  }

  const elements = Array.isArray(data?.elements) ? data.elements : []
  if (!elements.length) return null

  const totals = sumMetrics(elements)
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
