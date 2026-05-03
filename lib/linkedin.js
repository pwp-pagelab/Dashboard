import { getClientById } from '../data/clients.js'

const LINKEDIN_VERSION = '202604'
const METRIC_FIELDS = [
  'dateRange',
  'pivotValues',
  'costInLocalCurrency',
  'impressions',
  'clicks',
  'landingPageClicks',
  'externalWebsiteConversions'
].join(',')
const CAMPAIGN_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
  'COMPLETED',
  'CANCELED',
  'DRAFT',
  'PENDING_DELETION',
  'REMOVED'
]
const CAMPAIGN_REPORT_BATCH_SIZE = 75

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

function accountUrn(accountId) {
  return `urn:li:sponsoredAccount:${accountId}`
}

function campaignUrn(campaignId) {
  return `urn:li:sponsoredCampaign:${campaignId}`
}

function linkedInHeaders(accessToken, { masked = false } = {}) {
  return {
    Authorization: masked ? 'Bearer ***masked***' : `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0'
  }
}

function buildUrl(path, params) {
  const url = new URL(path, 'https://api.linkedin.com')

  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

function buildAccountAnalyticsUrl({ accountId, start, end }) {
  return buildUrl('/rest/adAnalytics', {
    q: 'analytics',
    pivot: 'ACCOUNT',
    timeGranularity: 'ALL',
    dateRange: toDateRangeParam(start, end),
    accounts: `List(${accountUrn(accountId)})`,
    fields: METRIC_FIELDS
  })
}

function buildCampaignAnalyticsUrl({ campaignIds, start, end }) {
  return buildUrl('/rest/adAnalytics', {
    q: 'analytics',
    pivot: 'CAMPAIGN',
    timeGranularity: 'ALL',
    dateRange: toDateRangeParam(start, end),
    campaigns: `List(${campaignIds.map(campaignUrn).join(',')})`,
    fields: METRIC_FIELDS
  })
}

function buildCampaignSearchUrl({ accountId, pageToken = null }) {
  return buildUrl(`/rest/adAccounts/${accountId}/adCampaigns`, {
    q: 'search',
    search: `(status:(values:List(${CAMPAIGN_STATUSES.join(',')})))`,
    sortOrder: 'DESCENDING',
    pageSize: '1000',
    pageToken
  })
}

function sumAnalytics(elements = []) {
  return elements.reduce(
    (acc, row) => {
      acc.impressions += safeNum(row.impressions)
      acc.clicks += safeNum(row.clicks || row.landingPageClicks)
      acc.landingPageClicks += safeNum(row.landingPageClicks)
      acc.spend += safeNum(row.costInLocalCurrency)
      acc.conversions += safeNum(row.externalWebsiteConversions)
      return acc
    },
    {
      impressions: 0,
      clicks: 0,
      landingPageClicks: 0,
      spend: 0,
      conversions: 0
    }
  )
}

function toDashboardRow({ client, totals, source }) {
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
    conversions: totals.conversions,
    landingPageClicks: totals.landingPageClicks,
    source
  }
}

function parseLinkedInError(data) {
  if (!data || typeof data !== 'object') return 'LinkedIn API error'
  if (data.message) return data.message
  if (data.errorDetails) return JSON.stringify(data.errorDetails)
  return 'LinkedIn API error'
}

function isIllegalArgument(response) {
  const data = response?.data
  return (
    response?.status === 400 &&
    (data?.code === 'ILLEGAL_ARGUMENT' ||
      data?.message === 'Invalid query parameters passed to request' ||
      data?.message?.toLowerCase?.().includes('invalid query parameters'))
  )
}

async function requestLinkedIn({ accessToken, url, label }) {
  const headers = linkedInHeaders(accessToken)
  const debug = {
    label,
    url,
    headers: linkedInHeaders(accessToken, { masked: true }),
    status: null,
    ok: false,
    data: null
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    debug.status = response.status
    debug.ok = response.ok

    const text = await response.text()
    try {
      debug.data = text ? JSON.parse(text) : null
    } catch {
      debug.data = {
        nonJsonResponse: text.slice(0, 1000)
      }
    }
  } catch (error) {
    debug.error = error.message
  }

  return debug
}

async function fetchCampaigns({ accessToken, accountId, attempts }) {
  const campaigns = []
  let pageToken = null

  do {
    const url = buildCampaignSearchUrl({ accountId, pageToken })
    const response = await requestLinkedIn({
      accessToken,
      url,
      label: pageToken ? 'campaign-search-page' : 'campaign-search'
    })
    attempts.push(response)

    if (!response.ok) {
      throw new Error(`LinkedIn campaign search failed: ${parseLinkedInError(response.data)}`)
    }

    campaigns.push(...(Array.isArray(response.data?.elements) ? response.data.elements : []))
    pageToken = response.data?.metadata?.nextPageToken || null
  } while (pageToken)

  return campaigns
}

async function fetchCampaignAnalytics({ accessToken, campaignIds, start, end, attempts }) {
  const elements = []

  for (let index = 0; index < campaignIds.length; index += CAMPAIGN_REPORT_BATCH_SIZE) {
    const batchIds = campaignIds.slice(index, index + CAMPAIGN_REPORT_BATCH_SIZE)
    const url = buildCampaignAnalyticsUrl({ campaignIds: batchIds, start, end })
    const response = await requestLinkedIn({
      accessToken,
      url,
      label: `campaign-analytics-${index / CAMPAIGN_REPORT_BATCH_SIZE + 1}`
    })
    attempts.push(response)

    if (!response.ok) {
      throw new Error(`LinkedIn campaign analytics failed: ${parseLinkedInError(response.data)}`)
    }

    elements.push(...(Array.isArray(response.data?.elements) ? response.data.elements : []))
  }

  return elements
}

export async function getLinkedInReport({ clientId, range = '30d' } = {}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  if (!accessToken) {
    return {
      row: null,
      error: 'Missing LINKEDIN_ACCESS_TOKEN',
      debug: { attempts: [] }
    }
  }

  const client = getClientById(clientId)
  if (!client?.linkedinAccountId) {
    return {
      row: null,
      error: 'Client does not have a LinkedIn account ID',
      debug: { attempts: [] }
    }
  }

  const { start, end } = getDateRange(range, client)
  const attempts = []

  try {
    const accountResponse = await requestLinkedIn({
      accessToken,
      url: buildAccountAnalyticsUrl({ accountId: client.linkedinAccountId, start, end }),
      label: 'account-analytics'
    })
    attempts.push(accountResponse)

    if (accountResponse.ok) {
      const elements = Array.isArray(accountResponse.data?.elements) ? accountResponse.data.elements : []
      if (!elements.length) {
        return {
          row: null,
          debug: {
            strategy: 'account-analytics',
            start,
            end,
            attempts
          }
        }
      }

      return {
        row: toDashboardRow({
          client,
          totals: sumAnalytics(elements),
          source: 'linkedin-account-analytics'
        }),
        debug: {
          strategy: 'account-analytics',
          start,
          end,
          attempts
        }
      }
    }

    if (!isIllegalArgument(accountResponse)) {
      throw new Error(`LinkedIn account analytics failed: ${parseLinkedInError(accountResponse.data)}`)
    }

    const campaigns = await fetchCampaigns({
      accessToken,
      accountId: client.linkedinAccountId,
      attempts
    })
    const campaignIds = campaigns.map((campaign) => campaign.id).filter(Boolean)

    if (!campaignIds.length) {
      return {
        row: null,
        error: 'LinkedIn account analytics failed with ILLEGAL_ARGUMENT and no campaigns were found for fallback reporting.',
        debug: {
          strategy: 'campaign-fallback',
          start,
          end,
          campaignCount: 0,
          attempts
        }
      }
    }

    const campaignElements = await fetchCampaignAnalytics({
      accessToken,
      campaignIds,
      start,
      end,
      attempts
    })

    if (!campaignElements.length) {
      return {
        row: null,
        debug: {
          strategy: 'campaign-fallback',
          start,
          end,
          campaignCount: campaignIds.length,
          attempts
        }
      }
    }

    return {
      row: toDashboardRow({
        client,
        totals: sumAnalytics(campaignElements),
        source: 'linkedin-campaign-fallback'
      }),
      debug: {
        strategy: 'campaign-fallback',
        start,
        end,
        campaignCount: campaignIds.length,
        attempts
      }
    }
  } catch (error) {
    return {
      row: null,
      error: error.message,
      debug: {
        strategy: 'failed',
        start,
        end,
        attempts
      }
    }
  }
}

export async function getLinkedInDebugReport({ accountId = '512874914', start = '2026-01-01', end = formatDate(new Date()) } = {}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  if (!accessToken) {
    return {
      ok: false,
      error: 'Missing LINKEDIN_ACCESS_TOKEN',
      attempts: []
    }
  }

  const attempts = []

  try {
    const accountResponse = await requestLinkedIn({
      accessToken,
      url: buildAccountAnalyticsUrl({ accountId, start, end }),
      label: 'account-analytics'
    })
    attempts.push(accountResponse)

    if (accountResponse.ok) {
      return {
        ok: true,
        strategy: 'account-analytics',
        accountId,
        start,
        end,
        totals: sumAnalytics(accountResponse.data?.elements),
        attempts
      }
    }

    if (!isIllegalArgument(accountResponse)) {
      return {
        ok: false,
        strategy: 'account-analytics',
        accountId,
        start,
        end,
        error: parseLinkedInError(accountResponse.data),
        attempts
      }
    }

    const campaigns = await fetchCampaigns({ accessToken, accountId, attempts })
    const campaignIds = campaigns.map((campaign) => campaign.id).filter(Boolean)
    const campaignElements = campaignIds.length
      ? await fetchCampaignAnalytics({ accessToken, campaignIds, start, end, attempts })
      : []

    return {
      ok: true,
      strategy: 'campaign-fallback',
      accountId,
      start,
      end,
      campaignCount: campaignIds.length,
      totals: sumAnalytics(campaignElements),
      attempts
    }
  } catch (error) {
    return {
      ok: false,
      strategy: 'failed',
      accountId,
      start,
      end,
      error: error.message,
      attempts
    }
  }
}

export async function getLinkedInData({ clientId, range = '30d' } = {}) {
  const report = await getLinkedInReport({ clientId, range })
  return report.row
}
