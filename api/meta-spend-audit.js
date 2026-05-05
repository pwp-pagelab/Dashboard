import { getClientById } from '../data/clients.js'
import {
  getMetaAccessTokenForBusiness,
  getMetaBusinessAdAccountsMulti
} from '../lib/metaAccounts.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getClientBusinessKeys(client) {
  if (Array.isArray(client.metaBusinessKeys)) return client.metaBusinessKeys
  if (client.metaBusinessKey) return [client.metaBusinessKey]
  return []
}

function getDateRange(client, platform = 'meta') {
  return {
    since: client.platformStartDates?.[platform] || client.reportingStartDate || '2026-01-01',
    until: todayISO()
  }
}

async function fetchAccountInsights({ account, businessKey, timeRange }) {
  const token = getMetaAccessTokenForBusiness(businessKey)
  if (!token) {
    return {
      ok: false,
      account,
      businessKey,
      error: `Missing Meta token for ${businessKey}`
    }
  }

  const accountPath = String(account.account_id || account.id).startsWith('act_')
    ? String(account.account_id || account.id)
    : `act_${account.account_id || account.id}`

  const fields = [
    'account_name',
    'account_currency',
    'date_start',
    'date_stop',
    'spend',
    'impressions',
    'clicks',
    'actions'
  ].join(',')

  const url =
    `https://graph.facebook.com/v19.0/${accountPath}/insights` +
    `?level=account` +
    `&fields=${encodeURIComponent(fields)}` +
    `&action_report_time=conversion` +
    `&use_account_attribution_setting=true` +
    `&time_range=${encodeURIComponent(JSON.stringify(timeRange))}` +
    `&access_token=${encodeURIComponent(token)}`

  const response = await fetch(url)
  const text = await response.text()

  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { nonJsonResponse: text.slice(0, 300) }
  }

  if (!response.ok) {
    return {
      ok: false,
      account,
      businessKey,
      status: response.status,
      error: data?.error?.message || 'Meta insights request failed',
      raw: data
    }
  }

  const row = data?.data?.[0] || null

  return {
    ok: true,
    account: {
      id: account.id,
      account_id: account.account_id,
      name: account.name
    },
    businessKey,
    spend: Number(row?.spend || 0),
    impressions: Number(row?.impressions || 0),
    clicks: Number(row?.clicks || 0),
    currency: row?.account_currency || null,
    dateRange: {
      start: row?.date_start || timeRange.since,
      end: row?.date_stop || timeRange.until
    },
    hasData: Boolean(row),
    rawMetrics: row
      ? {
          spend: row.spend || '0',
          impressions: row.impressions || '0',
          clicks: row.clicks || '0',
          actions: row.actions || []
        }
      : null
  }
}

export default async function handler(req, res) {
  const clientId = req.query.client || 'pwp'
  const client = getClientById(clientId)

  if (!client) {
    return res.status(404).json({
      ok: false,
      error: 'Client not found.'
    })
  }

  const businessKeys = getClientBusinessKeys(client)
  if (!businessKeys.length) {
    return res.status(400).json({
      ok: false,
      error: 'Client has no Meta business keys configured.'
    })
  }

  try {
    const accounts = await getMetaBusinessAdAccountsMulti(businessKeys)
    const timeRange = getDateRange(client)
    const results = []

    for (const account of accounts) {
      for (const businessKey of businessKeys) {
        results.push(await fetchAccountInsights({ account, businessKey, timeRange }))
      }
    }

    const successful = results
      .filter((result) => result.ok)
      .sort((a, b) => b.spend - a.spend)

    return res.status(200).json({
      ok: true,
      client: {
        id: client.id,
        name: client.name,
        metaAccountId: client.metaAccountId || null,
        metaMatch: client.metaMatch || null,
        businessKeys
      },
      dateRange: timeRange,
      topSpenders: successful.slice(0, 15),
      allResults: results,
      nextStep: 'Use the account_id with the correct spend as META_ACCOUNT_ID_PWP in Vercel. If only one businessKey row works for that account, also set META_BUSINESS_KEY_PWP to that businessKey.'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
