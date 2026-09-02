import { createSign } from 'node:crypto'

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const tokenCache = new Map()

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function resolveConfigValue(value, env) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('env:')) return value
  return env[value.slice(4)] || ''
}

function readServiceAccount(env) {
  const rawJson = env.GOOGLE_SERVICE_ACCOUNT_KEY_B64 || env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
  let json = null

  if (rawJson) {
    try {
      json = JSON.parse(rawJson)
    } catch {
      try {
        json = JSON.parse(Buffer.from(rawJson, 'base64').toString('utf8'))
      } catch {
        json = null
      }
    }
  }

  const email = json?.client_email || env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL || ''
  const privateKey = json?.private_key || env.GOOGLE_SHEETS_PRIVATE_KEY || ''

  return {
    email,
    privateKey: String(privateKey).replace(/\\n/g, '\n')
  }
}

async function getServiceAccountAccessToken({ env, fetchImpl }) {
  const credentials = readServiceAccount(env)
  if (!credentials.email || !credentials.privateKey) {
    throw new Error('Missing Google Sheets service-account credentials')
  }

  const cached = tokenCache.get(credentials.email)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken

  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(JSON.stringify({
    iss: credentials.email,
    scope: SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }))
  const unsignedToken = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(credentials.privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`
    })
  })
  const payload = await response.json()

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Google service-account authentication failed')
  }

  tokenCache.set(credentials.email, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  })
  return payload.access_token
}

async function getOAuthAccessToken({ env, fetchImpl }) {
  const clientId = env.GOOGLE_SHEETS_CLIENT_ID || env.GOOGLE_ADS_CLIENT_ID || ''
  const clientSecret = env.GOOGLE_SHEETS_CLIENT_SECRET || env.GOOGLE_ADS_CLIENT_SECRET || ''
  const refreshToken = env.GOOGLE_SHEETS_REFRESH_TOKEN || ''
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Sheets OAuth credentials')
  }

  const cacheKey = `oauth:${clientId}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken

  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  const payload = await response.json()
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Google Sheets OAuth authentication failed')
  }

  tokenCache.set(cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  })
  return payload.access_token
}

async function getSheetsAccessToken(options) {
  const { env } = options
  const hasServiceAccount = Boolean(
    env.GOOGLE_SERVICE_ACCOUNT_KEY_B64 ||
    env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ||
    (env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SHEETS_PRIVATE_KEY)
  )

  return hasServiceAccount
    ? getServiceAccountAccessToken(options)
    : getOAuthAccessToken(options)
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase()
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < String(text || '').length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value || row.length) {
    row.push(value)
    if (row.some((cell) => cell !== '')) rows.push(row)
  }
  return rows
}

function parseConverted(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['y', 'yes', 'true', '1', 'converted', 'won', 'نعم'].includes(normalized)
}

