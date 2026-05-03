import {
  getMetaBusinessAdAccounts,
  findMatchingMetaAccount,
  getMetaAccessTokenForBusiness
} from './metaAccounts.js'
import { getClientById } from '../data/clients.js'

function getMetaConversionValue(actions = []) {
  if (!Array.isArray(actions)) return 0

  const preferredTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'offsite_conversion.purchase',
    'onsite_web_purchase',
    'onsite_web_app_purchase',
    'omni_purchase',
    'complete_registration',
    'offsite_conversion.fb_pixel_complete_registration',
    'offsite_complete_registration_add_meta_leads',
    'omni_complete_registration',
    'lead',
    'onsite_web_lead',
    'omni_lead'
  ]

  for (const type of preferredTypes) {
    const found = actions.find((a) => a.action_type === type)
    if (found && found.value != null) {
      return Number(found.value || 0)
    }
  }

  return 0
}

async function findMatchedAccountAcrossBusinesses(client) {
  const businessKeys = Array.isArray(client.metaBusinessKeys)
    ? client.metaBusinessKeys
    : client.metaBusinessKey
      ? [client.metaBusinessKey]
      : []

  for (const businessKey of businessKeys) {
    const accounts = await getMetaBusinessAdAccounts(businessKey)
    const matched = findMatchingMetaAccount(accounts, client)
    if (matched) {
      return { matchedAccount: matched, businessKey }
    }
  }

  return { matchedAccount: null, businessKey: null }
}

export async function getMetaData({
  clientId,
  datePreset = 'last_30d',
  timeRange = null
} = {}) {
  const client = getClientById(clientId)
  if (!client) return null

  const { matchedAccount, businessKey } = await findMatchedAccountAcrossBusinesses(client)
  if (!matchedAccount || !businessKey) return null

  const accessToken = getMetaAccessTokenForBusiness(businessKey)
  if (!accessToken) return null

  const token = String(accessToken).trim()
  const accountId = matchedAccount.account_id || matchedAccount.id
  if (!accountId) return null

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
    `&action_report_time=conversion` +
    `&use_account_attribution_setting=true` +
    `&access_token=${encodeURIComponent(token)}`

  if (timeRange) {
    url += `&time_range=${encodeURIComponent(JSON.stringify(timeRange))}`
  } else {
    url += `&date_preset=${encodeURIComponent(datePreset)}`
  }

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Meta returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta API error')
  }

  const row = data?.data?.[0]
  if (!row) return null

  return {
    platform: 'Meta',
    campaign: row.account_name || matchedAccount.name || 'Meta',
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    conversions: getMetaConversionValue(row.actions),
    metaAccountName: matchedAccount.name,
    metaAccountId: matchedAccount.account_id || matchedAccount.id,
    metaBusinessKeyUsed: businessKey
  }
}
