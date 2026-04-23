export default async function handler(req, res) {
  const metaAccessToken = process.env.META_ACCESS_TOKEN
  const metaAdAccountId = process.env.META_AD_ACCOUNT_ID

  const googleDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const googleClientId = process.env.GOOGLE_ADS_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const googleRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const googleCustomerIdRaw = process.env.GOOGLE_ADS_CUSTOMER_ID
  const googleLoginCustomerIdRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''

  try {
    // ---------- META ----------
    let meta = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      name: 'Meta'
    }

    if (metaAccessToken && metaAdAccountId) {
      const token = String(metaAccessToken).trim()
      const accountId = String(metaAdAccountId).replace(/^act_/, '')
      const accountPath = `act_${accountId}`

      const metaFields = ['account_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc'].join(',')

      const metaUrl =
        `https://graph.facebook.com/v19.0/${accountPath}/insights` +
        `?date_preset=last_30d` +
        `&level=account` +
        `&fields=${encodeURIComponent(metaFields)}` +
        `&access_token=${encodeURIComponent(token)}`

      const metaResp = await fetch(metaUrl)
      const metaData = await metaResp.json()

      if (!metaResp.ok) {
        return res.status(metaResp.status).json({
          ok: false,
          stage: 'meta_insights',
          metaError: metaData
        })
      }

      const row = metaData?.data?.[0]
      if (row) {
        meta = {
          spend: Number(row.spend || 0),
          impressions: Number(row.impressions || 0),
          clicks: Number(row.clicks || 0),
          ctr: Number(row.ctr || 0),
          cpc: Number(row.cpc || 0),
          name: row.account_name || 'Meta'
        }
      }
    }

    // ---------- GOOGLE ADS ----------
    let google = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
      name: 'Google Ads'
    }

    if (
      googleDeveloperToken &&
      googleClientId &&
      googleClientSecret &&
      googleRefreshToken &&
      googleCustomerIdRaw
    ) {
      const customerId = String(googleCustomerIdRaw).replace(/-/g, '').trim()
      const loginCustomerId = String(googleLoginCustomerIdRaw).replace(/-/g, '').trim()

      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: googleRefreshToken,
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
          stage: 'google_oauth_non_json',
          snippet: tokenText.slice(0, 500)
        })
      }

      if (!tokenResp.ok || !tokenData.access_token) {
        return res.status(401).json({
          ok: false,
          stage: 'google_oauth',
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
        'developer-token': googleDeveloperToken,
        'Content-Type': 'application/json'
      }

      if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId
      }

      const googleResp = await fetch(
        `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ query })
        }
      )

      const googleText = await googleResp.text()
      let googleData

      try {
        googleData = JSON.parse(googleText)
      } catch {
        return res.status(500).json({
          ok: false,
          stage: 'google_ads_non_json',
          snippet: googleText.slice(0, 500)
        })
      }

      if (!googleResp.ok) {
        return res.status(400).json({
          ok: false,
          stage: 'google_ads',
          googleError: googleData
        })
      }

      const firstBatch = googleData?.[0]
      const firstRow = firstBatch?.results?.[0]
      const metrics = firstRow?.metrics
      const customer = firstRow?.customer

      if (metrics) {
        google = {
          spend: Number(metrics.costMicros || 0) / 1_000_000,
          impressions: Number(metrics.impressions || 0),
          clicks: Number(metrics.clicks || 0),
          ctr: Number(metrics.ctr || 0) * 100,
          cpc: Number(metrics.averageCpc || 0) / 1_000_000,
          conversions: Number(metrics.conversions || 0),
          name: customer?.descriptiveName || 'Google Ads'
        }
      }
    }

    const totalSpend = meta.spend + google.spend
    const totalImpressions = meta.impressions + google.impressions
    const totalClicks = meta.clicks + google.clicks
    const blendedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      summaryCards: [
        { label: 'Total Spend', value: `SAR ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: 'Impressions', value: totalImpressions.toLocaleString() },
        { label: 'Clicks', value: totalClicks.toLocaleString() },
        { label: 'CTR', value: `${blendedCtr.toFixed(2)}%` },
        { label: 'Meta Spend', value: `SAR ${meta.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: 'Google Spend', value: `SAR ${google.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}` }
      ],
      campaignRows: [
        {
          platform: 'Meta',
          campaign: meta.name,
          spend: `SAR ${meta.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          clicks: meta.clicks.toLocaleString(),
          conversions: 'N/A'
        },
        {
          platform: 'Google Ads',
          campaign: google.name,
          spend: `SAR ${google.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          clicks: google.clicks.toLocaleString(),
          conversions: google.conversions.toLocaleString()
        }
      ],
      platformSplit: {
        meta: {
          spend: `SAR ${meta.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          conversions: 'N/A'
        },
        google: {
          spend: `SAR ${google.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          conversions: google.conversions.toLocaleString()
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
