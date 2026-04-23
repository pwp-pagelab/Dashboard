export async function getGoogleAdsData({ dateRange = 'LAST_30_DAYS' } = {}) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerIdRaw = process.env.GOOGLE_ADS_CUSTOMER_ID
  const loginCustomerIdRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerIdRaw) {
    return null
  }

  const customerId = String(customerIdRaw).replace(/-/g, '').trim()
  const loginCustomerId = String(loginCustomerIdRaw).replace(/-/g, '').trim()

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  const tokenText = await tokenResp.text()
  let tokenData

  try {
    tokenData = JSON.parse(tokenText)
  } catch {
    throw new Error('Google OAuth returned non-JSON response')
  }

  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(tokenData?.error_description || 'Google OAuth error')
  }

  const query = `
    SELECT
      customer.descriptive_name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM customer
    WHERE segments.date DURING ${dateRange}
  `.trim()

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  }

  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId
  }

  const response = await fetch(
    `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    }
  )

  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Google Ads returned non-JSON response')
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Google Ads API error')
  }

  const firstBatch = data?.[0]
  const firstRow = firstBatch?.results?.[0]
  const metrics = firstRow?.metrics
  const customer = firstRow?.customer

  if (!metrics) return null

  return {
    platform: 'Google Ads',
    campaign: customer?.descriptiveName || 'Google Ads',
    spend: Number(metrics.costMicros || 0) / 1_000_000,
    impressions: Number(metrics.impressions || 0),
    clicks: Number(metrics.clicks || 0),
    ctr: Number(metrics.ctr || 0) * 100,
    cpc: Number(metrics.averageCpc || 0) / 1_000_000,
    conversions: Number(metrics.conversions || 0)
  }
}