function normalizeDate(value, dateFormat = '') {
  if (!value) return null
  const match = String(value).match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const shortDate = String(value).match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/)
  if (shortDate && ['MDY', 'DMY'].includes(dateFormat)) {
    const [, first, second, year] = shortDate
    const inferredFormat = Number(first) > 12
      ? 'DMY'
      : Number(second) > 12
        ? 'MDY'
        : dateFormat
    const month = inferredFormat === 'MDY' ? first : second
    const day = inferredFormat === 'MDY' ? second : first
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const parsed = new Date(`${normalized}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized ? normalized : null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function parseSheetConversionRows(values, config) {
  if (!Array.isArray(values) || values.length === 0 || !config) return []

  const headers = values[0].map(normalizeHeader)
  const findColumn = (name) => headers.indexOf(normalizeHeader(name))
  const leadIdIndex = findColumn(config.leadIdColumn)
  const convertedIndex = findColumn(config.convertedColumn)
  const sourceIndex = config.sourceColumn ? findColumn(config.sourceColumn) : -1
  const dateIndex = config.dateColumn ? findColumn(config.dateColumn) : -1

  if ([leadIdIndex, convertedIndex].some((index) => index < 0) || (sourceIndex < 0 && !config.sourceValue)) {
    throw new Error('Google Sheet is missing one or more configured lead-conversion columns')
  }

  const byLeadId = new Map()
  values.slice(1).forEach((row) => {
    const leadId = String(row[leadIdIndex] ?? '').trim()
    if (!leadId) return

    byLeadId.set(leadId, {
      leadId,
      converted: parseConverted(row[convertedIndex]),
      source: String(sourceIndex >= 0 ? row[sourceIndex] ?? '' : config.sourceValue).trim(),
      date: dateIndex >= 0 ? normalizeDate(row[dateIndex], config.dateFormat) : null
    })
  })

  return Array.from(byLeadId.values())
}

function quoteSheetName(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

export async function getSheetConversions(
  clientConfig,
  { env = process.env, fetchImpl = fetch, logger = console } = {}
) {
  if (!clientConfig?.leadsSheet) return null

  const config = Object.fromEntries(
    Object.entries(clientConfig.leadsSheet).map(([key, value]) => [key, resolveConfigValue(value, env)])
  )
  const tabs = Array.isArray(config.tabs) ? config.tabs : [config]
  if (!config.spreadsheetId || !tabs.length || tabs.some((tab) => !tab.sheetName)) return null

  async function fetchPublicTab(tab) {
    const params = tab.sheetId == null
      ? new URLSearchParams({ tqx: 'out:csv', sheet: tab.sheetName })
      : new URLSearchParams({ format: 'csv', gid: String(tab.sheetId) })
    const path = tab.sheetId == null ? 'gviz/tq' : 'export'
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}/${path}?${params.toString()}`
    const response = await fetchImpl(url)
    if (!response.ok) throw new Error(`Public Google Sheet read failed with status ${response.status || 'unknown'}`)
    return parseSheetConversionRows(parseCsvRows(await response.text()), tab)
  }

  function finish(tabResults) {
    if (!tabResults.some((result) => result.ok)) return null

    const uniqueRows = new Map()
    tabResults.flatMap((result) => result.rows).forEach((row) => {
      uniqueRows.set(`${String(row.source).toLowerCase()}:${row.leadId}`, row)
    })

    return {
      rows: Array.from(uniqueRows.values()),
      fetchedAt: new Date().toISOString(),
      spreadsheetId: config.spreadsheetId,
      sheetNames: tabs.map((tab) => tab.sheetName),
      dateColumnConfigured: tabs.every((tab) => Boolean(tab.dateColumn))
    }
  }

  try {
    let accessToken = null
    try {
      accessToken = await getSheetsAccessToken({ env, fetchImpl })
    } catch (error) {
      if (!config.allowPublicCsvFallback) throw error
      logger.error?.(`Authenticated Google Sheets access unavailable for ${clientConfig.id || clientConfig.name || 'client'}; using the configured public read-only fallback.`)
    }

    const tabResults = await Promise.all(tabs.map(async (tab) => {
      try {
        if (!accessToken) return { ok: true, rows: await fetchPublicTab(tab) }

        const range = `${quoteSheetName(tab.sheetName)}!A:ZZ`
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`
        const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error?.message || 'Google Sheets API request failed')
        return { ok: true, rows: parseSheetConversionRows(payload.values || [], tab) }
      } catch (error) {
        if (accessToken && config.allowPublicCsvFallback) {
          try {
            return { ok: true, rows: await fetchPublicTab(tab) }
          } catch (fallbackError) {
            logger.error?.(`Sheet conversions unavailable for ${clientConfig.id || clientConfig.name || 'client'} tab ${tab.sheetName}: ${fallbackError.message}`)
            return { ok: false, rows: [] }
          }
        }
        logger.error?.(`Sheet conversions unavailable for ${clientConfig.id || clientConfig.name || 'client'} tab ${tab.sheetName}: ${error.message}`)
        return { ok: false, rows: [] }
      }
    }))
    return finish(tabResults)
  } catch (error) {
    logger.error?.(`Sheet conversions unavailable for ${clientConfig.id || clientConfig.name || 'client'}: ${error.message}`)
    return null
  }
}

export function filterSheetConversionsByDate(sheetData, startDate, endDate) {
  if (!sheetData || !sheetData.dateColumnConfigured || !startDate || !endDate) return sheetData

  return {
    ...sheetData,
    rows: (sheetData.rows || []).filter((row) => (
      row.date && row.date >= startDate && row.date <= endDate
    ))
  }
}

function normalizeSource(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function platformSourceKey(platform) {
  const value = normalizeSource(platform)
  if (value.includes('meta') || value.includes('facebook') || value.includes('instagram')) return 'meta'
  if (value.includes('google')) return 'google'
  if (value.includes('tiktok') || value.includes('tik tok')) return 'tiktok'
  if (value.includes('snapchat') || value === 'snap') return 'snapchat'
  if (value.includes('linkedin') || value.includes('linked in')) return 'linkedin'
  return value
}

function leadCount(row) {
  if (row?.leadBreakdown?.totalLeads != null) return Number(row.leadBreakdown.totalLeads || 0)
  return Number(row?.leads ?? row?.conversions ?? 0)
}

function buildOwnedLeadRows(sheetData, ownedSourceFilter) {
  if (!ownedSourceFilter) return []

  const sourceDefinitions = {
    website: { platform: 'Website', campaign: 'Website enquiries', kind: 'form' },
    whatsapp: { platform: 'WhatsApp', campaign: 'WhatsApp enquiries', kind: 'message' }
  }
  const groups = new Map()

  for (const lead of sheetData?.rows || []) {
    const sourceKey = platformSourceKey(lead.source)
    if (!sourceDefinitions[sourceKey]) continue
    if (ownedSourceFilter !== 'all' && ownedSourceFilter !== sourceKey) continue
    if (!groups.has(sourceKey)) groups.set(sourceKey, [])
    groups.get(sourceKey).push(lead)
  }

  return Array.from(groups.entries()).map(([sourceKey, leads]) => {
    const definition = sourceDefinitions[sourceKey]
    const dailyMap = leads.reduce((map, lead) => {
      if (!lead.date) return map
      map.set(lead.date, (map.get(lead.date) || 0) + 1)
      return map
    }, new Map())
    const formSubmissions = definition.kind === 'form' ? leads.length : 0
    const directMessages = definition.kind === 'message' ? leads.length : 0

    return {
      platform: definition.platform,
      accountName: definition.platform,
      campaign: definition.campaign,
      ownedSource: true,
      spend: 0,
      spendSar: 0,
      originalSpend: 0,
      originalCurrencyCode: 'SAR',
      reach: null,
      impressions: 0,
      clicks: 0,
      engagements: 0,
      videoViews: 0,
      conversions: leads.length,
      leads: leads.length,
      formSubmissions,
      directMessages,
      leadBreakdown: { formSubmissions, directMessages, totalLeads: leads.length, details: [] },
      conversionLabel: 'Google Sheet leads',
      daily: Array.from(dailyMap.entries()).map(([date, totalLeads]) => ({
        date,
        spend: 0,
        conversions: totalLeads,
        totalLeads,
        formSubmissions: definition.kind === 'form' ? totalLeads : 0,
        directMessages: definition.kind === 'message' ? totalLeads : 0,
        cpa: null
      }))
    }
  })
}

export function mergeConversions(platformData, sheetData, { ownedSourceFilter = 'all' } = {}) {
  if (!sheetData || !Array.isArray(platformData)) return platformData

  const combinedData = [...platformData, ...buildOwnedLeadRows(sheetData, ownedSourceFilter)]
  const rows = combinedData.map((row, index) => ({
    index,
    row,
    campaignKey: normalizeSource(row.campaign || row.accountName),
    platformKey: platformSourceKey(row.platform)
  }))
  const assignments = rows.map(() => [])
  let unattributedCount = 0

  for (const lead of sheetData.rows || []) {
    const source = normalizeSource(lead.source)
    if (!source) {
      unattributedCount += 1
      continue
    }
    const sourcePlatform = platformSourceKey(source)
    const campaignMatches = rows.filter(({ campaignKey }) => (
      campaignKey && (source === campaignKey || source.includes(campaignKey) || campaignKey.includes(source))
    ))
    const platformMatches = rows.filter(({ platformKey }) => platformKey && platformKey === sourcePlatform)
    const match = campaignMatches.length === 1
      ? campaignMatches[0]
      : platformMatches.length === 1
        ? platformMatches[0]
        : null

    if (match) assignments[match.index].push(lead)
    else unattributedCount += 1
  }

  const mergedRows = rows.map(({ row, index }) => {
    const assigned = assignments[index]
    const convertedCount = assigned.filter((lead) => lead.converted).length
    const leads = leadCount(row)
    const spend = Number(row.spend || row.spendSar || 0)
    const convertedByDate = assigned.reduce((map, lead) => {
      if (lead.converted && lead.date) map.set(lead.date, (map.get(lead.date) || 0) + 1)
      return map
    }, new Map())
    const hasDatedConversions = assigned.some((lead) => Boolean(lead.date))

    return {
      ...row,
      convertedCount,
      conversionRate: leads > 0 ? (convertedCount / leads) * 100 : null,
      costPerConvertedLead: convertedCount > 0 && !row.ownedSource ? spend / convertedCount : null,
      ...(Array.isArray(row.daily) && hasDatedConversions
        ? {
            daily: row.daily.map((day) => {
              const dailyConvertedCount = convertedByDate.get(day.date) || 0
              const dailyLeads = Number(day.totalLeads ?? day.conversions ?? 0)
              return {
                ...day,
                convertedCount: dailyConvertedCount,
                conversionRate: dailyLeads > 0 ? (dailyConvertedCount / dailyLeads) * 100 : null
              }
            })
          }
        : {})
    }
  })

  Object.defineProperty(mergedRows, 'conversionAttribution', {
    value: {
      sheetLeadCount: (sheetData.rows || []).length,
      attributedCount: assignments.reduce((sum, items) => sum + items.length, 0),
      unattributedCount
    },
    enumerable: false
  })
  return mergedRows
}

export function summarizeConversions(platformData, sheetData) {
  if (!sheetData || !Array.isArray(platformData)) return null

  const totalLeads = platformData.reduce((sum, row) => sum + leadCount(row), 0)
  const totalSpend = platformData.reduce((sum, row) => sum + Number(row.spend || row.spendSar || 0), 0)
  const convertedCount = platformData.reduce((sum, row) => sum + Number(row.convertedCount || 0), 0)
  const attribution = platformData.conversionAttribution || {
    sheetLeadCount: (sheetData.rows || []).length,
    attributedCount: 0,
    unattributedCount: (sheetData.rows || []).length
  }

  return {
    convertedCount,
    conversionRate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : null,
    costPerConvertedLead: convertedCount > 0 ? totalSpend / convertedCount : null,
    ...attribution,
    fetchedAt: sheetData.fetchedAt || null
  }
}
