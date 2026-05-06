import {
  getMetaAccessTokenForBusiness,
  getMetaBusinessAdAccountsMulti,
  getAllMetaAdAccounts,
  findMatchingMetaAccount
} from '../lib/metaAccounts.js'
import { clients, getClientById } from '../data/clients.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getClientBusinessKeys(client) {
  if (Array.isArray(client.metaBusinessKeys)) return client.metaBusinessKeys
  if (client.metaBusinessKey) return [client.metaBusinessKey]
  return []
}

function getMetaDateRange(client) {
  return {
    since: client.platformStartDates?.meta || client.reportingStartDate || '2026-01-01',
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
  const clientId = req.query.client || null
  const businessKey = req.query.businessKey || null
  const spendAudit = req.query.spend === '1' || req.query.mode === 'spend'

  try {
    if (!clientId && !businessKey) {
      const discovery = await getAllMetaAdAccounts()

      return res.status(200).json({
        ok: true,
        mode: 'all-connected-meta-accounts',
        message: 'Pass ?client=<clientId>, ?client=<clientId>&spend=1, or ?businessKey=<key>',
        discoveredBusinessPortfolios: discovery.portfolios,
        discoveryErrors: discovery.errors,
        accounts: discovery.accounts.map((account) => ({
          id: account.id,
          accountId: account.account_id,
          name: account.name,
          source: account.source || null,
          businessId: account.businessId || null,
          businessName: account.businessName || null,
          tokenKey: account.tokenKey || null
        })),
        availableClients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          metaBusinessKeys: c.metaBusinessKeys || (c.metaBusinessKey ? [c.metaBusinessKey] : [])
        }))
      })
    }

    if (clientId) {
      const client = getClientById(clientId)

      if (!client) {
        return res.status(404).json({
          ok: false,
          error: 'Client not found'
        })
      }

      const businessKeys = getClientBusinessKeys(client)

      if (!businessKeys.length) {
        return res.status(404).json({
          ok: false,
          error: 'Client has no metaBusinessKeys'
        })
      }

      const discovery = await getAllMetaAdAccounts()
      const accounts = discovery.accounts.length
        ? discovery.accounts
        : await getMetaBusinessAdAccountsMulti(businessKeys)
      const matched = findMatchingMetaAccount(accounts, client)

      if (spendAudit) {
        const timeRange = getMetaDateRange(client)
        const results = []

        for (const account of accounts) {
          for (const key of businessKeys) {
            results.push(await fetchAccountInsights({ account, businessKey: key, timeRange }))
          }
        }

        const successful = results
          .filter((result) => result.ok)
          .sort((a, b) => b.spend - a.spend)

        return res.status(200).json({
          ok: true,
          mode: 'client-spend-audit',
          client: {
            id: client.id,
            name: client.name,
            metaBusinessKeys: businessKeys,
            metaMatch: client.metaMatch || null,
            metaAccountId: client.metaAccountId || null,
            metaAccountName: client.metaAccountName || null
          },
          discoveredBusinessPortfolios: discovery.portfolios,
          discoveryErrors: discovery.errors,
          dateRange: timeRange,
          topSpenders: successful.slice(0, 15),
          allResults: results,
          nextStep: `Use the account_id with the correct spend as META_ACCOUNT_ID_${client.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')} in Vercel. If only one businessKey row works for that account, also set META_BUSINESS_KEY_${client.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')} to that businessKey.`
        })
      }

      return res.status(200).json({
        ok: true,
        mode: 'client',
        client: {
          id: client.id,
          name: client.name,
          metaBusinessKeys: businessKeys,
          metaMatch: client.metaMatch || null,
          metaAccountId: client.metaAccountId || null,
          metaAccountName: client.metaAccountName || null
        },
        tokenSetup: Object.fromEntries(
          businessKeys.map((key) => [
            key,
            {
              hasDedicatedToken: Boolean(process.env[`META_ACCESS_TOKEN_${key}`]),
              hasBusinessIdOverride: Boolean(process.env[`META_BUSINESS_ID_${key}`])
            }
          ])
        ),
        matchedAccount: matched || null,
        accounts
      })
    }

    const accounts = await getMetaBusinessAdAccountsMulti([businessKey])

    return res.status(200).json({
      ok: true,
      mode: 'business',
      businessKey,
      accounts
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
