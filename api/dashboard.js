import { clients, getClientById } from '../data/clients.js'
import { getMetaData } from '../lib/meta.js'
import { getGoogleAdsData } from '../lib/googleAds.js'
import { getSnapchatData } from '../lib/snapchat.js'
import { getTikTokData } from '../lib/tiktok.js'
import { getLinkedInReport } from '../lib/linkedin.js'

const REPORTING_START_DATE = '2026-01-01'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatSar(value) {
  return `SAR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function rangeLabel(range) {
  if (range === '7d') return 'the last 7 days'
  if (range === 'this_month') return 'this month'
  if (range === 'max') return 'since promotion start'
  return 'the last 30 days'
}

function periodPhrase(range) {
  return range === 'max' ? rangeLabel(range) : `in ${rangeLabel(range)}`
}

function getPromotionStartDate(client = null, platform = null) {
  return (
    (platform ? client?.platformStartDates?.[platform] : null) ||
    client?.reportingStartDate ||
    REPORTING_START_DATE
  )
}

function getRangeConfig(range, client = null, platform = null) {
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
    const startDate = getPromotionStartDate(client, platform)

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

function getClientGroup(client) {
  if (!Array.isArray(client?.childClientIds) || !client.childClientIds.length) {
    return [client]
  }

  return [
    client,
    ...client.childClientIds
      .map((childClientId) => getClientById(childClientId))
      .filter(Boolean)
  ]
}

function getDashboardClients() {
  const childClientIds = new Set()
  clients.forEach((client) => {
    const children = Array.isArray(client.childClientIds) ? client.childClientIds : []
    children.forEach((childClientId) => childClientIds.add(childClientId))
  })

  return clients.filter((client) => !childClientIds.has(client.id))
}

function firstMetaBusinessKey(client) {
  if (Array.isArray(client?.metaBusinessKeys)) return client.metaBusinessKeys[0] || null
  return client?.metaBusinessKey || null
}

function getAccountOptions(clientGroup) {
  return clientGroup.flatMap((groupClient) => {
    const options = []

    if (groupClient.platforms?.meta?.enabled && groupClient.metaAccountId) {
      options.push({
        id: `meta:${groupClient.id}:${groupClient.metaAccountId}`,
        platform: 'meta',
        platformLabel: 'Meta',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: String(groupClient.metaAccountId),
        accountName: groupClient.metaAccountName || groupClient.name,
        businessKey: firstMetaBusinessKey(groupClient)
      })
    }

    if (groupClient.platforms?.tiktok?.enabled && groupClient.tiktokAdvertiserId) {
      options.push({
        id: `tiktok:${groupClient.id}:${groupClient.tiktokAdvertiserId}`,
        platform: 'tiktok',
        platformLabel: 'TikTok',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: String(groupClient.tiktokAdvertiserId),
        accountName: groupClient.name
      })
    }

    if (groupClient.platforms?.linkedin?.enabled && groupClient.linkedinAccountId) {
      options.push({
        id: `linkedin:${groupClient.id}:${groupClient.linkedinAccountId}`,
        platform: 'linkedin',
        platformLabel: 'LinkedIn',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: String(groupClient.linkedinAccountId),
        accountName: groupClient.name
      })
    }

    if (groupClient.platforms?.google?.enabled && groupClient.googleCustomerId) {
      options.push({
        id: `google:${groupClient.id}:${groupClient.googleCustomerId}`,
        platform: 'google',
        platformLabel: 'Google Ads',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: String(groupClient.googleCustomerId),
        accountName: groupClient.name,
        loginCustomerId: groupClient.googleLoginCustomerId || null
      })
    }

    if (groupClient.platforms?.snapchat?.enabled && groupClient.snapchatAdAccountId) {
      options.push({
        id: `snapchat:${groupClient.id}:${groupClient.snapchatAdAccountId}`,
        platform: 'snapchat',
        platformLabel: 'Snapchat',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: String(groupClient.snapchatAdAccountId),
        accountName: groupClient.snapchatAdAccountName || groupClient.name
      })
    }

    return options
  })
}

function annotateChildRow(row, ownerClient, displayClient) {
  if (!row || ownerClient.id === displayClient.id) return row

  const campaignName = row.campaign && row.campaign !== ownerClient.name
    ? `${row.campaign} · ${ownerClient.name}`
    : ownerClient.name

  return {
    ...row,
    campaign: campaignName,
    ownerClientId: ownerClient.id,
    ownerClientName: ownerClient.name
  }
}

function hasReportingActivity(row) {
  if (!row) return false

  return (
    Number(row.spend || 0) > 0 ||
    Number(row.impressions || 0) > 0 ||
    Number(row.clicks || 0) > 0 ||
    Number(row.conversions || 0) > 0
  )
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
  lockedAccount = null,
  selectedAccountIds = []
} = {}) {
  const client = getClientById(clientId)

  if (!client) {
    const error = new Error('Client not found')
    error.statusCode = 404
    error.availableClients = getDashboardClients().map((c) => ({ id: c.id, name: c.name }))
    throw error
  }

  const effectivePlatformFilter = lockedAccount?.platform || platformFilter
  const clientGroup = lockedAccount ? [client] : getClientGroup(client)
  const isGroupedClient = clientGroup.length > 1
  const accountOptions = getAccountOptions(clientGroup)
  const selectedAccountIdSet = new Set(
    (Array.isArray(selectedAccountIds) ? selectedAccountIds : [])
      .map((id) => String(id))
      .filter(Boolean)
  )
  const selectedAccountOptions = accountOptions.filter((option) => selectedAccountIdSet.has(option.id))
  const hasSelectedAccounts = selectedAccountIdSet.size > 0
  const rows = []
  let linkedinDiagnostics = null
  const platformErrors = []

  async function addPlatformRow(platformName, loadRow, options = {}) {
    try {
      const row = await loadRow()
      if (row) {
        if (options.omitEmpty && !hasReportingActivity(row)) return
        rows.push(row)
      } else if (!options.optional) {
        platformErrors.push({
          platform: platformName,
          error: 'No reporting data returned for this platform in the selected date range. Check the account mapping, token access, or whether the platform had spend during this period.'
        })
      }
    } catch (error) {
      platformErrors.push({
        platform: platformName,
        error: error.message || 'Unable to load platform data'
      })
    }
  }

  async function addSelectedAccount(option) {
    const groupClient = getClientById(option.clientId) || client
    const rangeConfig = getRangeConfig(range, groupClient, option.platform)

    if (option.platform === 'meta') {
      await addPlatformRow('meta', async () => {
        const row = await getMetaData({
          clientId: groupClient.id,
          ...rangeConfig.meta,
          accountId: option.accountId,
          businessKey: option.businessKey,
          accountName: option.accountName
        })

        return annotateChildRow(row, groupClient, client)
      }, { optional: true, omitEmpty: true })
      return
    }

    if (option.platform === 'google') {
      await addPlatformRow('google', async () => {
        const row = await getGoogleAdsData({
          ...rangeConfig.google,
          customerId: option.accountId,
          loginCustomerId: option.loginCustomerId
        })

        return annotateChildRow(row, groupClient, client)
      }, { optional: true, omitEmpty: true })
      return
    }

    if (option.platform === 'snapchat') {
      await addPlatformRow('snapchat', async () => {
        const row = await getSnapchatData({
          clientId: groupClient.id,
          range,
          adAccountId: option.accountId,
          accountName: option.accountName
        })

        return annotateChildRow(row, groupClient, client)
      }, { optional: true, omitEmpty: true })
      return
    }

    if (option.platform === 'tiktok') {
      await addPlatformRow('tiktok', async () => {
        const row = await getTikTokData({
          clientId: groupClient.id,
          range,
          advertiserId: option.accountId,
          clientName: option.accountName
        })

        return annotateChildRow(row, groupClient, client)
      }, { optional: true, omitEmpty: true })
      return
    }

    if (option.platform === 'linkedin') {
      const linkedinReport = await getLinkedInReport({
        clientId: groupClient.id,
        range,
        accountId: option.accountId,
        clientOverride: {
          name: option.accountName || option.clientName || groupClient.name,
          linkedinAccountId: option.accountId
        }
      })

      if (linkedinReport.row && hasReportingActivity(linkedinReport.row)) {
        rows.push({
          ...annotateChildRow(linkedinReport.row, groupClient, client),
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
  }

  if (hasSelectedAccounts) {
    for (const option of selectedAccountOptions) {
      if (effectivePlatformFilter !== 'all' && option.platform !== effectivePlatformFilter) continue
      await addSelectedAccount(option)
    }
  } else if (lockedAccount?.platform === 'meta') {
    const rangeConfig = getRangeConfig(range, client, 'meta')
    await addPlatformRow('meta', () => getMetaData({
        clientId,
        ...rangeConfig.meta,
        accountId: lockedAccount.accountId,
        businessKey: lockedAccount.businessKey,
        accountName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'meta')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.meta?.enabled) continue
      if (isGroupedClient && !groupClient.metaAccountId) continue
      const rangeConfig = getRangeConfig(range, groupClient, 'meta')
      await addPlatformRow('meta', async () => {
        const row = await getMetaData({
          clientId: groupClient.id,
          ...rangeConfig.meta,
          accountId: groupClient.metaAccountId,
          businessKey: groupClient.metaBusinessKey,
          accountName: groupClient.metaAccountName
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'google') {
    const rangeConfig = getRangeConfig(range, client, 'google')
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
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'google')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.google?.enabled) continue
      if (isGroupedClient && !groupClient.googleCustomerId) continue
      const rangeConfig = getRangeConfig(range, groupClient, 'google')
      await addPlatformRow('google', async () => {
        const row = await getGoogleAdsData({
          ...rangeConfig.google,
          customerId: groupClient.googleCustomerId,
          loginCustomerId: groupClient.googleLoginCustomerId
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'snapchat') {
    await addPlatformRow('snapchat', () => getSnapchatData({
        clientId,
        range,
        adAccountId: lockedAccount.accountId,
        accountName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'snapchat')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.snapchat?.enabled) continue
      if (isGroupedClient && !groupClient.snapchatAdAccountId) continue
      await addPlatformRow('snapchat', async () => {
        const row = await getSnapchatData({
          clientId: groupClient.id,
          range
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'tiktok') {
    await addPlatformRow('tiktok', () => getTikTokData({
        clientId,
        range,
        advertiserId: lockedAccount.accountId,
        clientName: lockedAccount.accountName || lockedAccount.clientName
      }))
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'tiktok')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.tiktok?.enabled) continue
      if (isGroupedClient && !groupClient.tiktokAdvertiserId) continue
      await addPlatformRow('tiktok', async () => {
        const row = await getTikTokData({
          clientId: groupClient.id,
          range
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id
      })
    }
  }

  const linkedinEnabled =
    !hasSelectedAccounts && (
      (lockedAccount?.platform === 'linkedin') ||
      ((effectivePlatformFilter === 'all' || effectivePlatformFilter === 'linkedin') && client.platforms.linkedin?.enabled)
    )

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
  const activePlatformCount = new Set(rows.map((row) => row.platform)).size
  const platformSplit = rows.reduce((acc, row) => {
    const key = row.platform.toLowerCase().replace(/\s+/g, '_')
    const existing = acc[key] || {
      spend: 0,
      conversions: 0
    }

    existing.spend += Number(row.spend || 0)
    existing.conversions += Number(row.conversions || 0)
    acc[key] = existing
    return acc
  }, {})

  const googleData = rows.find((row) => row.platform === 'Google Ads') || null
  const metaData = rows.find((row) => row.platform === 'Meta') || null
  const tiktokData = rows.find((row) => row.platform === 'TikTok') || null
  const displayClient = {
    id: client.id,
    name: lockedAccount?.clientName || client.name
  }
  const availablePlatformSet = new Set()
  clientGroup.forEach((groupClient) => {
    Object.entries(groupClient.platforms || {}).forEach(([key, config]) => {
      if (config?.enabled) availablePlatformSet.add(key)
    })
  })

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
    availableClients: publicMode ? [] : getDashboardClients().map((c) => ({ id: c.id, name: c.name })),
    availablePlatforms: publicMode && lockedAccount
      ? [effectivePlatformFilter]
      : Array.from(availablePlatformSet),
    accountOptions: publicMode
      ? []
      : accountOptions.map((option) => ({
          id: option.id,
          platform: option.platform,
          platformLabel: option.platformLabel,
          clientId: option.clientId,
          clientName: option.clientName,
          accountId: option.accountId,
          accountName: option.accountName
        })),
    selectedAccountIds: Array.from(selectedAccountIdSet),
    summaryCards: [
      {
        label: 'Total Spend',
        value: formatSar(totalSpend)
      },
      { label: 'Impressions', value: totalImpressions.toLocaleString() },
      { label: 'Clicks', value: totalClicks.toLocaleString() },
      { label: 'CTR', value: `${blendedCtr.toFixed(2)}%` },
      { label: 'Conversions', value: totalConversions.toLocaleString() },
      { label: 'Platforms Active', value: activePlatformCount.toString() }
    ],
    campaignRows: rows.map((row) => ({
      platform: row.platform,
      campaign: row.campaign,
      spend: `SAR ${row.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      clicks: row.clicks.toLocaleString(),
      conversions: row.conversions == null ? 'N/A' : row.conversions.toLocaleString()
    })),
    platformSplit: Object.fromEntries(
      Object.entries(platformSplit).map(([key, value]) => [
        key,
        {
          spend: `SAR ${value.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          conversions: value.conversions.toLocaleString()
        }
      ])
    ),
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
          meta: metaData
            ? {
                account: {
                  id: metaData.metaAccountId || null,
                  name: metaData.metaAccountName || null,
                  businessKey: metaData.metaBusinessKeyUsed || null
                },
                currency: metaData.metaCurrency || null,
                dateRange: metaData.metaDateRange || null,
                spend: metaData.spend,
                rawMetrics: metaData.metaRawMetrics || null
              }
            : null,
          tiktok: tiktokData
            ? {
                account: {
                  advertiserId: tiktokData.tiktokAdvertiserId || null
                },
                dateRange: tiktokData.tiktokDateRange || null,
                spend: tiktokData.spend,
                rawMetrics: tiktokData.tiktokRawMetrics || null,
                chunkCount: Array.isArray(tiktokData.tiktokChunks) ? tiktokData.tiktokChunks.length : 0,
                chunks: tiktokData.tiktokChunks || []
              }
            : null,
          google: googleData
            ? {
                account: {
                  customerId: client.googleCustomerId || null,
                  loginCustomerId: client.googleLoginCustomerId || null
                },
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

function parseSelectedAccountIds(value) {
  if (!value) return []
  const raw = Array.isArray(value) ? value.join(',') : String(value)

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : []
  } catch {
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }
}

export default async function handler(req, res) {
  try {
    const payload = await buildDashboardPayload({
      clientId: req.query.client || 'rimiya',
      platformFilter: req.query.platform || 'all',
      range: req.query.range || '30d',
      selectedAccountIds: parseSelectedAccountIds(req.query.accounts)
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
