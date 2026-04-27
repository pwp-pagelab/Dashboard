const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v24'

function microsToCurrency(value) {
  return Number(value || 0) / 1_000_000
}

function pct(value) {
  if (value == null) return null
  return Number(value) * 100
}

function safeNum(value) {
  return Number(value || 0)
}

function buildDateWhere({ dateRange, startDate, endDate }) {
  if (dateRange) {
    return `segments.date DURING ${dateRange}`
  }

  if (startDate && endDate) {
    return `segments.date BETWEEN '${startDate}' AND '${endDate}'`
  }

  return `segments.date DURING LAST_30_DAYS`
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing one or more Google OAuth environment variables')
  }

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  const text = await resp.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Google OAuth returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!resp.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to refresh Google access token')
  }

  return json.access_token
}

async function runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, query) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  }

  if (loginCustomerId) {
    headers['login-customer-id'] = String(loginCustomerId).replace(/-/g, '')
  }

  const resp = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${String(customerId).replace(/-/g, '')}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    }
  )

  const text = await resp.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Google Ads returned non-JSON response: ${text.slice(0, 500)}`)
  }

  if (!resp.ok) {
    throw new Error(`Google Ads query failed: ${JSON.stringify(json).slice(0, 1000)}`)
  }

  return Array.isArray(json) ? json : [json]
}

function flattenResults(chunks) {
  return chunks.flatMap((chunk) => chunk.results || [])
}

export async function getGoogleAdsData({ dateRange, startDate, endDate } = {}) {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!customerId || !developerToken) {
    return null
  }

  const accessToken = await getGoogleAccessToken()
  const where = buildDateWhere({ dateRange, startDate, endDate })

  const snapshotQuery = `
    SELECT
      customer.descriptive_name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share
    FROM customer
    WHERE ${where}
  `

  const campaignVisibilityQuery = `
  SELECT
    campaign.name,
    metrics.impressions,
    metrics.search_top_impression_share,
    metrics.search_absolute_top_impression_share
  FROM campaign
  WHERE ${where}
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.impressions DESC
  LIMIT 50
