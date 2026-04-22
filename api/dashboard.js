export default async function handler(req, res) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    return res.status(500).json({
      ok: false,
      error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID'
    })
  }

  try {
    const token = String(accessToken).trim()
    const accountId = String(adAccountId).replace(/^act_/, '')
    const accountPath = `act_${accountId}`

    const insightsFields = [
      'account_name',
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc'
    ].join(',')

    const insightsUrl =
      `https://graph.facebook.com/v19.0/${accountPath}/insights` +
      `?date_preset=last_30d` +
      `&level=account` +
      `&fields=${encodeURIComponent(insightsFields)}` +
      `&access_token=${encodeURIComponent(token)}`

    const insightsResponse = await fetch(insightsUrl)
    const insightsData = await insightsResponse.json()

    if (!insightsResponse.ok) {
      return res.status(insightsResponse.status).json({
        ok: false,
        stage: 'meta_insights',
        metaError: insightsData
      })
    }

    const row = insightsData?.data?.[0]

    if (!row) {
      return res.status(200).json({
        updatedAt: new Date().toISOString(),
        summaryCards: [
          { label: 'Total Spend', value: 'SAR 0' },
          { label: 'Impressions', value: '0' },
          { label: 'Clicks', value: '0' },
          { label: 'CTR', value: '0%' },
          { label: 'CPC', value: 'SAR 0' },
          { label: 'Platform', value: 'Meta' }
        ],
        campaignRows: [],
        platformSplit: {
          meta: { spend: 'SAR 0', conversions: 'N/A' },
          google: { spend: 'Not connected yet', conversions: 'N/A' }
        }
      })
    }

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      summaryCards: [
        { label: 'Total Spend', value: `SAR ${Number(row.spend || 0).toLocaleString()}` },
        { label: 'Impressions', value: Number(row.impressions || 0).toLocaleString() },
        { label: 'Clicks', value: Number(row.clicks || 0).toLocaleString() },
        { label: 'CTR', value: `${Number(row.ctr || 0).toFixed(2)}%` },
        { label: 'CPC', value: `SAR ${Number(row.cpc || 0).toFixed(2)}` },
        { label: 'Platform', value: 'Meta Live' }
      ],
      campaignRows: [
        {
          platform: 'Meta',
          campaign: row.account_name || 'Account Total',
          spend: `SAR ${Number(row.spend || 0).toLocaleString()}`,
          clicks: Number(row.clicks || 0).toLocaleString(),
          conversions: 'N/A'
        }
      ],
      platformSplit: {
        meta: {
          spend: `SAR ${Number(row.spend || 0).toLocaleString()}`,
          conversions: 'N/A'
        },
        google: {
          spend: 'Not connected yet',
          conversions: 'N/A'
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
