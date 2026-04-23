import { clients, getClientById } from '../data/clients.js'
import { getMetaData } from '../lib/meta.js'
import { getGoogleAdsData } from '../lib/googleAds.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getRangeConfig(range) {
  if (range === '7d') {
    return {
      meta: { datePreset: 'last_7d', timeRange: null },
      google: { dateRange: 'LAST_7_DAYS', startDate: null, endDate: null }
    }
  }

  if (range === 'this_month') {
    return {
      meta: { datePreset: 'this_month', timeRange: null },
      google: { dateRange: 'THIS_MONTH', startDate: null, endDate: null }
    }
  }

    if (range === 'max') {
    const today = new Date()
    const metaStart = new Date(today)
    metaStart.setMonth(metaStart.getMonth() - 36)

    const metaStartISO = metaStart.toISOString().slice(0, 10)

    return {
      meta: {
        datePreset: null,
        timeRange: { since: metaStartISO, until: todayISO() }
      },
      google: {
        dateRange: null,
        startDate: '2000-01-01',
        endDate: todayISO()
      }
    }
  }

  return {
    meta: { datePreset: 'last_30d', timeRange: null },
    google: { dateRange: 'LAST_30_DAYS', startDate: null, endDate: null }
  }
}

export default async function handler(req, res) {
  const clientId = req.query.client || 'rimiya'
  const platformFilter = req.query.platform || 'all'
  const range = req.query.range || '30d'

  const client = getClientById(clientId)

  if (!client) {
    return res.status(404).json({
      ok: false,
      error: 'Client not found',
      availableClients: clients.map((c) => ({ id: c.id, name: c.name }))
    })
  }

  try {
    const rows = []
    const rangeConfig = getRangeConfig(range)

    if ((platformFilter === 'all' || platformFilter === 'meta') && client.platforms.meta?.enabled) {
      const metaRow = await getMetaData(clientId,

  ...rangeConfig.meta)
      if (metaRow) rows.push(metaRow)
    }

    if ((platformFilter === 'all' || platformFilter === 'google') && client.platforms.google?.enabled) {
      const googleRow = await getGoogleAdsData(rangeConfig.google)
      if (googleRow) rows.push(googleRow)
    }

    const totalSpend = rows.reduce((sum, row) => sum + (row.spend || 0), 0)
    const totalImpressions = rows.reduce((sum, row) => sum + (row.impressions || 0), 0)
    const totalClicks = rows.reduce((sum, row) => sum + (row.clicks || 0), 0)
    const totalConversions = rows.reduce((sum, row) => sum + (row.conversions || 0), 0)
    const blendedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      client: {
        id: client.id,
        name: client.name
      },
      filters: {
        client: clientId,
        platform: platformFilter,
        range
      },
      availableClients: clients.map((c) => ({ id: c.id, name: c.name })),
      availablePlatforms: Object.entries(client.platforms)
        .filter(([, config]) => config?.enabled)
        .map(([key]) => key),
      summaryCards: [
        { label: 'Total Spend', value: `SAR ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: 'Impressions', value: totalImpressions.toLocaleString() },
        { label: 'Clicks', value: totalClicks.toLocaleString() },
        { label: 'CTR', value: `${blendedCtr.toFixed(2)}%` },
        { label: 'Conversions', value: totalConversions.toLocaleString() },
        { label: 'Platforms Active', value: rows.length.toString() }
      ],
      campaignRows: rows.map((row) => ({
        platform: row.platform,
        campaign: row.campaign,
        spend: `SAR ${row.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        clicks: row.clicks.toLocaleString(),
        conversions: row.conversions == null ? 'N/A' : row.conversions.toLocaleString()
      })),
      platformSplit: rows.reduce((acc, row) => {
        const key = row.platform.toLowerCase().replace(/\s+/g, '_')
        acc[key] = {
          spend: `SAR ${row.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          conversions: row.conversions == null ? 'N/A' : row.conversions.toLocaleString()
        }
        return acc
      }, {})
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
