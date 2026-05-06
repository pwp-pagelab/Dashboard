function normalizeAccount(account) {
  if (!account) return null

  const accountId = account.account_id || account.id || ''
  const normalizedId = String(accountId).replace(/^act_/, '')

  return {
    ...account,
    id: String(account.id || account.account_id || ''),
    account_id: normalizedId,
    name: account.name || account.account_name || account.display_name || normalizedId
  }
}

function dedupeAccounts(accounts = []) {
  const map = new Map()

  for (const raw of accounts) {
    const account = normalizeAccount(raw)
    if (!account?.account_id) continue
    if (!map.has(account.account_id)) {
      map.set(account.account_id, account)
    }
  }

  return Array.from(map.values())
}

function uniqueTokenEntries(entries = []) {
  const seen = new Set()
  const unique = []

  for (const entry of entries) {
    const token = String(entry.accessToken || '').trim()
    if (!token || seen.has(token)) continue
    seen.add(token)
    unique.push({
      key: entry.key,
      accessToken: token
    })
  }

  return unique
}

function getMetaBusinessesMap() {
  const configured = {
    POSTWITHPASSION:
      process.env.META_BUSINESS_ID_POSTWITHPASSION || '320089234114465',

    DAR_ALOSRAH:
      process.env.META_BUSINESS_ID_DAR_ALOSRAH || '458511463736279',

    FIRST_STEP:
      process.env.META_BUSINESS_ID_FIRST_STEP || '906088321668788',

    KABAB_SHAKERS:
      process.env.META_BUSINESS_ID_KABAB_SHAKERS || '926834632720535',

    PWP_SECOND_ACCOUNT:
      process.env.META_BUSINESS_ID_PWP_SECOND_ACCOUNT ||
      process.env.META_BUSINESS_ID_PWP_SECOND ||
      '203176764910250',

    PWP_SECOND:
      process.env.META_BUSINESS_ID_PWP_SECOND ||
      process.env.META_BUSINESS_ID_PWP_SECOND_ACCOUNT ||
      '203176764910250',

    PET_MARKET:
      process.env.META_BUSINESS_ID_PET_MARKET || '1304839418048492',

    SBSF:
      process.env.META_BUSINESS_ID_SBSF || '806790699864423',

    YAMAMA_COMPANY:
      process.env.META_BUSINESS_ID_YAMAMA_COMPANY || '136377124895724',

    YAMM_SA:
      process.env.META_BUSINESS_ID_YAMM_SA || '878368772959236',

    NO7:
      process.env.META_BUSINESS_ID_NO7 || '1388532018545684'
  }

  Object.entries(process.env).forEach(([envKey, value]) => {
    if (!envKey.startsWith('META_BUSINESS_ID_') || !value) return
    const businessKey = envKey.replace('META_BUSINESS_ID_', '')
    configured[businessKey] = value
  })

  return configured
}

function getMetaTokensMap() {
  const fallback = process.env.META_ACCESS_TOKEN || ''

  const configured = {
    POSTWITHPASSION:
      process.env.META_ACCESS_TOKEN_POSTWITHPASSION || fallback,

    DAR_ALOSRAH:
      process.env.META_ACCESS_TOKEN_DAR_ALOSRAH || fallback,

    FIRST_STEP:
      process.env.META_ACCESS_TOKEN_FIRST_STEP || fallback,

    KABAB_SHAKERS:
      process.env.META_ACCESS_TOKEN_KABAB_SHAKERS || fallback,

    PWP_SECOND_ACCOUNT:
      process.env.META_ACCESS_TOKEN_PWP_SECOND_ACCOUNT ||
      process.env.META_ACCESS_TOKEN_PWP_SECOND ||
      fallback,

    PWP_SECOND:
      process.env.META_ACCESS_TOKEN_PWP_SECOND ||
      process.env.META_ACCESS_TOKEN_PWP_SECOND_ACCOUNT ||
      fallback,

    PET_MARKET:
      process.env.META_ACCESS_TOKEN_PET_MARKET || fallback,

    SBSF:
      process.env.META_ACCESS_TOKEN_SBSF || '',

    YAMAMA_COMPANY:
      process.env.META_ACCESS_TOKEN_YAMAMA_COMPANY || fallback,

    YAMM_SA:
      process.env.META_ACCESS_TOKEN_YAMM_SA || fallback,

    NO7:
      process.env.META_ACCESS_TOKEN_NO7 || fallback
  }

  Object.entries(process.env).forEach(([envKey, value]) => {
    if (!envKey.startsWith('META_ACCESS_TOKEN_') || !value) return
    const tokenKey = envKey.replace('META_ACCESS_TOKEN_', '')
    configured[tokenKey] = value
  })

  return configured
}

