import { clients } from '../data/clients.js'

const PLATFORM_LABELS = {
  meta: 'Meta',
  google: 'Google Ads',
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  linkedin: 'LinkedIn'
}

function enabledPlatforms(client) {
  return Object.entries(client.platforms || {})
    .filter(([, config]) => config?.enabled)
    .map(([platform]) => platform)
}

function checkPlatform(client, platform) {
  const startDate = client.platformStartDates?.[platform] || client.reportingStartDate || '2026-01-01'

  if (platform === 'meta') {
    const hasExactAccount = Boolean(client.metaAccountId)
    const hasNameMatch = Boolean(client.metaMatch?.value)
    const businessKeys = Array.isArray(client.metaBusinessKeys)
      ? client.metaBusinessKeys
      : client.metaBusinessKey
        ? [client.metaBusinessKey]
        : []

    return {
      platform: PLATFORM_LABELS[platform],
      key: platform,
      startDate,
      confidence: hasExactAccount ? 'high' : hasNameMatch ? 'medium' : 'needs setup',
      accountId: client.metaAccountId || null,
      accountName: client.metaAccountName || null,
      businessKeys,
      matching: hasExactAccount ? 'exact account id' : hasNameMatch ? `name includes "${client.metaMatch.value}"` : null,
      note: hasExactAccount
        ? 'Locked to an exact Meta ad account.'
        : hasNameMatch
          ? 'Uses account-name matching. For best accuracy, confirm the account once and add metaAccountId.'
          : 'Meta is enabled but no matching rule or account ID is configured.'
    }
  }

  if (platform === 'google') {
    return {
      platform: PLATFORM_LABELS[platform],
      key: platform,
      startDate,
      confidence: client.googleCustomerId ? 'high' : 'needs setup',
      accountId: client.googleCustomerId || null,
      loginCustomerId: client.googleLoginCustomerId || null,
      note: client.googleCustomerId
        ? 'Locked to an exact Google Ads customer ID.'
        : 'Google Ads is enabled but no customer ID is configured.'
    }
  }

  if (platform === 'tiktok') {
    return {
      platform: PLATFORM_LABELS[platform],
      key: platform,
      startDate,
      confidence: client.tiktokAdvertiserId ? 'high' : 'needs setup',
      accountId: client.tiktokAdvertiserId || null,
      note: client.tiktokAdvertiserId
        ? 'Locked to an exact TikTok advertiser ID.'
        : 'TikTok is enabled but no advertiser ID is configured.'
    }
  }

  if (platform === 'linkedin') {
    return {
      platform: PLATFORM_LABELS[platform],
      key: platform,
      startDate,
      confidence: client.linkedinAccountId ? 'high' : 'needs setup',
      accountId: client.linkedinAccountId || null,
      note: client.linkedinAccountId
        ? 'Locked to an exact LinkedIn sponsored account ID.'
        : 'LinkedIn is enabled but no sponsored account ID is configured.'
    }
  }

  if (platform === 'snapchat') {
    return {
      platform: PLATFORM_LABELS[platform],
      key: platform,
      startDate,
      confidence: client.snapchatAdAccountId ? 'high' : client.snapMatch?.value ? 'medium' : 'needs setup',
      accountId: client.snapchatAdAccountId || null,
      matching: client.snapMatch?.value ? `name includes "${client.snapMatch.value}"` : null,
      note: client.snapchatAdAccountId
        ? 'Locked to an exact Snapchat ad account ID.'
        : client.snapMatch?.value
          ? 'Uses account-name matching. For best accuracy, confirm the account once and add snapchatAdAccountId.'
          : 'Snapchat is enabled but no matching rule or account ID is configured.'
    }
  }

  return {
    platform,
    key: platform,
    startDate,
    confidence: 'unknown',
    note: 'Unknown platform.'
  }
}

export default function handler(req, res) {
  const clientId = req.query.client ? String(req.query.client) : null
  const selectedClients = clientId
    ? clients.filter((client) => client.id === clientId)
    : clients

  if (clientId && !selectedClients.length) {
    return res.status(404).json({
      ok: false,
      error: 'Client not found.'
    })
  }

  const audit = selectedClients.map((client) => {
    const platforms = enabledPlatforms(client)
    const checks = platforms.map((platform) => checkPlatform(client, platform))

    return {
      id: client.id,
      name: client.name,
      reportingStartDate: client.reportingStartDate || '2026-01-01',
      enabledPlatforms: platforms,
      checks,
      needsReview: checks.filter((check) => check.confidence !== 'high')
    }
  })

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    totalClients: audit.length,
    clients: audit,
    summary: {
      highConfidenceMappings: audit.flatMap((client) => client.checks).filter((check) => check.confidence === 'high').length,
      needsReview: audit.flatMap((client) => client.needsReview).length
    }
  })
}
