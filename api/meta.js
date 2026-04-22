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

    const debugUrl =
      `https://graph.facebook.com/v19.0/debug_token` +
      `?input_token=${encodeURIComponent(token)}` +
      `&access_token=${encodeURIComponent(token)}`

    const debugResponse = await fetch(debugUrl)
    const debugData = await debugResponse.json()

    if (!debugResponse.ok) {
      return res.status(debugResponse.status).json({
        ok: false,
        stage: 'debug_token',
        metaError: debugData
      })
    }

    const insightsFields = [
      'account_name',
      'amount_spent',
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
        stage: 'insights',
        tokenDebug: debugData,
        metaError: insightsData
      })
    }

    return res.status(200).json({
      ok: true,
      source: 'meta',
      tokenDebug: debugData,
      data: insightsData
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
