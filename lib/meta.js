export async function getMetaData({ datePreset = 'last_30d' } = {}) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    return null
  }

  const token = String(accessToken).trim()
  const accountId = String(adAccountId).replace(/^act_/, '')
  const accountPath = `act_${accountId}`

  const fields = ['account_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc'].join(',')

  const url =
    `https://graph.facebook.com/v19.0/${accountPath}/insights` +
    `?date_preset=${encodeURIComponent(datePreset)}` +
    `&level=account` +
    `&fields=${encodeURIComponent(fields)}` +
    `&access_token=${encodeURIComponent(token)}`

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta API error')
  }

  const row = data?.data?.[0]
  if (!row) return null

  return {
    platform: 'Meta',
    campaign: row.account_name || 'Meta',
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    conversions: null
  }
}
