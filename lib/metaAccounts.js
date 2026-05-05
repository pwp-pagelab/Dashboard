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

function getMetaBusinessesMap() {
  return {
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
}

function getMetaTokensMap() {
  const fallback = process.env.META_ACCESS_TOKEN || ''

  return {
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
}

export function getMetaBusinessId(businessKey) {
  return getMetaBusinessesMap()[businessKey] || null
}

export function getMetaAccessTokenForBusiness(businessKey) {
  return getMetaTokensMap()[businessKey] || ''
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