export function getMetaBusinessId(businessKey) {
  return getMetaBusinessesMap()[businessKey] || null
}

export function getMetaAccessTokenForBusiness(businessKey) {
  return getMetaTokensMap()[businessKey] || ''
}

export function getConfiguredMetaBusinessKeys() {
  return Object.keys(getMetaBusinessesMap()).filter((key) => getMetaAccessTokenForBusiness(key))
}

export function getMetaAccessTokenCandidates(preferredBusinessKeys = []) {
  const tokensMap = getMetaTokensMap()
  const preferred = Array.isArray(preferredBusinessKeys) ? preferredBusinessKeys.filter(Boolean) : []
  const orderedKeys = [
    ...preferred,
    ...Object.keys(tokensMap).filter((key) => !preferred.includes(key))
  ]

  return uniqueTokenEntries([
    ...orderedKeys.map((key) => ({
      key,
      accessToken: tokensMap[key]
    })),
    {
      key: 'META_ACCESS_TOKEN',
      accessToken: process.env.META_ACCESS_TOKEN || ''
    }
  ])
}

export function getMetaAccountIdOverride(clientId) {
  if (!clientId) return null

  const key = `META_ACCOUNT_ID_${String(clientId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
  return process.env[key] || null
}

export function getMetaAccountNameOverride(clientId) {
  if (!clientId) return null

  const key = `META_ACCOUNT_NAME_${String(clientId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
  return process.env[key] || null
}

export function getMetaBusinessKeyOverride(clientId) {
  if (!clientId) return null

  const key = `META_BUSINESS_KEY_${String(clientId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
  return process.env[key] || null
}

async function fetchBusinessOwnedAccounts(businessId, accessToken) {
  const fields = 'id,account_id,name'
  const url =
    `https://graph.facebook.com/v19.0/${businessId}/owned_ad_accounts` +
    `?fields=${encodeURIComponent(fields)}` +
    `&limit=200` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Meta owned_ad_accounts returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta owned_ad_accounts API error')
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function fetchBusinessClientAccounts(businessId, accessToken) {
  const fields = 'id,account_id,name'
  const url =
    `https://graph.facebook.com/v19.0/${businessId}/client_ad_accounts` +
    `?fields=${encodeURIComponent(fields)}` +
    `&limit=200` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Meta client_ad_accounts returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta client_ad_accounts API error')
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function fetchTokenBusinesses(accessToken) {
  const url =
    `https://graph.facebook.com/v19.0/me/businesses` +
    `?fields=${encodeURIComponent('id,name')}` +
    `&limit=200` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Meta businesses returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta businesses API error')
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function fetchTokenAdAccounts(accessToken) {
  const url =
    `https://graph.facebook.com/v19.0/me/adaccounts` +
    `?fields=${encodeURIComponent('id,account_id,name')}` +
    `&limit=200` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Meta adaccounts returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta adaccounts API error')
  }

  return Array.isArray(data?.data) ? data.data : []
}

export async function getMetaBusinessAdAccounts(businessKey) {
  const businessId = getMetaBusinessId(businessKey)
  const accessToken = getMetaAccessTokenForBusiness(businessKey)

  if (!businessId) {
    throw new Error(`Missing business id for key: ${businessKey}`)
  }

  if (!accessToken) {
    throw new Error(`Missing access token for key: ${businessKey}`)
  }

  const [owned, client] = await Promise.all([
    fetchBusinessOwnedAccounts(businessId, accessToken),
    fetchBusinessClientAccounts(businessId, accessToken)
  ])

  return dedupeAccounts([...owned, ...client])
}

export async function getMetaBusinessAdAccountsMulti(businessKeys = []) {
  const keys = Array.isArray(businessKeys) ? businessKeys.filter(Boolean) : []
  if (!keys.length) return []

  const results = await Promise.all(keys.map((key) => getMetaBusinessAdAccounts(key)))
  return dedupeAccounts(results.flat())
}

export async function getDiscoveredMetaBusinessPortfolios() {
  const tokenEntries = getMetaAccessTokenCandidates()
  const portfolios = []
  const errors = []

  for (const tokenEntry of tokenEntries) {
    try {
      const businesses = await fetchTokenBusinesses(tokenEntry.accessToken)
      businesses.forEach((business) => {
        portfolios.push({
          id: String(business.id || ''),
          name: business.name || String(business.id || ''),
          tokenKey: tokenEntry.key,
          accessToken: tokenEntry.accessToken
        })
      })
    } catch (error) {
      errors.push({
        tokenKey: tokenEntry.key,
        error: error.message
      })
    }
  }

  const byId = new Map()
  portfolios.forEach((portfolio) => {
    if (!portfolio.id || byId.has(portfolio.id)) return
    byId.set(portfolio.id, portfolio)
  })

  return {
    portfolios: Array.from(byId.values()),
    errors
  }
}

export async function getAllMetaAdAccounts() {
  const tokenEntries = getMetaAccessTokenCandidates()
  const discovered = await getDiscoveredMetaBusinessPortfolios()
  const accounts = []
  const errors = [...discovered.errors]

  for (const tokenEntry of tokenEntries) {
    try {
      const directAccounts = await fetchTokenAdAccounts(tokenEntry.accessToken)
      directAccounts.forEach((account) => {
        accounts.push({
          ...account,
          source: 'token-adaccounts',
          tokenKey: tokenEntry.key
        })
      })
    } catch (error) {
      errors.push({
        source: 'token-adaccounts',
        tokenKey: tokenEntry.key,
        error: error.message
      })
    }
  }

  for (const portfolio of discovered.portfolios) {
    try {
      const [owned, client] = await Promise.all([
        fetchBusinessOwnedAccounts(portfolio.id, portfolio.accessToken),
        fetchBusinessClientAccounts(portfolio.id, portfolio.accessToken)
      ])

      owned.forEach((account) => {
        accounts.push({
          ...account,
          source: 'business-owned',
          businessId: portfolio.id,
          businessName: portfolio.name,
          tokenKey: portfolio.tokenKey
        })
      })
      client.forEach((account) => {
        accounts.push({
          ...account,
          source: 'business-client',
          businessId: portfolio.id,
          businessName: portfolio.name,
          tokenKey: portfolio.tokenKey
        })
      })
    } catch (error) {
      errors.push({
        source: 'business-adaccounts',
        businessId: portfolio.id,
        businessName: portfolio.name,
        tokenKey: portfolio.tokenKey,
        error: error.message
      })
    }
  }

  return {
    portfolios: discovered.portfolios.map(({ accessToken, ...portfolio }) => portfolio),
    accounts: dedupeAccounts(accounts),
    errors
  }
}

export function findMatchingMetaAccount(accounts = [], client) {
  if (!client || !Array.isArray(accounts) || !accounts.length) return null

  const match = client.metaMatch || null
  if (!match?.value) return null

  const needle = String(match.value).toLowerCase().trim()

  if (match.type === 'exact') {
    return accounts.find((account) => String(account.name || '').toLowerCase().trim() === needle) || null
  }

  return accounts.find((account) => String(account.name || '').toLowerCase().includes(needle)) || null
}

export function findMatchingMetaAccountWithBusiness(accounts = [], client) {
  const matched = findMatchingMetaAccount(accounts, client)
  return matched || null
}
