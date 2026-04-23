import { getMetaBusinessId } from '../data/metaBusinesses.js'

export async function getMetaBusinessAdAccounts(businessKey) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const businessId = getMetaBusinessId(businessKey)

  if (!accessToken || !businessId) {
    return []
  }

  const url =
    `https://graph.facebook.com/v19.0/${businessId}/owned_ad_accounts` +
    `?fields=id,name,account_id` +
    `&access_token=${encodeURIComponent(String(accessToken).trim())}`

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Meta business ad accounts')
  }

  return Array.isArray(data?.data) ? data.data : []
}

export function findMatchingMetaAccount(accounts, client) {
  if (!client?.metaMatch || !Array.isArray(accounts)) return null

  const { type, value } = client.metaMatch
  const target = String(value || '').toLowerCase()

  if (type === 'includes') {
    return (
      accounts.find((account) =>
        String(account?.name || '').toLowerCase().includes(target)
      ) || null
    )
  }

  if (type === 'exact') {
    return (
      accounts.find(
        (account) => String(account?.name || '').toLowerCase() === target
      ) || null
    )
  }

  return null
}