`

  const keywordQuery = `
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion
    FROM keyword_view
    WHERE ${where}
      AND ad_group_criterion.status != 'REMOVED'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 25
  `

  const searchTermsQuery = `
    SELECT
      campaign.name,
      ad_group.name,
      search_term_view.search_term,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion
    FROM search_term_view
    WHERE ${where}
    ORDER BY metrics.cost_micros DESC
    LIMIT 25
  `

  const [snapshotChunks, campaignVisibilityChunks, keywordChunks, searchTermChunks] = await Promise.all([
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, snapshotQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, campaignVisibilityQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, keywordQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, searchTermsQuery)
  ])

  const snapshotRows = flattenResults(snapshotChunks)
  const campaignVisibilityRows = flattenResults(campaignVisibilityChunks)
  const keywordRows = flattenResults(keywordChunks)
  const searchTermRows = flattenResults(searchTermChunks)

  const first = snapshotRows[0]
  if (!first) return null

  const metrics = first.metrics || {}
  const cost = microsToCurrency(metrics.costMicros)
  const conversions = safeNum(metrics.conversions)

  const keywordTable = keywordRows.map((row) => {
    const m = row.metrics || {}
    const criterion = row.adGroupCriterion || {}
    const keyword = criterion.keyword || {}
    const q = criterion.qualityInfo || {}
    const rowConversions = safeNum(m.conversions)

    return {
      campaign: row.campaign?.name || '',
      adGroup: row.adGroup?.name || '',
      keyword: keyword.text || '',
      matchType: keyword.matchType || '',
      qualityScore: q.qualityScore ?? null,
      impressions: safeNum(m.impressions),
      clicks: safeNum(m.clicks),
      ctr: pct(m.ctr),
      avgCpc: microsToCurrency(m.averageCpc),
      cost: microsToCurrency(m.costMicros),
      conversions: rowConversions,
      cpa: rowConversions > 0 ? microsToCurrency(m.costPerConversion) : null
    }
  })

  const searchTermsTable = searchTermRows.map((row) => {
    const m = row.metrics || {}
    const rowConversions = safeNum(m.conversions)

    return {
      campaign: row.campaign?.name || '',
      adGroup: row.adGroup?.name || '',
      searchTerm: row.searchTermView?.searchTerm || '',
      impressions: safeNum(m.impressions),
      clicks: safeNum(m.clicks),
      ctr: pct(m.ctr),
      cost: microsToCurrency(m.costMicros),
      conversions: rowConversions,
      cpa: rowConversions > 0 ? microsToCurrency(m.costPerConversion) : null
    }
  })

  const highSpendZeroConvKeywords = keywordTable
    .filter((k) => k.cost > 0 && k.conversions === 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)

  const lowQualityKeywords = keywordTable
    .filter((k) => k.qualityScore != null && k.qualityScore <= 5)
    .sort((a, b) => (a.qualityScore ?? 10) - (b.qualityScore ?? 10))
    .slice(0, 5)

  const topConvertingKeywords = keywordTable
    .filter((k) => k.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5)

  const avgQualityScoreValues = keywordTable
    .map((k) => k.qualityScore)
    .filter((v) => v != null)

  const avgQualityScore = avgQualityScoreValues.length
    ? avgQualityScoreValues.reduce((a, b) => a + b, 0) / avgQualityScoreValues.length
    : null

  const topImpressionShares = campaignVisibilityRows
    .map((row) => row.metrics?.searchTopImpressionShare)
    .filter((v) => v != null)
    .map((v) => Number(v))

  const absoluteTopImpressionShares = campaignVisibilityRows
    .map((row) => row.metrics?.searchAbsoluteTopImpressionShare)
    .filter((v) => v != null)
    .map((v) => Number(v))

  const avg = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) * 100 : null)

  const searchImpressionShare = pct(metrics.searchImpressionShare)
  const lostIsBudget = pct(metrics.searchBudgetLostImpressionShare)
  const lostIsRank = pct(metrics.searchRankLostImpressionShare)

  let mainLimiter = 'No major limiter detected'
  if ((lostIsBudget || 0) > (lostIsRank || 0) && (lostIsBudget || 0) >= 10) {
    mainLimiter = 'Budget-limited'
  } else if ((lostIsRank || 0) >= 10) {
    mainLimiter = 'Rank-limited'
  }

  let efficiencyStatus = 'Stable efficiency'
  if (conversions === 0 && cost > 0) {
    efficiencyStatus = 'Spend without conversion'
  } else if (conversions > 0 && microsToCurrency(metrics.costPerConversion) > 0) {
    efficiencyStatus = 'Converting'
  }

  let scaleStatus = 'Healthy visibility'
  if ((searchImpressionShare || 0) < 50) {
    scaleStatus = 'Under-scaled visibility'
  }

  return {
    platform: 'Google Ads',
    campaign: first.customer?.descriptiveName || 'Google Ads',
    spend: cost,
    impressions: safeNum(metrics.impressions),
    clicks: safeNum(metrics.clicks),
    ctr: pct(metrics.ctr) || 0,
    cpc: microsToCurrency(metrics.averageCpc),
    conversions,
    snapshot: {
      spend: cost,
      impressions: safeNum(metrics.impressions),
      clicks: safeNum(metrics.clicks),
      ctr: pct(metrics.ctr),
      avgCpc: microsToCurrency(metrics.averageCpc),
      conversions,
      cpa: conversions > 0 ? microsToCurrency(metrics.costPerConversion) : null
    },
    visibility: {
      searchImpressionShare,
      lostIsBudget,
      lostIsRank,
      topImpressionShare: avg(topImpressionShares),
      absoluteTopImpressionShare: avg(absoluteTopImpressionShares)
    },
    keywordHealth: {
      avgQualityScore,
      highSpendZeroConvKeywords,
      lowQualityKeywords,
      topConvertingKeywords
    },
    tables: {
      keywords: keywordTable,
      searchTerms: searchTermsTable
    },
    interpretation: {
      mainLimiter,
      efficiencyStatus,
      scaleStatus
    }
  }
}
