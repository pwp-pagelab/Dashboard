import { clients, getClientById } from '../data/clients.js'
import { getMetaData } from '../lib/meta.js'
import { getGoogleAdsData } from '../lib/googleAds.js'
import { getSnapchatData } from '../lib/snapchat.js'
import { getTikTokData } from '../lib/tiktok.js'
import { getLinkedInReport } from '../lib/linkedin.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatSar(value) {
  return `SAR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function rangeLabel(range) {
  if (range === '7d') return 'the last 7 days'
  if (range === 'this_month') return 'this month'
  if (range === 'max') return 'since onboarding'
  return 'the last 30 days'
}

function periodPhrase(range) {
  return range === 'max' ? rangeLabel(range) : `in ${rangeLabel(range)}`
}

function getRangeConfig(range, client = null) {
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
    const startDate = client?.reportingStartDate || '2026-01-01'

    return {
      meta: {
        datePreset: null,
        timeRange: {
          since: startDate,
          until: todayISO()
        }
      },
      google: {
        dateRange: null,
        startDate,
        endDate: todayISO()
      }
    }
  }

  return {
    meta: { datePreset: 'last_30d', timeRange: null },
    google: { dateRange: 'LAST_30_DAYS', startDate: null, endDate: null }
  }
}

function combineDailyTrends(rows) {
  const dailyByDate = new Map()

  rows.forEach((row) => {
    const daily = row.daily || []
    daily.forEach((day) => {
      const existing = dailyByDate.get(day.date) || {
        date: day.date,
        spend: 0,
        conversions: 0
      }

      existing.spend += Number(day.spend || 0)
      existing.conversions += Number(day.conversions || 0)
      dailyByDate.set(day.date, existing)
    })
  })

  return Array.from(dailyByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      ...day,
      cpa: day.conversions > 0 ? day.spend / day.conversions : null
    }))
}

function buildSuggestedInsight({ client, range, totalSpend, totalImpressions, totalClicks, totalConversions, rows, daily }) {
  const clientName = client?.name || 'this client'
  const spendText = formatSar(totalSpend)
  const impressionText = totalImpressions.toLocaleString()
  const clickText = totalClicks.toLocaleString()
  const conversionText = totalConversions.toLocaleString()
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const clickToConversion = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
  const activePlatforms = rows.map((row) => row.platform).join(', ') || 'the active platforms'
  const hasDaily = daily.length > 1
  const firstDay = hasDaily ? daily[0] : null
  const lastDay = hasDaily ? daily[daily.length - 1] : null
  const spendDirection =
    firstDay && lastDay && lastDay.spend < firstDay.spend
      ? 'Spend is becoming more controlled across the period'
      : 'Spend is giving us a clear baseline for the next optimization step'

  if (totalClicks === 0) {
    return `${clientName} generated ${impressionText} impressions ${periodPhrase(range)}, creating a useful visibility base on ${activePlatforms}. The next positive step is to test stronger creative hooks and calls to action so more of this reach turns into visits.`
  }

  if (totalConversions === 0) {
    return `${clientName} spent ${spendText} ${periodPhrase(range)} and generated ${impressionText} impressions with ${clickText} clicks at a ${ctr.toFixed(2)}% click-through rate. This shows people are engaging; the next positive step is to review the landing page and conversion tracking so the existing traffic has a clearer path to convert. ${spendDirection}.`
  }

  return `${clientName} spent ${spendText} ${periodPhrase(range)} and generated ${impressionText} impressions, ${clickText} clicks, and ${conversionText} conversions. The funnel is producing measurable action, with a ${clickToConversion.toFixed(2)}% click-to-conversion rate; the next positive step is to identify the strongest platform contribution and scale from that base.`
}

function buildNextAction({ totalImpressions, totalClicks, totalConversions, totalSpend }) {
  if (totalImpressions === 0 && totalSpend === 0) {
    return 'Ready to build momentum. Next step: connect active campaign data.'
  }

  if (totalClicks === 0 && totalImpressions > 0) {
    return 'Building visibility. Next step: improve click-through with stronger creative hooks.'
  }

  if (totalConversions === 0 && totalClicks > 0) {
    return 'Positive engagement detected. Next step: improve the conversion path.'
  }

  if (totalConversions > 0) {
    return 'Conversions are coming in. Next step: scale the strongest platform.'
  }

  return 'Healthy momentum. Next step: keep optimizing efficiency.'
}

export async function buildDashboardPayload({
  clientId = 'rimiya',
  platformFilter = 'all',
  range = '30d',
  publicMode = false,
  lockedAccount = null
} = {}) {
  const client = getClientById(clientId)

  if (!client) {
    const error = new Error('Client not found')
    error.statusCode = 404
    error.availableClients = clients.map((c) => ({ id: c.id, name: c.name }))
    throw error
  }

  const effectivePlatformFilter = lockedAccount?.platform || platformFilter
  const rows = []
  const rangeConfig = getRangeConfig(range, client)
  let linkedinDiagnostics = null
  const platformErrors = []

  async function addPlatformRow(platformName, loadRow) {
    try {
      const row = await loadRow()
      if (row) rows.push(row)
    } catch (error) {
      platformErrors.push({
        platform: platformName,
        error: error.message || 'Unable to load platform data'
      })
    }
  }

  if (lockedAccount?.platform === 'meta') {
    await addPlatformRow('meta', () => getMetaData({
        clientId,
        ...rangeConfig.meta,
        accountId: lockedAccount.accountId,
        businessKey: lockedAccount.businessKey,
        accountName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'meta') && client.platforms.meta?.enabled) {
    await addPlatformRow('meta', () => getMetaData({
        clientId,
        ...rangeConfig.meta
      }))
  }

  if (lockedAccount?.platform === 'google') {
    await addPlatformRow('google', async () => {
      const googleRow = await getGoogleAdsData({
        ...rangeConfig.google,
        customerId: lockedAccount.accountId,
        loginCustomerId: lockedAccount.loginCustomerId
      })
      return googleRow
        ? {
            ...googleRow,
            campaign: lockedAccount.accountName || lockedAccount.clientName || googleRow.campaign
          }
        : null
    })
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'google') && client.platforms.google?.enabled) {
    await addPlatformRow('google', () => getGoogleAdsData({
      ...rangeConfig.google,
      customerId: client.googleCustomerId,
      loginCustomerId: client.googleLoginCustomerId
    }))
  }

  if (lockedAccount?.platform === 'snapchat') {
    await addPlatformRow('snapchat', () => getSnapchatData({
        clientId,
        range,
        adAccountId: lockedAccount.accountId,
        accountName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'snapchat') && client.platforms.snapchat?.enabled) {
    await addPlatformRow('snapchat', () => getSnapchatData({
        clientId,
        range
      }))
  }

  if (lockedAccount?.platform === 'tiktok') {
    await addPlatformRow('tiktok', () => getTikTokData({
        clientId,
        range,
        advertiserId: lockedAccount.accountId,
        clientName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'tiktok') && client.platforms.tiktok?.enabled) {
    await addPlatformRow('tiktok', () => getTikTokData({
        clientId,
        range
      }))
  }

  const linkedinEnabled =
    (lockedAccount?.platform === 'linkedin') ||
    ((effectivePlatformFilter === 'all' || effectivePlatformFilter === 'linkedin') && client.platforms.linkedin?.enabled)

  if (linkedinEnabled) {
    const linkedinReport = await getLinkedInReport({
      clientId,
      range,
      accountId: lockedAccount?.platform === 'linkedin' ? lockedAccount.accountId : null,
      clientOverride: lockedAccount?.platform === 'linkedin'
        ? {
            name: lockedAccount.accountName || lockedAccount.clientName || client.name,
            linkedinAccountId: lockedAccount.accountId
          }
        : null
    })
    if (linkedinReport.row) {
      rows.push({
        ...linkedinReport.row,
        daily: linkedinReport.daily || []
      })
    }
    linkedinDiagnostics = {
      ok: Boolean(linkedinReport.row),
      error: linkedinReport.error || null,
      strategy: linkedinReport.debug?.strategy || null,
      start: linkedinReport.debug?.start || null,
      end: linkedinReport.debug?.end || null,
      campaignCount: linkedinReport.debug?.campaignCount || null,
      attempts: publicMode
        ? []
        : (linkedinReport.debug?.attempts || []).map((attempt) => ({
            label: attempt.label,
            url: attempt.url,
            headers: attempt.headers,
            status: attempt.status,
            ok: attempt.ok,
            response: attempt.data
          }))
    }
  }

  const totalSpend = rows.reduce((sum, row) => sum + (row.spend || 0), 0)
  const totalImpressions = rows.reduce((sum, row) => sum + (row.impressions || 0), 0)
  const totalClicks = rows.reduce((sum, row) => sum + (row.clicks || 0), 0)
  const totalConversions = rows.reduce((sum, row) => sum + (row.conversions || 0), 0)
  const blendedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const daily = combineDailyTrends(rows)

  const googleData = rows.find((row) => row.platform === 'Google Ads') || null
  const displayClient = {
    id: client.id,
    name: lockedAccount?.clientName || client.name
  }

  return {
    updatedAt: new Date().toISOString(),
    client: displayClient,
    filters: {
      client: clientId,
      platform: effectivePlatformFilter,
      range
    },
    share: lockedAccount
      ? {
          locked: true,
          platform: lockedAccount.platform,
          accountId: lockedAccount.accountId
        }
      : null,
    availableClients: publicMode ? [] : clients.map((c) => ({ id: c.id, name: c.name })),
    availablePlatforms: publicMode && lockedAccount
      ? [effectivePlatformFilter]
      : Object.entries(client.platforms)
          .filter(([, config]) => config?.enabled)
          .map(([key]) => key),
    summaryCards: [
      {
        label: 'Total Spend',
        value: formatSar(totalSpend)
      },
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
    }, {}),
    diagnostics: publicMode
      ? {
          google: null,
          platformErrors,
          linkedin: linkedinDiagnostics
            ? {
                ok: linkedinDiagnostics.ok,
                error: linkedinDiagnostics.error,
                strategy: linkedinDiagnostics.strategy,
                start: linkedinDiagnostics.start,
                end: linkedinDiagnostics.end,
                campaignCount: linkedinDiagnostics.campaignCount
              }
            : null
        }
      : {
          google: googleData
            ? {
                snapshot: googleData.snapshot,
                visibility: googleData.visibility,
                keywordHealth: googleData.keywordHealth,
                interpretation: googleData.interpretation,
                tables: googleData.tables
            }
          : null,
          linkedin: linkedinDiagnostics,
          platformErrors
        },
    trends: {
      daily
    },
    insights: {
      suggested: buildSuggestedInsight({
        client: displayClient,
        range,
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        rows,
        daily
      }),
      nextAction: buildNextAction({
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend
      })
    }
  }
}

export default async function handler(req, res) {
  try {
    const payload = await buildDashboardPayload({
      clientId: req.query.client || 'rimiya',
      platformFilter: req.query.platform || 'all',
      range: req.query.range || '30d'
    })

    return res.status(200).json(payload)
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message,
      availableClients: error.availableClients
    })
  }
}
