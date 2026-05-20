import { clients } from '../data/clients.js'
import { getAllMetaAdAccounts } from '../lib/metaAccounts.js'
import { buildDashboardPayload } from './dashboard.js'

const PLATFORM_FIELDS = {
  meta: {
    idField: 'metaAccountId',
    matchField: 'metaMatch'
  },
  tiktok: {
    idField: 'tiktokAdvertiserId'
  },
  snapchat: {
    idField: 'snapchatAdAccountId',
    matchField: 'snapMatch'
  },
  linkedin: {
    idField: 'linkedinAccountId'
  },
  google: {
    idField: 'googleCustomerId'
  }
}

function platformStatus(client, platform) {
  const config = client.platforms?.[platform] || { enabled: false }
  const fields = PLATFORM_FIELDS[platform]
  const accountId = fields?.idField ? client[fields.idField] || null : null
  const match = fields?.matchField ? client[fields.matchField] || null : null

  if (!config.enabled) {
    return {
      enabled: false,
      status: 'disabled',
      accountId,
      match: match?.value || null
    }
  }

  if (accountId) {
    return {
      enabled: true,
      status: 'connected_exact_id',
      accountId,
      match: match?.value || null
    }
  }

  if (match?.value) {
    return {
      enabled: true,
      status: 'needs_exact_id_uses_name_match',
      accountId: null,
      match: match.value
    }
  }

  return {
    enabled: true,
    status: 'enabled_missing_account_id',
    accountId: null,
    match: null
  }
}

function buildAccountAudit() {
  const platforms = Object.keys(PLATFORM_FIELDS)
  const rows = clients.map((client) => {
    const checks = Object.fromEntries(
      platforms.map((platform) => [platform, platformStatus(client, platform)])
    )

    return {
      id: client.id,
      name: client.name,
      reportingStartDate: client.reportingStartDate || '2026-01-01',
      checks,
      needsConfirmation: platforms.filter((platform) =>
        checks[platform].enabled && checks[platform].status !== 'connected_exact_id'
      )
    }
  })

  return {
    ok: true,
    type: 'account-mapping-audit',
    generatedAt: new Date().toISOString(),
    summary: {
      clients: rows.length,
      connectedExactIds: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'connected_exact_id').length
        ])
      ),
      nameMatched: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'needs_exact_id_uses_name_match').length
        ])
      ),
      enabledMissingIds: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'enabled_missing_account_id').length
        ])
      )
    },
    clients: rows
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function clientBusinessKeys() {
  return unique(
    clients.flatMap((client) => {
      if (Array.isArray(client.metaBusinessKeys)) return client.metaBusinessKeys
      if (client.metaBusinessKey) return [client.metaBusinessKey]
      return []
    })
  )
}

function textScore(client, accountName) {
  const haystack = String(accountName || '').toLowerCase()
  const needles = unique([
    client.name,
    client.id,
    client.metaMatch?.value,
    client.snapMatch?.value
  ].map((value) => String(value || '').toLowerCase().trim()))

  if (!haystack || !needles.length) return 0
  if (needles.some((needle) => needle && haystack === needle)) return 100
  if (needles.some((needle) => needle && haystack.includes(needle))) return 80
  if (needles.some((needle) => needle && needle.includes(haystack))) return 70

  const clientWords = needles
    .flatMap((needle) => needle.split(/[^a-z0-9\u0600-\u06FF]+/))
    .filter((word) => word.length >= 3)

  return clientWords.some((word) => haystack.includes(word)) ? 50 : 0
}

