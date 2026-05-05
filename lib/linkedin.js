import { getClientById } from '../data/clients.js'

const LINKEDIN_VERSION = '202604'
const REPORTING_START_DATE = '2023-09-01'
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
  } else if (range === 'max') {
    startDate.setTime(new Date(client?.reportingStartDate || REPORTING_START_DATE).getTime())
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

function encodeLinkedInQueryValue(value) {
  return encodeURIComponent(value)
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%3A/g, ':')
    .replace(/%2C/g, ',')
    .replace(/urn:li:([^:]+):/g, 'urn%3Ali%3A$1%3A')
}

function buildUrl(path, params) {
  const url = new URL(path, 'https://api.linkedin.com')
  const query = Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeLinkedInQueryValue(String(value))}`)
    .join('&')

  return query ? `${url.toString()}?${query}` : url.toString()
}

function buildAccountAnalyticsUrl({ accountId, start, end, timeGranularity = 'ALL' }) {
  return buildUrl('/rest/adAnalytics', {
    q: 'analytics',
    pivot: 'ACCOUNT',
    timeGranularity,
    dateRange: toDateRangeParam(start, end),
    accounts: `List(${accountUrn(accountId)})`,
    fields: METRIC_FIELDS
  })
}

function buildCampaignAnalyticsUrl({ campaignIds, start, end, timeGranularity = 'ALL' }) {
  return buildUrl('/rest/adAnalytics', {
    q: 'analytics',
    pivot: 'CAMPAIGN',
    timeGranularity,
    dateRange: toDateRangeParam(start, end),
    campaigns: `List(${campaignIds.map(campaignUrn).join(',')})`,
    fields: METRIC_FIELDS
  })
}

function buildCampaignSearchUrl({ accountId, status, pageToken = null }) {
  return buildUrl(`/rest/adAccounts/${accountId}/adCampaigns`, {
    q: 'search',
    search: `(status:(values:List(${status})))`,
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

function toDailyTrend(elements = []) {
  return elements
    .filter((row) => row?.dateRange?.start)
    .map((row) => {
      const start = row.dateRange.start
      const spend = safeNum(row.costInLocalCurrency)
      const conversions = safeNum(row.externalWebsiteConversions)

      return {
        date: `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`,
        spend,
        conversions,
        cpa: conversions > 0 ? spend / conversions : null
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
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
  const message = data?.message?.toLowerCase?.() || ''

  return (
    response?.status === 400 &&
    (data?.code === 'ILLEGAL_ARGUMENT' ||
      data?.message === 'Invalid query parameters passed to request' ||
      message.includes('invalid query parameters') ||
      message.includes('projected field'))
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
  const campaignsById = new Map()
  const failedSearches = []

  for (const status of CAMPAIGN_STATUSES) {
    let pageToken = null

    do {
      const url = buildCampaignSearchUrl({ accountId, status, pageToken })
      const response = await requestLinkedIn({
        accessToken,
        url,
        label: pageToken ? `campaign-search-${status.toLowerCase()}-page` : `campaign-search-${status.toLowerCase()}`
      })
      attempts.push(response)

      if (!response.ok) {
        failedSearches.push({
          status,
          error: parseLinkedInError(response.data)
        })
        break
      }

      const elements = Array.isArray(response.data?.elements) ? response.data.elements : []
      elements.forEach((campaign) => {
        if (campaign?.id) campaignsById.set(String(campaign.id), campaign)
      })
      pageToken = response.data?.metadata?.nextPageToken || null
    } while (pageToken)
  }

  const campaigns = Array.from(campaignsById.values())
  if (!campaigns.length && failedSearches.length === CAMPAIGN_STATUSES.length) {
    throw new Error(`LinkedIn campaign search failed: ${failedSearches[0].error}`)
  }

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

async function fetchCampaignDailyAnalytics({ accessToken, campaignIds, start, end, attempts }) {
  const elements = []

  for (let index = 0; index < campaignIds.length; index += CAMPAIGN_REPORT_BATCH_SIZE) {
    const batchIds = campaignIds.slice(index, index + CAMPAIGN_REPORT_BATCH_SIZE)
    const url = buildCampaignAnalyticsUrl({ campaignIds: batchIds, start, end, timeGranularity: 'DAILY' })
    const response = await requestLinkedIn({
      accessToken,
      url,
      label: `campaign-daily-analytics-${index / CAMPAIGN_REPORT_BATCH_SIZE + 1}`
    })
    attempts.push(response)

    if (!response.ok) {
      return []
    }

    elements.push(...(Array.isArray(response.data?.elements) ? response.data.elements : []))
  }

  return elements
}

async function fetchAccountDailyAnalytics({ accessToken, accountId, start, end, attempts }) {
  const response = await requestLinkedIn({
    accessToken,
    url: buildAccountAnalyticsUrl({
      accountId,
      start,
      end,
      timeGranularity: 'DAILY'
    }),
    label: 'account-daily-analytics'
  })
  attempts.push(response)

  return response.ok && Array.isArray(response.data?.elements) ? response.data.elements : []
}

export async function getLinkedInReport({ clientId, range = '30d', accountId = null, clientOverride = null } = {}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  if (!accessToken) {
    return {
      row: null,
      error: 'Missing LINKEDIN_ACCESS_TOKEN',
      debug: { attempts: [] }
    }
  }

  const baseClient = getClientById(clientId)
  const client = clientOverride ? { ...baseClient, ...clientOverride } : baseClient
  const linkedinAccountId = accountId || client?.linkedinAccountId

  if (!linkedinAccountId) {
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
      url: buildAccountAnalyticsUrl({ accountId: linkedinAccountId, start, end }),
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
        daily: toDailyTrend(
          await fetchAccountDailyAnalytics({
            accessToken,
            accountId: linkedinAccountId,
            start,
            end,
            attempts
          })
        ),
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
      accountId: linkedinAccountId,
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
      daily: toDailyTrend(
        await fetchCampaignDailyAnalytics({
          accessToken,
          campaignIds,
          start,
          end,
          attempts
        })
      ),
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

export async function getLinkedInDebugReport({ accountId = '512874914', start = REPORTING_START_DATE, end = formatDate(new Date()) } = {}) {
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
