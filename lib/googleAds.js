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

function monthName(monthIndex) {
  return [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER'
  ][monthIndex]
}

function monthsBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const months = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (cursor <= endCursor) {
    months.push({
      issueYear: String(cursor.getUTCFullYear()),
      issueMonth: monthName(cursor.getUTCMonth())
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

function googleHeaders(accessToken, developerToken, loginCustomerId = '') {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  }

  if (loginCustomerId) {
    headers['login-customer-id'] = String(loginCustomerId).replace(/-/g, '')
  }

  return headers
}

function microsToBase(value) {
  return Number(value || 0) / 1_000_000
}

async function getGoogleBillingSetups({ customerId, accessToken, developerToken, loginCustomerId }) {
  const query = `
    SELECT
      billing_setup.resource_name,
      billing_setup.id,
      billing_setup.status,
      billing_setup.payments_account_info.payments_account_id,
      billing_setup.payments_account_info.payments_account_name,
      billing_setup.payments_account_info.payments_profile_id,
      billing_setup.payments_account_info.payments_profile_name
    FROM billing_setup
  `

  const chunks = await runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, query)
  return flattenResults(chunks).map((row) => {
    const setup = row.billingSetup || {}
    return {
      resourceName: setup.resourceName,
      id: setup.id,
      status: setup.status,
      paymentsAccountId: setup.paymentsAccountInfo?.paymentsAccountId || '',
      paymentsAccountName: setup.paymentsAccountInfo?.paymentsAccountName || '',
      paymentsProfileId: setup.paymentsAccountInfo?.paymentsProfileId || '',
      paymentsProfileName: setup.paymentsAccountInfo?.paymentsProfileName || ''
    }
  }).filter((setup) => setup.resourceName && ['APPROVED', 'APPROVED_HELD'].includes(setup.status))
}

async function listInvoicesForBillingSetup({ customerId, accessToken, developerToken, loginCustomerId, billingSetup, issueYear, issueMonth }) {
  const normalizedCustomerId = String(customerId).replace(/-/g, '')
  const params = new URLSearchParams({
    billingSetup,
    issueYear,
    issueMonth
  })
  const resp = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${normalizedCustomerId}/invoices?${params.toString()}`, {
    headers: googleHeaders(accessToken, developerToken, loginCustomerId)
  })
  const text = await resp.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Google invoice API returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!resp.ok) {
    const message = json?.error?.message || JSON.stringify(json).slice(0, 500)
    throw new Error(message)
  }

  return (json.invoices || []).map((invoice) => ({
    id: invoice.id,
    type: invoice.type,
    resourceName: invoice.resourceName,
    billingSetup: invoice.billingSetup,
    paymentsAccountId: invoice.paymentsAccountId,
    paymentsProfileId: invoice.paymentsProfileId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currencyCode: invoice.currencyCode,
    serviceStartDate: invoice.serviceDateRange?.startDate || '',
    serviceEndDate: invoice.serviceDateRange?.endDate || '',
    subtotal: microsToBase(invoice.subtotalAmountMicros),
    tax: microsToBase(invoice.taxAmountMicros),
    total: microsToBase(invoice.totalAmountMicros),
    pdfUrl: invoice.pdfUrl || '',
    issueYear,
    issueMonth
  }))
}

export async function getGoogleOfficialInvoices({
  customerId,
  loginCustomerId = null,
  startDate,
  endDate,
  billingSetupOverride = null
} = {}) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const effectiveCustomerId = customerId || process.env.GOOGLE_ADS_CUSTOMER_ID
  const effectiveLoginCustomerId = loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!effectiveCustomerId || !developerToken) {
    return {
      ok: false,
      invoices: [],
      error: 'Google Ads invoice access is not configured.'
    }
  }

  const accessToken = await getGoogleAccessToken()
  const billingSetups = billingSetupOverride
    ? [{ resourceName: billingSetupOverride }]
    : await getGoogleBillingSetups({
        customerId: effectiveCustomerId,
        accessToken,
        developerToken,
        loginCustomerId: effectiveLoginCustomerId
      })

  if (!billingSetups.length) {
    return {
      ok: false,
      invoices: [],
      billingSetups: [],
      error: 'No approved Google billing setup was found for this account.'
    }
  }

  const invoices = []
  const errors = []
  const months = monthsBetween(startDate, endDate)

  for (const billingSetup of billingSetups) {
    for (const month of months) {
      try {
        const monthInvoices = await listInvoicesForBillingSetup({
          customerId: effectiveCustomerId,
          accessToken,
          developerToken,
          loginCustomerId: effectiveLoginCustomerId,
          billingSetup: billingSetup.resourceName,
          issueYear: month.issueYear,
          issueMonth: month.issueMonth
        })

        monthInvoices.forEach((invoice) => {
          invoices.push({
            ...invoice,
            billingSetup: invoice.billingSetup || billingSetup.resourceName,
            billingSetupId: billingSetup.id || '',
            paymentsAccountName: billingSetup.paymentsAccountName || ''
          })
        })
      } catch (error) {
        errors.push(`${month.issueMonth} ${month.issueYear}: ${error.message}`)
      }
    }
  }

  return {
    ok: errors.length === 0 || invoices.length > 0,
    invoices,
    billingSetups,
    errors
  }
}

export async function downloadGoogleInvoicePdf({
  customerId,
  loginCustomerId = null,
  billingSetup,
  issueYear,
  issueMonth,
  invoiceId
} = {}) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const effectiveCustomerId = customerId || process.env.GOOGLE_ADS_CUSTOMER_ID
  const effectiveLoginCustomerId = loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!effectiveCustomerId || !developerToken) {
    throw new Error('Google Ads invoice access is not configured.')
  }

  const accessToken = await getGoogleAccessToken()
  const invoices = await listInvoicesForBillingSetup({
    customerId: effectiveCustomerId,
    accessToken,
    developerToken,
    loginCustomerId: effectiveLoginCustomerId,
    billingSetup,
    issueYear,
    issueMonth
  })
  const invoice = invoices.find((item) => String(item.id) === String(invoiceId)) || invoices[0]

  if (!invoice?.pdfUrl) {
    throw new Error('Google returned the invoice, but no PDF URL was available.')
  }

  const resp = await fetch(invoice.pdfUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!resp.ok) {
    throw new Error(`Google invoice PDF download failed with status ${resp.status}`)
  }

  const arrayBuffer = await resp.arrayBuffer()
  return {
    invoice,
    bytes: Buffer.from(arrayBuffer)
  }
}

export async function getGoogleAdsData({ dateRange, startDate, endDate, customerId: customerIdOverride = null, loginCustomerId: loginCustomerIdOverride = null } = {}) {
  const customerId = customerIdOverride || process.env.GOOGLE_ADS_CUSTOMER_ID
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const loginCustomerId = loginCustomerIdOverride || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!customerId || !developerToken) {
    return null
  }

  const accessToken = await getGoogleAccessToken()
  const where = buildDateWhere({ dateRange, startDate, endDate })

  const snapshotQuery = `
    SELECT
      customer.descriptive_name,
      customer.currency_code,
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

  const dailyQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.conversions
    FROM customer
    WHERE ${where}
    ORDER BY segments.date ASC
  `

  const [snapshotChunks, campaignVisibilityChunks, keywordChunks, searchTermChunks] = await Promise.all([
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, snapshotQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, campaignVisibilityQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, keywordQuery),
    runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, searchTermsQuery)
  ])
  let dailyChunks = []
  try {
    dailyChunks = await runGoogleQuery(customerId, accessToken, developerToken, loginCustomerId, dailyQuery)
  } catch {
    dailyChunks = []
  }

  const snapshotRows = flattenResults(snapshotChunks)
  const campaignVisibilityRows = flattenResults(campaignVisibilityChunks)
  const keywordRows = flattenResults(keywordChunks)
  const searchTermRows = flattenResults(searchTermChunks)
  const dailyRows = flattenResults(dailyChunks)

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
  const daily = dailyRows
    .map((row) => {
      const m = row.metrics || {}
      const conversionsForDay = safeNum(m.conversions)
      const spend = microsToCurrency(m.costMicros)

      return {
        date: row.segments?.date || '',
        spend,
        conversions: conversionsForDay,
        cpa: conversionsForDay > 0 ? spend / conversionsForDay : null
      }
    })
    .filter((row) => row.date)

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
    currencyCode: first.customer?.currencyCode || 'SAR',
    conversionLabel: 'Google conversions',
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
    },
    daily
  }
}
