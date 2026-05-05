import {
  getMetaBusinessAdAccountsMulti,
  findMatchingMetaAccount
} from '../lib/metaAccounts.js'
import { clients, getClientById } from '../data/clients.js'

export default async function handler(req, res) {
  const clientId = req.query.client || null
  const businessKey = req.query.businessKey || null

  try {
    if (!clientId && !businessKey) {
      return res.status(200).json({
        ok: true,
        message: 'Pass ?client=<clientId> or ?businessKey=<key>',
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

      const businessKeys = Array.isArray(client.metaBusinessKeys)
        ? client.metaBusinessKeys
        : client.metaBusinessKey
          ? [client.metaBusinessKey]
          : []

      if (!businessKeys.length) {
        return res.status(404).json({
          ok: false,
          error: 'Client has no metaBusinessKeys'
        })
      }

      const accounts = await getMetaBusinessAdAccountsMulti(businessKeys)
      const matched = findMatchingMetaAccount(accounts, client)

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
