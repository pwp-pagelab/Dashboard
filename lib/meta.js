import { getMetaBusinessAdAccounts, findMatchingMetaAccount } from './metaAccounts.js'
import { getClientById } from '../data/clients.js'

function getMetaConversionValue(actions = []) {
  if (!Array.isArray(actions)) return 0

  const preferredTypes = [
    'lead',
    'onsite_web_lead',
    'omni_lead',
    'purchase',
    'offsite_conversion.purchase',
    'offsite_conversion.fb_pixel_purchase',
    'complete_registration'
  ]

  for (const type of preferredTypes) {
    const found = actions.find((a) => a.action_type === type)
    if (found && found.value != null) {
      return Number(found.value || 0)
    }
  }

  return 0
}

export async function getMetaData({
  clientId,
  datePreset = 'last_30d',
  timeRange = null
} = {}) {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    return null
  }

  const client = getClientById(clientId)
  if (!client) {
    return null
  }

  if (!client.metaBusinessKey) {
    return null
  }

  const accounts = await getMetaBusinessAdAccounts(client.metaBusinessKey)
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return null
  }

  const matchedAccount = findMatchingMetaAccount(accounts, client)
  if (!matchedAccount) {
    return null
  }

  const token = String(accessToken).trim()
  const accountId = matchedAccount.account_id || matchedAccount.id

  if (!accountId) {
    return null
  }

  const accountPath = String(accountId).startsWith('act_')
    ? String(accountId)
    : `act_${accountId}`

  const fields = [
    'account_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpc',
    'actions'
  ].join(',')

  let url =
    `https://graph.facebook.com/v19.0/${accountPath}/insights` +
    `?level=account` +
    `&fields=${encodeURIComponent(fields)}` +
    `&access_token=${encodeURIComponent(token)}`

  if (timeRange) {
    url += `&time_range=${encodeURIComponent(JSON.stringify(timeRange))}`
  } else {
    url += `&date_preset=${encodeURIComponent(datePreset)}`
  }

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta API error')
  }

  const row = data?.data?.[0]
  if (!row) return null

  const conversions = getMetaConversionValue(row.actions)

  return {
    platform: 'Meta',
    campaign: row.account_name || matchedAccount.name || 'Meta',
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    conversions,
    metaAccountName: matchedAccount.name,
    metaAccountId: matchedAccount.account_id || matchedAccount.id
  }
}
