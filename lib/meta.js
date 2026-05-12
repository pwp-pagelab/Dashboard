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

function getActionValue(actions = [], types = []) {
  if (!Array.isArray(actions)) return 0

  return Math.max(
    0,
    ...types.map((type) => {
      const found = actions.find((a) => a.action_type === type)
      return Number(found?.value || 0)
    })
  )
}

function getMetaActionBreakdown(actions = []) {
  const purchases = getActionValue(actions, [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'offsite_conversion.purchase',
    'onsite_web_purchase',
    'onsite_web_app_purchase',
    'omni_purchase'
  ])

  const leads = getActionValue(actions, [
    'lead',
    'onsite_web_lead',
    'omni_lead',
    'offsite_complete_registration_add_meta_leads',
    'onsite_conversion.lead',
    'onsite_conversion.lead_grouped'
  ])

  const registrations = getActionValue(actions, [
    'complete_registration',
    'offsite_conversion.fb_pixel_complete_registration',
    'omni_complete_registration'
  ])

  const messagingConversations = getActionValue(actions, [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_first_reply'
  ])

  return {
    purchases,
    leads,
    registrations,
    messagingConversations,
    totalResults: purchases + leads + registrations + messagingConversations
  }
}

function getMetaConversionValue(actions = []) {
  return getMetaActionBreakdown(actions).totalResults
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

function buildMetaInsightsUrl({ accountId, accessToken, datePreset, timeRange, timeIncrement = null }) {
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

  const url =
    `https://graph.facebook.com/v19.0/${accountPath}/insights` +
    `?level=account` +
    `&fields=${encodeURIComponent(fields)}` +
    `&action_report_time=conversion` +
    `&use_account_attribution_setting=true` +
    `&access_token=${encodeURIComponent(String(accessToken).trim())}`

  const params = []
  if (timeRange) {
    params.push(`time_range=${encodeURIComponent(JSON.stringify(timeRange))}`)
  } else {
    params.push(`date_preset=${encodeURIComponent(datePreset)}`)
  }
  if (timeIncrement) {
    params.push(`time_increment=${encodeURIComponent(String(timeIncrement))}`)
  }

  return params.length ? `${url}&${params.join('&')}` : url
}

async function fetchMetaInsightRows({ accountId, accessToken, datePreset, timeRange, timeIncrement = null }) {
  let url = buildMetaInsightsUrl({
    accountId,
    accessToken,
    datePreset,
    timeRange,
    timeIncrement
  })
  const rows = []

  while (url) {
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

    rows.push(...(Array.isArray(data?.data) ? data.data : []))
    url = data?.paging?.next || null
  }

  return rows
}

async function fetchMetaInsights({ accountId, accessToken, datePreset, timeRange }) {
  const rows = await fetchMetaInsightRows({ accountId, accessToken, datePreset, timeRange })
  return rows[0] || null
}

function toMetaDaily(rows = []) {
  return rows
    .filter((row) => row?.date_start)
    .map((row) => {
      const spend = Number(row.spend || 0)
      const actionBreakdown = getMetaActionBreakdown(row.actions)
      const conversions = actionBreakdown.totalResults

      return {
        date: row.date_start,
        spend,
        conversions,
        cpa: conversions > 0 ? spend / conversions : null
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
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
  let dailyRows = []
  let lastError = null

  for (const candidate of tokenCandidates) {
    try {
      row = await fetchMetaInsights({
        accountId: selectedAccountId,
        accessToken: candidate.accessToken,
        datePreset,
        timeRange
      })
      try {
        dailyRows = await fetchMetaInsightRows({
          accountId: selectedAccountId,
          accessToken: candidate.accessToken,
          datePreset,
          timeRange,
          timeIncrement: 1
        })
      } catch {
        dailyRows = []
      }
      selectedBusinessKey = candidate.key
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!row && lastError) throw lastError
  if (!row) return null
  const actionBreakdown = getMetaActionBreakdown(row.actions)

  return {
    platform: 'Meta',
    campaign: row.account_name || matchedAccount.name || 'Meta',
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    conversions: actionBreakdown.totalResults,
    currencyCode: row.account_currency || 'SAR',
    conversionLabel: 'Meta results',
    conversionBreakdown: actionBreakdown,
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
    },
    daily: toMetaDaily(dailyRows)
  }
}