function suggestMatches(accounts, platform) {
  return clients.map((client) => {
    const suggestions = accounts
      .map((account) => ({
        platform,
        account,
        score: textScore(client, account.name)
      }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return {
      clientId: client.id,
      clientName: client.name,
      currentAccountId:
        platform === 'meta'
          ? client.metaAccountId || null
          : platform === 'tiktok'
            ? client.tiktokAdvertiserId || null
            : platform === 'snapchat'
              ? client.snapchatAdAccountId || null
              : platform === 'linkedin'
                ? client.linkedinAccountId || null
                : platform === 'google'
                  ? client.googleCustomerId || null
                  : null,
      suggestions
    }
  }).filter((row) => row.suggestions.length)
}

async function discoverMetaAccounts() {
  const discovery = await getAllMetaAdAccounts()

  return {
    ok: true,
    configuredBusinessKeys: clientBusinessKeys(),
    discoveredBusinessPortfolios: discovery.portfolios,
    discoveryErrors: discovery.errors,
    accounts: discovery.accounts.map((account) => ({
      id: account.id,
      accountId: account.account_id,
      name: account.name,
      source: account.source || null,
      businessId: account.businessId || null,
      businessName: account.businessName || null,
      tokenKey: account.tokenKey || null
    })),
    suggestedMatches: suggestMatches(
      discovery.accounts.map((account) => ({
        id: account.id,
        accountId: account.account_id,
        name: account.name
      })),
      'meta'
    )
  }
}

async function discoverTikTokAccounts() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN
  const appId = process.env.TIKTOK_APP_ID
  const secret = process.env.TIKTOK_APP_SECRET

  if (!accessToken || !appId || !secret) {
    throw new Error('Missing TikTok access token, app ID, or app secret')
  }

  const url =
    `https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&secret=${encodeURIComponent(secret)}`

  const response = await fetch(url, {
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })
  const data = await response.json()

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || 'TikTok advertiser discovery failed')
  }

  const accounts = (Array.isArray(data?.data?.list) ? data.data.list : []).map((account) => ({
    id: String(account.advertiser_id || ''),
    accountId: String(account.advertiser_id || ''),
    name: account.advertiser_name || String(account.advertiser_id || '')
  }))

  return {
    ok: true,
    accounts,
    suggestedMatches: suggestMatches(accounts, 'tiktok')
  }
}

async function getSnapAccessToken() {
  const clientId = process.env.SNAP_CLIENT_ID
  const clientSecret = process.env.SNAP_CLIENT_SECRET
  const refreshToken = process.env.SNAP_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Snapchat client ID, client secret, or refresh token')
  }

  const response = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
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
  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Snapchat token refresh failed')
  }

  return data.access_token
}

async function discoverSnapchatAccounts() {
  const accessToken = await getSnapAccessToken()
  const response = await fetch(
    'https://adsapi.snapchat.com/v1/me/organizations?with_ad_accounts=true',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.request_status || 'Snapchat account discovery failed')
  }

  const organizations = Array.isArray(data?.organizations) ? data.organizations : []
  const accounts = organizations.flatMap((wrapper) => {
    const organization = wrapper.organization || wrapper
    return (Array.isArray(organization.ad_accounts) ? organization.ad_accounts : []).map((account) => ({
      id: account.id,
      accountId: account.id,
      name: account.name || account.id,
      organizationId: organization.id,
      organizationName: organization.name
    }))
  })

  return {
    ok: true,
    organizations: organizations.map((wrapper) => {
      const organization = wrapper.organization || wrapper
      return {
        id: organization.id,
        name: organization.name,
        adAccountCount: Array.isArray(organization.ad_accounts) ? organization.ad_accounts.length : 0
      }
    }),
    accounts,
    suggestedMatches: suggestMatches(accounts, 'snapchat')
  }
}

async function discoverLinkedInAccounts() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) throw new Error('Missing LinkedIn access token')

  const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search', {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202604',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'LinkedIn ad account discovery failed')
  }

  const accounts = (Array.isArray(data?.elements) ? data.elements : []).map((account) => ({
    id: String(account.id || ''),
    accountId: String(account.id || ''),
    name: account.name || account.reference || String(account.id || ''),
    status: account.status || null
  }))

  return {
    ok: true,
    accounts,
    suggestedMatches: suggestMatches(accounts, 'linkedin')
  }
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Ads OAuth variables')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google OAuth failed')
  }

  return data.access_token
}

