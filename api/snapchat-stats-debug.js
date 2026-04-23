import { getClientById } from '../data/clients.js'

async function getSnapAccessToken() {
  const clientId = process.env.SNAP_CLIENT_ID
  const clientSecret = process.env.SNAP_CLIENT_SECRET
  const refreshToken = process.env.SNAP_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing SNAP_CLIENT_ID, SNAP_CLIENT_SECRET, or SNAP_REFRESH_TOKEN')
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
  now.setMinutes(0, 0, 0)

  const end = new Date(now)
  const start = new Date(now)

  if (range === '7d') {
    start.setDate(start.getDate() - 7)
  } else if (range === 'this_month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  } else if (range === 'max') {
    start.setFullYear(start.getFullYear() - 2)
    start.setMinutes(0, 0, 0)
  } else {
    start.setDate(start.getDate() - 30)
  }

  start.setMinutes(0, 0, 0)

  return {
    start_time: start.toISOString(),
    end_time: end.toISOString()
  }
}

export default async function handler(req, res) {
  const clientId = req.query.client || 'calistrafitness'
  const range = req.query.range || '30d'

  try {
    const client = getClientById(clientId)
    if (!client) {
      return res.status(404).json({
        ok: false,
        error: 'Client not found'
      })
    }

    const accessToken = await getSnapAccessToken()

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
      return res.status(500).json({
        ok: false,
        stage: 'organizations_non_json',
        snippet: orgText.slice(0, 500)
      })
    }

    if (!orgResp.ok) {
      return res.status(orgResp.status).json({
        ok: false,
        stage: 'organizations',
        snapError: orgJson
      })
    }

    const organizations = Array.isArray(orgJson?.organizations) ? orgJson.organizations : []
    const matchedOrgWrapper = findMatchingSnapOrganization(organizations, client)
    const matchedOrg = matchedOrgWrapper?.organization || null

    if (!matchedOrg) {
      return res.status(404).json({
        ok: false,
        stage: 'match',
        error: 'No matching Snapchat organization found'
      })
    }

    const adAccount = Array.isArray(matchedOrg.ad_accounts) ? matchedOrg.ad_accounts[0] : null

    if (!adAccount?.id) {
      return res.status(404).json({
        ok: false,
        stage: 'ad_account',
        error: 'No Snapchat ad account found for matched organization'
      })
    }

    const { start_time, end_time } = getSnapDateRange(range)

    const statsUrl =
      `https://adsapi.snapchat.com/v1/adaccounts/${adAccount.id}/stats` +
      `?granularity=TOTAL` +
      `&breakdown=campaign` +
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
      return res.status(500).json({
        ok: false,
        stage: 'stats_non_json',
        snippet: statsText.slice(0, 500)
      })
    }

    return res.status(statsResp.ok ? 200 : statsResp.status).json({
      ok: statsResp.ok,
      client: {
        id: client.id,
        name: client.name
      },
      matchedOrganization: {
        id: matchedOrg.id,
        name: matchedOrg.name
      },
      adAccount: {
        id: adAccount.id,
        name: adAccount.name
      },
      range,
      start_time,
      end_time,
      statsUrl,
      rawStats: statsJson
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
