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

function getMetaBusinessesMap() {
  return {
    PWP_MAIN: process.env.META_BUSINESS_ID_MAIN,
    PWP_SECOND: process.env.META_BUSINESS_ID_SECOND
  }
}

export async function getMetaBusinessAdAccounts(businessKey) {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('Missing META_ACCESS_TOKEN')
  }

  const businessMap = getMetaBusinessesMap()
  const businessId = businessMap[businessKey]

  if (!businessId) {
    throw new Error(`Missing business id for key: ${businessKey}`)
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
    return (
      accounts.find((account) => String(account.name || '').toLowerCase().trim() === needle) || null
    )
  }

  return (
    accounts.find((account) => String(account.name || '').toLowerCase().includes(needle)) || null
  )
}
