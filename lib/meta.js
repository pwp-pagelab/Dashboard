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

function sumRows(rows = []) {
  return rows.reduce(
    (acc, row) => {
      acc.spend += Number(row.spend || 0)
      acc.impressions += Number(row.impressions || 0)
      acc.clicks += Number(row.clicks || 0)
      acc.conversions += getMetaConversionValue(row.actions)
      return acc
    },
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0
    }
  )
}

export async function getMetaData({
  clientId,
  datePreset = 'last_30d',
  timeRange = null
} = {}) {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) return null

  const client = getClientById(clientId)
  if (!client || !client.metaBusinessKey) return null

  const accounts = await getMetaBusinessAdAccounts(client.metaBusinessKey)
  if (!Array.isArray(accounts) || accounts.length === 0) return null

  const matchedAccount = findMatchingMetaAccount(accounts, client)
  if (!matchedAccount) return null

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
    url += `&time_increment=1`
  } else {
    url += `&date_preset=${encodeURIComponent(datePreset)}`
  }

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta API error')
  }

  const rows = Array.isArray(data?.data) ? data.data : []
  if (!rows.length) return null

  const totals = sumRows(rows)
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0

  return {
    platform: 'Meta',
    campaign: rows[0].account_name || matchedAccount.name || 'Meta',
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr,
    cpc,
    conversions: totals.conversions,
    metaAccountName: matchedAccount.name,
    metaAccountId: matchedAccount.account_id || matchedAccount.id
  }
}
