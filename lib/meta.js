import { getMetaBusinessAdAccounts, findMatchingMetaAccount } from '../lib/metaAccounts.js'
import { getClientById } from '../data/clients.js'

export default async function handler(req, res) {
  const clientId = req.query.client || 'rimiya'
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    return res.status(500).json({ ok: false, error: 'Missing META_ACCESS_TOKEN' })
  }

  const client = getClientById(clientId)
  if (!client || !client.metaBusinessKey) {
    return res.status(404).json({ ok: false, error: 'Client not found or missing metaBusinessKey' })
  }

  try {
    const accounts = await getMetaBusinessAdAccounts(client.metaBusinessKey)
    const matchedAccount = findMatchingMetaAccount(accounts, client)

    if (!matchedAccount) {
      return res.status(404).json({ ok: false, error: 'Matching Meta account not found' })
    }

    const accountId = matchedAccount.account_id || matchedAccount.id
    const accountPath = String(accountId).startsWith('act_') ? String(accountId) : `act_${accountId}`

    const fields = ['account_name', 'date_start', 'date_stop', 'actions'].join(',')

    const url =
      `https://graph.facebook.com/v19.0/${accountPath}/insights` +
      `?level=account` +
      `&fields=${encodeURIComponent(fields)}` +
      `&action_report_time=conversion` +
      `&use_account_attribution_setting=true` +
      `&time_range=${encodeURIComponent(JSON.stringify({ since: '2000-01-01', until: new Date().toISOString().slice(0, 10) }))}` +
      `&time_increment=1` +
      `&access_token=${encodeURIComponent(String(accessToken).trim())}`

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || 'Meta API error',
        raw: data
      })
    }

    const rows = Array.isArray(data?.data) ? data.data : []

    const allActionTypes = {}
    for (const row of rows) {
      const actions = Array.isArray(row.actions) ? row.actions : []
      for (const action of actions) {
        const key = action.action_type || 'unknown'
        allActionTypes[key] = (allActionTypes[key] || 0) + Number(action.value || 0)
      }
    }

    return res.status(200).json({
      ok: true,
      client: clientId,
      account: matchedAccount.name,
      rows: rows.slice(0, 10),
      actionTypeTotals: allActionTypes
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
