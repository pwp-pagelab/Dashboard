import { clients, getClientById } from '../data/clients.js'
import { getMetaData } from '../lib/meta.js'
import { getGoogleAdsData } from '../lib/googleAds.js'
import { getSnapchatData } from '../lib/snapchat.js'
import { getTikTokData } from '../lib/tiktok.js'
import { getLinkedInReport } from '../lib/linkedin.js'
import { getLeadBreakdown } from '../lib/leads.js'
import { parseCustomStartDate } from '../lib/reportRange.js'
import { getSheetConversions, mergeConversions, summarizeConversions } from '../lib/sheetConversions.js'

const REPORTING_START_DATE = '2026-01-01'
const SAR_EXCHANGE_RATES = {
  SAR: 1,
  USD: Number(process.env.FX_USD_SAR || 3.75),
  AED: Number(process.env.FX_AED_SAR || 1.021),
  QAR: Number(process.env.FX_QAR_SAR || 1.03),
  KWD: Number(process.env.FX_KWD_SAR || 12.2),
  BHD: Number(process.env.FX_BHD_SAR || 9.95),
  OMR: Number(process.env.FX_OMR_SAR || 9.74),
  EUR: Number(process.env.FX_EUR_SAR || 4.1),
  GBP: Number(process.env.FX_GBP_SAR || 4.8)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function formatSar(value) {
  return `SAR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function normalizeCurrencyCode(code) {
  return String(code || 'SAR').trim().toUpperCase()
}

function formatCurrencyAmount(value, currencyCode) {
  return `${normalizeCurrencyCode(currencyCode)} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function getSarRate(currencyCode) {
  return SAR_EXCHANGE_RATES[normalizeCurrencyCode(currencyCode)] || null
}

function convertSpendToSar(spend, currencyCode) {
  const originalCurrencyCode = normalizeCurrencyCode(currencyCode)
  const originalSpend = Number(spend || 0)
  const rate = getSarRate(originalCurrencyCode)

  if (!rate) {
    return {
      spendSar: originalSpend,
      originalSpend,
      originalCurrencyCode,
      spendConversionRate: null,
      spendWasConverted: originalCurrencyCode !== 'SAR',
      spendConversionUnsupported: originalCurrencyCode !== 'SAR'
    }
  }

  return {
    spendSar: originalSpend * rate,
    originalSpend,
    originalCurrencyCode,
    spendConversionRate: rate,
    spendWasConverted: originalCurrencyCode !== 'SAR',
    spendConversionUnsupported: false
  }
}

function convertRowSpendToSar(row) {
  const conversion = convertSpendToSar(row?.spend || 0, row?.currencyCode || 'SAR')

  return {
    ...row,
    ...conversion,
    spend: conversion.spendSar,
    currencyCode: 'SAR'
  }
}

function buildSpendNote(item) {
  if (!item?.spendWasConverted) return null
  if (Number(item.originalSpend || 0) === 0) return null

  if (!item.spendConversionRate) {
    return `${item.originalCurrencyCode} spend is shown in SAR, but no conversion rate is configured yet.`
  }

  return `${formatCurrencyAmount(item.originalSpend, item.originalCurrencyCode)} converted to SAR at ${item.spendConversionRate}.`
}

function buildExportRow(row) {
  const rawMetrics =
    row.metaRawMetrics ||
    row.tiktokRawMetrics ||
    row.snapshot ||
    null
  const leadBreakdown = getLeadBreakdown(row)

  return {
    platform: row.platform,
    accountName: row.campaign,
    spendSar: Number(row.spend || 0),
    originalSpend: row.originalSpend,
    originalCurrencyCode: row.originalCurrencyCode || 'SAR',
    spendConversionRate: row.spendConversionRate || null,
    spendNote: buildSpendNote(row),
    reach: row.reach == null ? null : Number(row.reach || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    engagements: Number(row.engagements || row.engagementBreakdown?.totalEngagements || 0),
    videoViews: Number(row.videoViews || row.engagementBreakdown?.videoViews || 0),
    ctr: Number(row.ctr || 0),
    cpcSar: Number(row.cpc || 0) * (row.spendConversionRate || 1),
    results: leadBreakdown.totalLeads,
    platformResults: Number(row.conversions || 0),
    leads: leadBreakdown.totalLeads,
    formSubmissions: leadBreakdown.formSubmissions,
    directMessages: leadBreakdown.directMessages,
    leadBreakdown,
    ...(row.convertedCount != null
      ? {
          convertedCount: Number(row.convertedCount || 0),
          conversionRate: row.conversionRate,
          costPerConvertedLeadSar: row.costPerConvertedLead
        }
      : {}),
    resultType: row.conversionLabel || null,
    resultBreakdown: row.conversionBreakdown || null,
    engagementBreakdown: row.engagementBreakdown || null,
    rawMetrics,
    daily: row.daily || [],
    meta: row.platform === 'Meta'
      ? {
          accountId: row.metaAccountId || null,
          accountName: row.metaAccountName || null,
          businessKey: row.metaBusinessKeyUsed || null,
          dateRange: row.metaDateRange || null
        }
      : null,
    tiktok: row.platform === 'TikTok'
      ? {
          advertiserId: row.tiktokAdvertiserId || null,
          dateRange: row.tiktokDateRange || null,
          chunks: row.tiktokChunks || []
        }
      : null,
    google: row.platform === 'Google Ads'
      ? {
          visibility: row.visibility || null,
          keywordHealth: row.keywordHealth || null,
          tables: row.tables || null,
          interpretation: row.interpretation || null
        }
      : null
  }
}

function rangeLabel(range) {
  const customStartDate = parseCustomStartDate(range)
  if (customStartDate) return `since ${customStartDate}`
  if (range === '7d') return 'the last 7 days'
  if (range === 'this_month') return 'this month'
  if (range === 'max') return 'since promotion start'
  return 'the last 30 days'
}

function periodPhrase(range) {
  return range === 'max' || parseCustomStartDate(range)
    ? rangeLabel(range)
    : `in ${rangeLabel(range)}`
}

function getPromotionStartDate(client = null, platform = null) {
  return (
    (platform ? client?.platformStartDates?.[platform] : null) ||
    client?.reportingStartDate ||
    REPORTING_START_DATE
  )
}

function getRangeConfig(range, client = null, platform = null) {
  const customStartDate = parseCustomStartDate(range)
  if (customStartDate) {
    return {
      meta: {
        datePreset: null,
        timeRange: {
          since: customStartDate,
          until: todayISO()
        }
      },
      google: {
        dateRange: null,
        startDate: customStartDate,
        endDate: todayISO()
      }
    }
  }

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

function getRangeDates(range, client = null, platform = null) {
  const now = new Date()
  const today = dateOnly(now)
  const customStartDate = parseCustomStartDate(range, now)

  if (customStartDate) {
    return {
      startDate: customStartDate,
      endDate: today
    }
  }

  if (range === '7d') {
    return {
      startDate: dateOnly(addDays(now, -6)),
      endDate: today
    }
  }

  if (range === 'this_month') {
    return {
      startDate: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`,
      endDate: today
    }
  }

  if (range === 'max') {
    return {
      startDate: getPromotionStartDate(client, platform),
      endDate: today
    }
  }

  return {
    startDate: dateOnly(addDays(now, -29)),
    endDate: today
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

    if (groupClient.platforms?.meta?.enabled) {
      const metaAccountId = groupClient.metaAccountId ? String(groupClient.metaAccountId) : ''

      options.push({
        id: `meta:${groupClient.id}:${metaAccountId || 'auto'}`,
        platform: 'meta',
        platformLabel: 'Meta',
        clientId: groupClient.id,
        clientName: groupClient.name,
        accountId: metaAccountId,
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
    Number(row.conversions || 0) > 0 ||
    getLeadBreakdown(row).totalLeads > 0
  )
}

function serializeAccountOption(option) {
  if (!option) return null

  return {
    id: option.id,
    platform: option.platform,
    platformLabel: option.platformLabel,
    clientId: option.clientId,
    clientName: option.clientName,
    accountId: option.accountId,
    accountName: option.accountName
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
        conversions: 0,
        formSubmissions: 0,
        directMessages: 0
      }

      existing.spend += Number(day.spend || 0) * (row.spendConversionRate || getSarRate(row.originalCurrencyCode || row.currencyCode) || 1)
      existing.formSubmissions += Number(day.formSubmissions || 0)
      existing.directMessages += Number(day.directMessages || 0)
      existing.conversions += Number(day.totalLeads ?? day.conversions ?? 0)
      if (day.convertedCount != null) {
        existing.convertedCount = Number(existing.convertedCount || 0) + Number(day.convertedCount || 0)
      }
      dailyByDate.set(day.date, existing)
    })
  })

  return Array.from(dailyByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      ...day,
      cpa: day.conversions > 0 ? day.spend / day.conversions : null,
      ...(day.convertedCount != null
        ? {
            conversionRate: day.conversions > 0
              ? (day.convertedCount / day.conversions) * 100
              : null
          }
        : {})
    }))
}

function buildSuggestedInsight({ client, range, totalSpend, totalImpressions, totalClicks, totalConversions: totalLeads, rows, daily, spendTextOverride = null }) {
  const clientName = client?.name || 'this client'
  const spendText = spendTextOverride || formatSar(totalSpend)
  const impressionText = totalImpressions.toLocaleString()
  const clickText = totalClicks.toLocaleString()
  const leadText = totalLeads.toLocaleString()
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const clickToLead = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0
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

  if (totalLeads === 0) {
    return `${clientName} spent ${spendText} ${periodPhrase(range)} and generated ${impressionText} impressions with ${clickText} clicks at a ${ctr.toFixed(2)}% click-through rate. No completed form submissions or new direct-message conversations were reported, so the next step is to verify lead tracking and improve the enquiry path. ${spendDirection}.`
  }

  return `${clientName} spent ${spendText} ${periodPhrase(range)} and generated ${impressionText} impressions, ${clickText} clicks, and ${leadText} leads from completed forms or new direct-message conversations. The click-to-lead rate is ${clickToLead.toFixed(2)}%; the next step is to identify the strongest lead source and scale from that base.`
}

function buildNextAction({ totalImpressions, totalClicks, totalConversions: totalLeads, totalSpend }) {
  if (totalImpressions === 0 && totalSpend === 0) {
    return 'Ready to build momentum. Next step: connect active campaign data.'
  }

  if (totalClicks === 0 && totalImpressions > 0) {
    return 'Building visibility. Next step: improve click-through with stronger creative hooks.'
  }

  if (totalLeads === 0 && totalClicks > 0) {
    return 'Traffic is arriving, but no form or message leads are recorded. Verify lead tracking and the enquiry path.'
  }

  if (totalLeads > 0) {
    return 'Leads are coming in. Next step: scale the strongest form or messaging source.'
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
  const statusOptions = (hasSelectedAccounts ? selectedAccountOptions : accountOptions)
    .filter((option) => effectivePlatformFilter === 'all' || option.platform === effectivePlatformFilter)
  const accountStatusMap = new Map(
    statusOptions.map((option) => [
      option.id,
      {
        ...serializeAccountOption(option),
        status: 'pending',
        message: 'Waiting to load.',
        spend: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
        engagements: 0,
        videoViews: 0,
        conversions: 0,
        leadBreakdown: null,
        currencyCode: null,
        conversionLabel: null,
        conversionBreakdown: null
      }
    ])
  )

  function markAccountStatus(option, status, message, row = null) {
    if (!option?.id || !accountStatusMap.has(option.id)) return

    const leadBreakdown = getLeadBreakdown(row)
    accountStatusMap.set(option.id, {
      ...accountStatusMap.get(option.id),
      status,
      message,
      spend: Number(row?.spend || 0),
      reach: Number(row?.reach || 0),
      impressions: Number(row?.impressions || 0),
      clicks: Number(row?.clicks || 0),
      engagements: Number(row?.engagements || row?.engagementBreakdown?.totalEngagements || 0),
      videoViews: Number(row?.videoViews || row?.engagementBreakdown?.videoViews || 0),
      conversions: leadBreakdown.totalLeads,
      platformResults: Number(row?.conversions || 0),
      leadBreakdown,
      currencyCode: row?.currencyCode || null,
      conversionLabel: row?.conversionLabel || null,
      conversionBreakdown: row?.conversionBreakdown || null
    })
  }

  function findAccountOption({ platform, groupClient, accountId, accountName = null }) {
    const normalizedAccountId = accountId == null ? '' : String(accountId)
    const found = accountOptions.find((option) =>
      option.platform === platform &&
      option.clientId === groupClient.id &&
      String(option.accountId) === normalizedAccountId
    )

    return found || {
      id: `${platform}:${groupClient.id}:${normalizedAccountId || 'default'}`,
      platform,
      platformLabel:
        platform === 'google'
          ? 'Google Ads'
          : platform === 'meta'
            ? 'Meta'
            : platform === 'tiktok'
              ? 'TikTok'
              : platform === 'snapchat'
                ? 'Snapchat'
                : 'LinkedIn',
      clientId: groupClient.id,
      clientName: groupClient.name,
      accountId: normalizedAccountId,
      accountName: accountName || groupClient.name
    }
  }

  async function addPlatformRow(platformName, loadRow, options = {}) {
    try {
      const row = await loadRow()
      if (row) {
        if (options.omitEmpty && !hasReportingActivity(row)) {
          markAccountStatus(options.accountOption, 'no_data', 'Connected, but no spend or activity returned for this date range.', row)
          return
        }
        markAccountStatus(options.accountOption, 'loaded', 'Loaded successfully.', row)
        rows.push(row)
      } else if (!options.optional) {
        markAccountStatus(options.accountOption, 'no_data', 'No data returned for this date range.')
        platformErrors.push({
          platform: platformName,
          error: 'No reporting data returned for this platform in the selected date range. Check the account mapping, token access, or whether the platform had spend during this period.'
        })
      } else {
        markAccountStatus(options.accountOption, 'no_data', 'Connected, but no data returned for this date range.')
      }
    } catch (error) {
      markAccountStatus(options.accountOption, 'error', error.message || 'Unable to load platform data')
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
      }, { optional: true, omitEmpty: true, accountOption: option })
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
      }, { optional: true, omitEmpty: true, accountOption: option })
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
      }, { optional: true, omitEmpty: true, accountOption: option })
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
      }, { optional: true, omitEmpty: true, accountOption: option })
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
        markAccountStatus(option, 'loaded', 'Loaded successfully.', linkedinReport.row)
        rows.push({
          ...annotateChildRow(linkedinReport.row, groupClient, client),
          daily: linkedinReport.daily || []
        })
      } else if (linkedinReport.error) {
        markAccountStatus(option, 'error', linkedinReport.error)
        platformErrors.push({
          platform: 'linkedin',
          error: linkedinReport.error
        })
      } else {
        markAccountStatus(option, 'no_data', 'Connected, but no activity returned for this date range.', linkedinReport.row)
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
      }), {
        accountOption: findAccountOption({
          platform: 'meta',
          groupClient: client,
          accountId: lockedAccount.accountId,
          accountName: lockedAccount.accountName || lockedAccount.clientName
        })
      })
  } else if (!lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'meta')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.meta?.enabled) continue
      if (isGroupedClient && !groupClient.metaAccountId) continue
      const rangeConfig = getRangeConfig(range, groupClient, 'meta')
      const accountOption = findAccountOption({
        platform: 'meta',
        groupClient,
        accountId: groupClient.metaAccountId,
        accountName: groupClient.metaAccountName
      })
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
        omitEmpty: isGroupedClient && groupClient.id !== client.id,
        accountOption
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'google') {
    const rangeConfig = getRangeConfig(range, client, 'google')
    const accountOption = findAccountOption({
      platform: 'google',
      groupClient: client,
      accountId: lockedAccount.accountId,
      accountName: lockedAccount.accountName || lockedAccount.clientName
    })
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
    }, { accountOption })
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'google')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.google?.enabled) continue
      if (!groupClient.googleCustomerId) {
        platformErrors.push({
          platform: 'google',
          error: `${groupClient.name} has Google Ads enabled, but no Google customer ID is configured yet.`
        })
        continue
      }
      const rangeConfig = getRangeConfig(range, groupClient, 'google')
      const accountOption = findAccountOption({
        platform: 'google',
        groupClient,
        accountId: groupClient.googleCustomerId
      })
      await addPlatformRow('google', async () => {
        const row = await getGoogleAdsData({
          ...rangeConfig.google,
          customerId: groupClient.googleCustomerId,
          loginCustomerId: groupClient.googleLoginCustomerId
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id,
        accountOption
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'snapchat') {
    const accountOption = findAccountOption({
      platform: 'snapchat',
      groupClient: client,
      accountId: lockedAccount.accountId,
      accountName: lockedAccount.accountName || lockedAccount.clientName
    })
    await addPlatformRow('snapchat', () => getSnapchatData({
        clientId,
        range,
        adAccountId: lockedAccount.accountId,
        accountName: lockedAccount.accountName || lockedAccount.clientName
      }), { accountOption })
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'snapchat')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.snapchat?.enabled) continue
      if (isGroupedClient && !groupClient.snapchatAdAccountId) continue
      const accountOption = findAccountOption({
        platform: 'snapchat',
        groupClient,
        accountId: groupClient.snapchatAdAccountId,
        accountName: groupClient.snapchatAdAccountName
      })
      await addPlatformRow('snapchat', async () => {
        const row = await getSnapchatData({
          clientId: groupClient.id,
          range
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id,
        accountOption
      })
    }
  }

  if (!hasSelectedAccounts && lockedAccount?.platform === 'tiktok') {
    const accountOption = findAccountOption({
      platform: 'tiktok',
      groupClient: client,
      accountId: lockedAccount.accountId,
      accountName: lockedAccount.accountName || lockedAccount.clientName
    })
    await addPlatformRow('tiktok', () => getTikTokData({
        clientId,
        range,
        advertiserId: lockedAccount.accountId,
        clientName: lockedAccount.accountName || lockedAccount.clientName
      }), { accountOption })
  } else if (!hasSelectedAccounts && !lockedAccount && (effectivePlatformFilter === 'all' || effectivePlatformFilter === 'tiktok')) {
    for (const groupClient of clientGroup) {
      if (!groupClient.platforms.tiktok?.enabled) continue
      if (isGroupedClient && !groupClient.tiktokAdvertiserId) continue
      const accountOption = findAccountOption({
        platform: 'tiktok',
        groupClient,
        accountId: groupClient.tiktokAdvertiserId
      })
      await addPlatformRow('tiktok', async () => {
        const row = await getTikTokData({
          clientId: groupClient.id,
          range
        })

        return annotateChildRow(row, groupClient, client)
      }, {
        optional: isGroupedClient && groupClient.id !== client.id,
        omitEmpty: isGroupedClient && groupClient.id !== client.id,
        accountOption
      })
    }
  }

  const linkedinEnabled =
    !hasSelectedAccounts && (
      (lockedAccount?.platform === 'linkedin') ||
      ((effectivePlatformFilter === 'all' || effectivePlatformFilter === 'linkedin') && client.platforms.linkedin?.enabled)
    )

  if (linkedinEnabled) {
    const linkedinAccountId = lockedAccount?.platform === 'linkedin' ? lockedAccount.accountId : client.linkedinAccountId
    const accountOption = findAccountOption({
      platform: 'linkedin',
      groupClient: client,
      accountId: linkedinAccountId,
      accountName: lockedAccount?.accountName || lockedAccount?.clientName || client.name
    })
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
      markAccountStatus(
        accountOption,
        hasReportingActivity(linkedinReport.row) ? 'loaded' : 'no_data',
        hasReportingActivity(linkedinReport.row) ? 'Loaded successfully.' : 'Connected, but no activity returned for this date range.',
        linkedinReport.row
      )
      if (hasReportingActivity(linkedinReport.row)) {
        rows.push({
          ...linkedinReport.row,
          daily: linkedinReport.daily || []
        })
      }
    } else if (linkedinReport.error) {
      markAccountStatus(accountOption, 'error', linkedinReport.error)
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

  const sheetConversions = await getSheetConversions(client)
  const reportingRows = mergeConversions(rows.map(convertRowSpendToSar), sheetConversions)
  const conversionMetrics = summarizeConversions(reportingRows, sheetConversions)
  const totalSpend = reportingRows.reduce((sum, row) => sum + (row.spend || 0), 0)
  const totalReach = reportingRows.reduce((sum, row) => sum + (row.reach || 0), 0)
  const totalImpressions = reportingRows.reduce((sum, row) => sum + (row.impressions || 0), 0)
  const totalClicks = reportingRows.reduce((sum, row) => sum + (row.clicks || 0), 0)
  const totalPlatformResults = reportingRows.reduce((sum, row) => sum + (row.conversions || 0), 0)
  const totalFormSubmissions = reportingRows.reduce(
    (sum, row) => sum + getLeadBreakdown(row).formSubmissions,
    0
  )
  const totalDirectMessages = reportingRows.reduce(
    (sum, row) => sum + getLeadBreakdown(row).directMessages,
    0
  )
  const totalLeads = totalFormSubmissions + totalDirectMessages
  const blendedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const daily = combineDailyTrends(reportingRows)
  const activePlatformCount = new Set(reportingRows.map((row) => row.platform)).size
  const currencyCodes = Array.from(new Set(reportingRows.map((row) => row.originalCurrencyCode || 'SAR').filter(Boolean)))
  const convertedCurrencyCodes = currencyCodes.filter((code) => code !== 'SAR')
  const currencyConversionNotes = reportingRows
    .filter((row) => row.spendWasConverted)
    .map(buildSpendNote)
    .filter(Boolean)
  const totalSpendText = formatSar(totalSpend)
  const accountStatuses = Array.from(accountStatusMap.values()).map((status) => (
    status.status === 'pending'
      ? { ...status, status: 'not_requested', message: 'Not requested by the current platform filter.' }
      : status
  )).map((status) => {
    const conversion = convertSpendToSar(status.spend, status.currencyCode || 'SAR')

    return {
      ...status,
      ...conversion,
      spend: conversion.spendSar,
      currencyCode: 'SAR',
      spendNote: buildSpendNote(conversion)
    }
  })
  const loadedAccountCount = accountStatuses.filter((status) => status.status === 'loaded').length
  const noDataAccountCount = accountStatuses.filter((status) => status.status === 'no_data').length
  const failedAccountCount = accountStatuses.filter((status) => status.status === 'error').length
  const resultLabels = Array.from(new Set(reportingRows.map((row) => row.conversionLabel).filter(Boolean)))
  const platformSplit = reportingRows.reduce((acc, row) => {
    const key = row.platform.toLowerCase().replace(/\s+/g, '_')
    const existing = acc[key] || {
      spend: 0,
      conversions: 0,
      formSubmissions: 0,
      directMessages: 0
    }

    existing.spend += Number(row.spend || 0)
    existing.conversions += getLeadBreakdown(row).totalLeads
    existing.formSubmissions += getLeadBreakdown(row).formSubmissions
    existing.directMessages += getLeadBreakdown(row).directMessages
    if (row.convertedCount != null) {
      existing.convertedCount = Number(existing.convertedCount || 0) + Number(row.convertedCount || 0)
    }
    acc[key] = existing
    return acc
  }, {})

  const googleData = reportingRows.find((row) => row.platform === 'Google Ads') || null
  const metaData = reportingRows.find((row) => row.platform === 'Meta') || null
  const tiktokData = reportingRows.find((row) => row.platform === 'TikTok') || null
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
          ...serializeAccountOption(option)
        })),
    selectedAccountIds: Array.from(selectedAccountIdSet),
    accountStatuses,
    dataQuality: {
      selectedAccounts: accountStatuses.length,
      loadedAccounts: loadedAccountCount,
      noDataAccounts: noDataAccountCount,
      failedAccounts: failedAccountCount,
      currencyCodes,
      currencyWarning: convertedCurrencyCodes.length
        ? `Some ad accounts spent in ${convertedCurrencyCodes.join(', ')}. Spend totals are converted and shown in SAR.`
        : null,
      exchangeRates: Object.fromEntries(convertedCurrencyCodes.map((code) => [code, getSarRate(code)])),
      currencyConversionNotes: Array.from(new Set(currencyConversionNotes)),
      conversionLabels: resultLabels,
      conversionWarning: 'Leads include only completed form submissions and new direct-message conversations reported by the selected platforms. Clicks and other conversion actions are excluded.',
      leadDefinition: 'completed_form_or_new_direct_message',
      totalPlatformResults,
      ...(conversionMetrics ? { sheetConversionsAvailable: true } : {})
    },
    summaryCards: [
      {
        label: 'Total Spend',
        value: totalSpendText
      },
      { label: 'Reach', value: totalReach > 0 ? totalReach.toLocaleString() : 'N/A' },
      { label: 'Impressions', value: totalImpressions.toLocaleString() },
      { label: 'Clicks', value: totalClicks.toLocaleString() },
      { label: 'CTR', value: `${blendedCtr.toFixed(2)}%` },
      { label: 'Leads', value: totalLeads.toLocaleString() },
      { label: 'Form Submissions', value: totalFormSubmissions.toLocaleString() },
      { label: 'Direct Messages', value: totalDirectMessages.toLocaleString() },
      {
        label: 'Cost per Lead',
        value: totalLeads > 0 ? formatSar(totalSpend / totalLeads) : 'N/A'
      },
      {
        label: 'Lead Rate',
        value: `${(totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0).toFixed(2)}%`
      },
      ...(conversionMetrics
        ? [
            { label: 'Converted Leads', value: conversionMetrics.convertedCount.toLocaleString() },
            {
              label: 'Lead Conversion Rate',
              value: conversionMetrics.conversionRate == null ? 'N/A' : `${conversionMetrics.conversionRate.toFixed(2)}%`
            },
            {
              label: 'Cost per Converted Lead',
              value: conversionMetrics.costPerConvertedLead == null
                ? 'N/A'
                : formatSar(conversionMetrics.costPerConvertedLead)
            }
          ]
        : []),
      { label: 'Platforms Active', value: activePlatformCount.toString() }
    ],
    campaignRows: reportingRows.map((row) => {
      const leadBreakdown = getLeadBreakdown(row)
      return {
        platform: row.platform,
        campaign: row.campaign,
        spend: formatSar(row.spend),
        originalSpend: row.spendWasConverted ? formatCurrencyAmount(row.originalSpend, row.originalCurrencyCode) : null,
        originalCurrencyCode: row.originalCurrencyCode || 'SAR',
        spendConversionRate: row.spendConversionRate || null,
        spendNote: buildSpendNote(row),
        reach: row.reach == null ? 'N/A' : Number(row.reach || 0).toLocaleString(),
        engagements: Number(row.engagements || row.engagementBreakdown?.totalEngagements || 0).toLocaleString(),
        videoViews: Number(row.videoViews || row.engagementBreakdown?.videoViews || 0).toLocaleString(),
        clicks: row.clicks.toLocaleString(),
        conversions: leadBreakdown.totalLeads.toLocaleString(),
        leads: leadBreakdown.totalLeads.toLocaleString(),
        formSubmissions: leadBreakdown.formSubmissions.toLocaleString(),
        directMessages: leadBreakdown.directMessages.toLocaleString(),
        platformResults: Number(row.conversions || 0).toLocaleString(),
        conversionLabel: 'Leads (forms + messages)',
        conversionBreakdown: {
          leads: leadBreakdown.formSubmissions,
          messagingConversations: leadBreakdown.directMessages
        },
        leadBreakdown,
        ...(row.convertedCount != null
          ? {
              convertedCount: Number(row.convertedCount || 0),
              conversionRate: row.conversionRate,
              costPerConvertedLead: row.costPerConvertedLead
            }
          : {})
      }
    }),
    exportRows: publicMode ? [] : reportingRows.map(buildExportRow),
    platformSplit: Object.fromEntries(
      Object.entries(platformSplit).map(([key, value]) => [
        key,
        {
          spend: formatSar(value.spend),
          conversions: value.conversions.toLocaleString(),
          leads: value.conversions.toLocaleString(),
          formSubmissions: value.formSubmissions.toLocaleString(),
          directMessages: value.directMessages.toLocaleString(),
          ...(value.convertedCount != null
            ? {
                convertedCount: value.convertedCount.toLocaleString(),
                conversionRate: value.conversions > 0
                  ? (value.convertedCount / value.conversions) * 100
                  : null,
                costPerConvertedLead: value.convertedCount > 0
                  ? value.spend / value.convertedCount
                  : null
              }
            : {})
        }
      ])
    ),
    ...(conversionMetrics ? { conversionMetrics } : {}),
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
        totalConversions: totalLeads,
        rows: reportingRows,
        daily,
        spendTextOverride: totalSpendText
      }),
      nextAction: buildNextAction({
        totalImpressions,
        totalClicks,
        totalConversions: totalLeads,
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
