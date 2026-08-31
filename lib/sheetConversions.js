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

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase()
}

function parseConverted(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['y', 'yes', 'true', '1', 'converted', 'won'].includes(normalized)
}

function normalizeDate(value) {
  if (!value) return null
  const match = String(value).match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
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
  const sourceIndex = findColumn(config.sourceColumn)
  const dateIndex = config.dateColumn ? findColumn(config.dateColumn) : -1

  if ([leadIdIndex, convertedIndex, sourceIndex].some((index) => index < 0)) {
    throw new Error('Google Sheet is missing one or more configured lead-conversion columns')
  }

  const byLeadId = new Map()
  values.slice(1).forEach((row) => {
    const leadId = String(row[leadIdIndex] ?? '').trim()
    if (!leadId) return

    byLeadId.set(leadId, {
      leadId,
      converted: parseConverted(row[convertedIndex]),
      source: String(row[sourceIndex] ?? '').trim(),
      date: dateIndex >= 0 ? normalizeDate(row[dateIndex]) : null
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
  if (!config.spreadsheetId || !config.sheetName) return null

  try {
    const accessToken = await getServiceAccountAccessToken({ env, fetchImpl })
    const range = `${quoteSheetName(config.sheetName)}!A:ZZ`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Google Sheets API request failed')
    }

    return {
      rows: parseSheetConversionRows(payload.values || [], config),
      fetchedAt: new Date().toISOString(),
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName
    }
  } catch (error) {
    logger.error?.(`Sheet conversions unavailable for ${clientConfig.id || clientConfig.name || 'client'}: ${error.message}`)
    return null
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

export function mergeConversions(platformData, sheetData) {
  if (!sheetData || !Array.isArray(platformData)) return platformData

  const rows = platformData.map((row, index) => ({
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
      costPerConvertedLead: convertedCount > 0 ? spend / convertedCount : null,
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