async function discoverGoogleAccounts() {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!developerToken) throw new Error('Missing Google Ads developer token')

  const accessToken = await getGoogleAccessToken()
  const response = await fetch('https://googleads.googleapis.com/v24/customers:listAccessibleCustomers', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken
    }
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(JSON.stringify(data).slice(0, 500))
  }

  const accounts = (Array.isArray(data?.resourceNames) ? data.resourceNames : []).map((resourceName) => {
    const accountId = String(resourceName).replace('customers/', '')
    return {
      id: accountId,
      accountId,
      name: accountId
    }
  })

  return {
    ok: true,
    accounts,
    suggestedMatches: suggestMatches(accounts, 'google')
  }
}

async function settle(label, fn) {
  try {
    return [label, await fn()]
  } catch (error) {
    return [label, { ok: false, error: error.message }]
  }
}

async function buildLiveDiscoveryAudit() {
  const entries = await Promise.all([
    settle('meta', discoverMetaAccounts),
    settle('tiktok', discoverTikTokAccounts),
    settle('snapchat', discoverSnapchatAccounts),
    settle('linkedin', discoverLinkedInAccounts),
    settle('google', discoverGoogleAccounts)
  ])

  const platforms = Object.fromEntries(entries)

  return {
    ok: true,
    type: 'live-account-discovery',
    generatedAt: new Date().toISOString(),
    note: 'This reads the connected ad portfolios/accounts and suggests likely client matches. Confirm matches before locking IDs.',
    platforms
  }
}

function getReportingAuditClients(queryClient) {
  if (!queryClient || queryClient === 'all') return clients
  const requested = String(queryClient)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  return clients.filter((client) => requested.includes(client.id))
}

async function buildReportingAudit({ client: queryClient = 'all', range = 'max' } = {}) {
  const auditClients = getReportingAuditClients(queryClient)
  const results = []

  for (const client of auditClients) {
    try {
      const payload = await buildDashboardPayload({
        clientId: client.id,
        platformFilter: 'all',
        range,
        publicMode: false
      })

      const statuses = Array.isArray(payload.accountStatuses) ? payload.accountStatuses : []
      const summaryCards = Array.isArray(payload.summaryCards) ? payload.summaryCards : []
      results.push({
        id: client.id,
        name: client.name,
        reportingStartDate: client.reportingStartDate || null,
        platforms: payload.availablePlatforms || [],
        totalSpend: summaryCards.find((card) => card.label === 'Total Spend')?.value || null,
        impressions: summaryCards.find((card) => card.label === 'Impressions')?.value || null,
        clicks: summaryCards.find((card) => card.label === 'Clicks')?.value || null,
        results: summaryCards.find((card) => card.label === 'Results')?.value || null,
        accountStatuses: statuses.map((status) => ({
          platform: status.platformLabel,
          accountName: status.accountName,
          accountId: status.accountId,
          status: status.status,
          message: status.message,
          spend: status.spend,
          impressions: status.impressions,
          clicks: status.clicks,
          results: status.conversions
        })),
        platformErrors: payload.diagnostics?.platformErrors || [],
        needsAttention: statuses.filter((status) => status.status !== 'loaded')
      })
    } catch (error) {
      results.push({
        id: client.id,
        name: client.name,
        error: error.message || 'Unable to audit reporting.'
      })
    }
  }

  return {
    ok: true,
    type: 'reporting-audit',
    generatedAt: new Date().toISOString(),
    range,
    clientsChecked: results.length,
    clientsWithAttention: results.filter((result) => result.error || result.needsAttention?.length).length,
    results
  }
}

export default async function handler(req, res) {
  if (req.query.audit === 'accounts') {
    return res.status(200).json(buildAccountAudit())
  }

  if (req.query.audit === 'live-accounts') {
    return res.status(200).json(await buildLiveDiscoveryAudit())
  }

  if (req.query.audit === 'reporting') {
    return res.status(200).json(await buildReportingAudit({
      client: req.query.client || 'all',
      range: req.query.range || 'max'
    }))
  }

  res.status(200).json({
    ok: true,
    message: 'Backend is working',
    timestamp: new Date().toISOString()
  })
}
