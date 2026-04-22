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
    const accountId = String(adAccountId).startsWith('act_')
      ? String(adAccountId)
      : `act_${adAccountId}`

    const fields = [
      'account_name',
      'amount_spent',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'actions'
    ].join(',')

    const url =
      `https://graph.facebook.com/v19.0/${accountId}/insights` +
      `?date_preset=last_30d` +
      `&level=account` +
      `&fields=${encodeURIComponent(fields)}` +
      `&access_token=${encodeURIComponent(accessToken)}`

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        metaError: data
      })
    }

    return res.status(200).json({
      ok: true,
      source: 'meta',
      data
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
