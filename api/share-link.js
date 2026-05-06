import { getClientById } from '../data/clients.js'
import { createSignedReportToken } from '../data/publicReports.js'

function getBaseUrl(req) {
  const proto = req.headers?.['x-forwarded-proto'] || 'https'
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host
  return host ? `${proto}://${host}` : ''
}

function firstMetaBusinessKey(client) {
  if (Array.isArray(client.metaBusinessKeys)) return client.metaBusinessKeys[0] || null
  return client.metaBusinessKey || null
}

function getAccountDetails(client, platform) {
  if (platform === 'all') {
    return {
      accountId: null,
      accountName: client.name
    }
  }

  if (platform === 'linkedin') {
    return {
      accountId: client.linkedinAccountId || null,
      accountName: client.name
    }
  }

  if (platform === 'tiktok') {
    return {
      accountId: client.tiktokAdvertiserId || null,
      accountName: client.name
    }
  }

  if (platform === 'meta') {
    return {
      accountId: client.metaAccountId || null,
      accountName: client.name,
      businessKey: firstMetaBusinessKey(client)
    }
  }

  if (platform === 'snapchat') {
    return {
      accountId: client.snapchatAdAccountId || null,
      accountName: client.name
    }
  }

  if (platform === 'google') {
    return {
      accountId: client.googleCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID || null,
      accountName: client.name,
      loginCustomerId: client.googleLoginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || null
    }
  }

  return null
}

function parseSelectedAccountIds(value) {
  if (!value) return []
  const raw = Array.isArray(value) ? value.join(',') : String(value)

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((id) => String(id)).filter(Boolean) : []
  } catch {
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }
}

export default async function handler(req, res) {
  const clientId = req.query.client
  const platform = String(req.query.platform || '').toLowerCase()
  const range = req.query.range || 'max'
  const selectedAccountIds = parseSelectedAccountIds(req.query.accounts)
  const client = getClientById(clientId)

  if (!client) {
    return res.status(404).json({
      ok: false,
      error: 'Client not found.'
    })
  }

  const activePlatforms = Object.entries(client.platforms || {})
    .filter(([, config]) => config?.enabled)
    .map(([key]) => key)

  if (!platform || (platform !== 'all' && !client.platforms?.[platform]?.enabled)) {
    return res.status(400).json({
      ok: false,
      error: 'Choose an active platform or all platforms before creating a client link.'
    })
  }

  const accountDetails = getAccountDetails(client, platform)
  if (!accountDetails) {
    return res.status(400).json({
      ok: false,
      error: 'This platform is not supported for public links yet.'
    })
  }

  try {
    const token = createSignedReportToken({
      clientId: client.id,
      clientName: client.name,
      platform,
      platforms: platform === 'all' ? activePlatforms : [platform],
      selectedAccountIds,
      ...accountDetails
    })
    const baseUrl = getBaseUrl(req)
    const url = `${baseUrl}/?shareToken=${encodeURIComponent(token)}&range=${encodeURIComponent(range)}`

    return res.status(200).json({
      ok: true,
      url,
      token,
      client: {
        id: client.id,
        name: client.name
      },
      platform,
      platforms: platform === 'all' ? activePlatforms : [platform],
      accountId: accountDetails.accountId
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message === 'Missing PUBLIC_SHARE_SECRET'
        ? 'Add PUBLIC_SHARE_SECRET in Vercel first, then redeploy.'
        : error.message
    })
  }
}
