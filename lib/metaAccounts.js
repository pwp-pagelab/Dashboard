import { getMetaBusinessId } from '../data/metaBusinesses.js'

export async function getMetaBusinessAdAccounts(businessKey) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const businessId = getMetaBusinessId(businessKey)

  if (!accessToken || !businessId) {
    throw new Error('Missing META_ACCESS_TOKEN or mapped META business ID')
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

  return data?.data || []
}

export function findMatchingMetaAccount(accounts, client) {
  if (!client?.metaMatch) return null

  const { type, value } = client.metaMatch

  if (type === 'includes') {
    const target = String(value).toLowerCase()
    return (
      accounts.find((account) =>
        String(account?.name || '').toLowerCase().includes(target)
      ) || null
    )
  }

  if (type === 'exact') {
    const target = String(value).toLowerCase()
    return (
      accounts.find(
        (account) => String(account?.name || '').toLowerCase() === target
      ) || null
    )
  }

  return null
}
