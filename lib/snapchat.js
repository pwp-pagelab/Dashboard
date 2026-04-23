import { getClientById } from '../data/clients.js'

async function getSnapAccessToken() {
  const clientId = process.env.SNAP_CLIENT_ID
  const clientSecret = process.env.SNAP_CLIENT_SECRET
  const refreshToken = process.env.SNAP_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  const tokenResp = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  })

  const text = await tokenResp.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Snap OAuth returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!tokenResp.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to refresh Snapchat access token')
  }

  return json.access_token
}

function findMatchingSnapOrganization(organizations, client) {
  if (!client?.snapMatch || !Array.isArray(organizations)) return null

  const { type, value } = client.snapMatch
  const target = String(value || '').toLowerCase()

  if (type === 'includes') {
    return (
      organizations.find((item) =>
        String(item?.organization?.name || '').toLowerCase().includes(target)
      ) || null
    )
  }

  if (type === 'exact') {
    return (
      organizations.find(
        (item) => String(item?.organization?.name || '').toLowerCase() === target
      ) || null
    )
  }

  return null
}

function getSnapDateRange(range) {
  const now = new Date()
  const end = now.toISOString()

  const start = new Date(now)

  if (range === '7d') {
    start.setDate(start.getDate() - 7)
  } else if (range === 'this_month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  } else if (range === 'max') {
    start.setFullYear(start.getFullYear() - 2)
  } else {
    start.setDate(start.getDate() - 30)
  }

  return {
    start_time: start.toISOString(),
    end_time: end
  }
}

export async function getSnapchatData({ clientId, range = '30d' } = {}) {
  const client = getClientById(clientId)
  if (!client || !client.platforms?.snapchat?.enabled) {
    return null
  }

  const accessToken = await getSnapAccessToken()
  if (!accessToken) {
    return null
  }

  const orgResp = await fetch(
    'https://adsapi.snapchat.com/v1/me/organizations?with_ad_accounts=true',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  const orgText = await orgResp.text()

  let orgJson
  try {
    orgJson = JSON.parse(orgText)
  } catch {
    throw new Error(`Snap organizations returned non-JSON response: ${orgText.slice(0, 300)}`)
  }

  if (!orgResp.ok) {
    throw new Error(orgJson?.error?.message || 'Failed to fetch Snapchat organizations')
  }

  const organizations = Array.isArray(orgJson?.organizations) ? orgJson.organizations : []
  const matchedOrgWrapper = findMatchingSnapOrganization(organizations, client)
  const matchedOrg = matchedOrgWrapper?.organization || null

  if (!matchedOrg) {
    return null
  }

  const adAccount = Array.isArray(matchedOrg.ad_accounts) ? matchedOrg.ad_accounts[0] : null
  if (!adAccount?.id) {
    return null
  }

    const { start_time, end_time } = getSnapDateRange(range)

  const statsUrl =
    `https://adsapi.snapchat.com/v1/adaccounts/${adAccount.id}/stats` +
    `?granularity=TOTAL` +
    `&fields=impressions,swipes,spend,conversion_purchases` +
    `&start_time=${encodeURIComponent(start_time)}` +
    `&end_time=${encodeURIComponent(end_time)}`

  const statsResp = await fetch(statsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const statsText = await statsResp.text()

  let statsJson
  try {
    statsJson = JSON.parse(statsText)
  } catch {
    throw new Error(`Snap stats returned non-JSON response: ${statsText.slice(0, 300)}`)
  }

    if (!statsResp.ok) {
    throw new Error(
      `Failed to fetch Snapchat stats: ${JSON.stringify(statsJson).slice(0, 1000)}`
    )
  }

      const timeseries = statsJson?.timeseries_stats || statsJson?.stats || []

  if (!Array.isArray(timeseries) || timeseries.length === 0) {
    throw new Error(
      `Snapchat stats shape not recognized: ${JSON.stringify(statsJson).slice(0, 1200)}`
    )
  }

  const first = Array.isArray(timeseries) ? timeseries[0] : null
  const stats = first?.timeseries_stat?.stats || {}

  const impressions = Number(stats.impressions || 0)
  const swipes = Number(stats.swipes || 0)
  const spend = Number(stats.spend || 0)
  const conversions = Number(stats.conversion_purchases || 0)
  const ctr = impressions > 0 ? (swipes / impressions) * 100 : 0
  const cpc = swipes > 0 ? spend / swipes : 0

  return {
    platform: 'Snapchat',
    campaign: adAccount.name || matchedOrg.name || 'Snapchat',
    spend,
    impressions,
    clicks: swipes,
    ctr,
    cpc,
    conversions
  }
}
