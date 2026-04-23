export default async function handler(req, res) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerIdRaw = process.env.GOOGLE_ADS_CUSTOMER_ID
  const loginCustomerIdRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerIdRaw) {
    return res.status(500).json({
      ok: false,
      error: 'Missing one or more Google Ads environment variables'
    })
  }

  try {
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
      return res.status(500).json({
        ok: false,
        stage: 'oauth_non_json',
        snippet: tokenText.slice(0, 500)
      })
    }

    if (!tokenResp.ok || !tokenData.access_token) {
      return res.status(401).json({
        ok: false,
        stage: 'oauth',
        googleError: tokenData
      })
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
      WHERE segments.date DURING LAST_30_DAYS
    `.trim()

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json'
    }

    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId
    }

    const adsResp = await fetch(
      `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      }
    )

    const adsText = await adsResp.text()

    let adsData
    try {
      adsData = JSON.parse(adsText)
    } catch {
      return res.status(500).json({
        ok: false,
        stage: 'google_ads_non_json',
        snippet: adsText.slice(0, 500)
      })
    }

    if (!adsResp.ok) {
      return res.status(400).json({
        ok: false,
        stage: 'google_ads',
        googleError: adsData
      })
    }

    return res.status(200).json({
      ok: true,
      source: 'google_ads',
      data: adsData
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
