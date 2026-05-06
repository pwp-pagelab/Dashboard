import {
  getMetaBusinessAdAccounts,
  findMatchingMetaAccount,
  getMetaAccessTokenForBusiness,
  getMetaAccessTokenCandidates,
  getMetaAccountIdOverride,
  getMetaAccountNameOverride,
  getMetaBusinessKeyOverride
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

function getFirstAvailableMetaBusinessKey(client, preferredBusinessKey = null) {
  const businessKeys = Array.isArray(client?.metaBusinessKeys)
    ? client.metaBusinessKeys
    : client?.metaBusinessKey
      ? [client.metaBusinessKey]
      : []

  const keys = preferredBusinessKey
    ? [preferredBusinessKey, ...businessKeys.filter((key) => key !== preferredBusinessKey)]
    : businessKeys

  return keys.find((key) => getMetaAccessTokenForBusiness(key)) || null
}

function getAvailableMetaBusinessKeys(client, preferredBusinessKey = null) {
  const businessKeys = Array.isArray(client?.metaBusinessKeys)
    ? client.metaBusinessKeys
    : client?.metaBusinessKey
      ? [client.metaBusinessKey]
      : []

  const keys = preferredBusinessKey
    ? [preferredBusinessKey, ...businessKeys.filter((key) => key !== preferredBusinessKey)]
    : businessKeys

  return keys.filter((key, index) => keys.indexOf(key) === index && getMetaAccessTokenForBusiness(key))
}

function getClientMetaBusinessKeys(client, preferredBusinessKey = null) {
  const businessKeys = Array.isArray(client?.metaBusinessKeys)
    ? client.metaBusinessKeys
    : client?.metaBusinessKey
      ? [client.metaBusinessKey]
      : []

  return preferredBusinessKey
    ? [preferredBusinessKey, ...businessKeys.filter((key) => key !== preferredBusinessKey)]
    : businessKeys
}

async function fetchMetaInsights({ accountId, accessToken, datePreset, timeRange }) {
  const accountPath = String(accountId).startsWith('act_')
    ? String(accountId)
    : `act_${accountId}`

  const fields = [
    'account_name',
    'account_currency',
    'date_start',
    'date_stop',
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
    `&access_token=${encodeURIComponent(String(accessToken).trim())}`

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

  return data?.data?.[0] || null
}

export async function getMetaData({
  clientId,
  datePreset = 'last_30d',
  timeRange = null,
  accountId = null,
  businessKey = null,
  accountName = null
} = {}) {
  const client = getClientById(clientId)
  if (!client) return null

  let matchedAccount = null
  let selectedBusinessKey = businessKey || getMetaBusinessKeyOverride(clientId) || null
  const accountIdOverride = accountId || getMetaAccountIdOverride(clientId)
  const accountNameOverride = accountName || getMetaAccountNameOverride(clientId)

  if (accountIdOverride) {
    selectedBusinessKey = getFirstAvailableMetaBusinessKey(client, selectedBusinessKey)
    matchedAccount = {
      id: String(accountIdOverride),
      account_id: String(accountIdOverride).replace(/^act_/, ''),
      name: accountNameOverride || client.name
    }
  } else {
    const match = await findMatchedAccountAcrossBusinesses(client)
    matchedAccount = match.matchedAccount
    selectedBusinessKey = match.businessKey
  }

  if (!matchedAccount || !selectedBusinessKey) return null

  const selectedAccountId = matchedAccount.account_id || matchedAccount.id
  if (!selectedAccountId) return null

  const tokenCandidates = accountIdOverride
    ? getMetaAccessTokenCandidates(getClientMetaBusinessKeys(client, selectedBusinessKey))
    : getAvailableMetaBusinessKeys(client, selectedBusinessKey).map((key) => ({
        key,
        accessToken: getMetaAccessTokenForBusiness(key)
      }))

  if (!tokenCandidates.length) return null

  let row = null
  let lastError = null

  for (const candidate of tokenCandidates) {
    try {
      row = await fetchMetaInsights({
        accountId: selectedAccountId,
        accessToken: candidate.accessToken,
        datePreset,
        timeRange
      })
      selectedBusinessKey = candidate.key
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!row && lastError) throw lastError
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
    metaBusinessKeyUsed: selectedBusinessKey,
    metaCurrency: row.account_currency || null,
    metaDateRange: {
      start: row.date_start || timeRange?.since || null,
      end: row.date_stop || timeRange?.until || null,
      datePreset: timeRange ? null : datePreset
    },
    metaRawMetrics: {
      spend: row.spend || '0',
      impressions: row.impressions || '0',
      clicks: row.clicks || '0',
      ctr: row.ctr || '0',
      cpc: row.cpc || '0',
      actions: row.actions || []
    }
  }
}
