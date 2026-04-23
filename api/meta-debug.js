import { clients, getClientById } from '../data/clients.js'
import { getMetaBusinessAdAccounts } from '../lib/metaAccounts.js'

export default async function handler(req, res) {
  const clientId = req.query.client || null
  const businessKey = req.query.businessKey || null

  try {
    if (clientId) {
      const client = getClientById(clientId)

      if (!client) {
        return res.status(404).json({
          ok: false,
          error: 'Client not found',
          availableClients: clients.map((c) => ({ id: c.id, name: c.name }))
        })
      }

      if (!client.metaBusinessKey) {
        return res.status(400).json({
          ok: false,
          error: 'Client has no metaBusinessKey'
        })
      }

      const accounts = await getMetaBusinessAdAccounts(client.metaBusinessKey)

      return res.status(200).json({
        ok: true,
        mode: 'client',
        client: {
          id: client.id,
          name: client.name,
          metaBusinessKey: client.metaBusinessKey,
          metaMatch: client.metaMatch || null
        },
        accounts: accounts.map((account) => ({
          id: account.id,
          account_id: account.account_id,
          name: account.name
        }))
      })
    }

    if (businessKey) {
      const accounts = await getMetaBusinessAdAccounts(businessKey)

      return res.status(200).json({
        ok: true,
        mode: 'business',
        businessKey,
        accounts: accounts.map((account) => ({
          id: account.id,
          account_id: account.account_id,
          name: account.name
        }))
      })
    }

    return res.status(200).json({
      ok: true,
      message: 'Pass ?client=<clientId> or ?businessKey=<key>',
      availableClients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        metaBusinessKey: c.metaBusinessKey || null
      }))
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
