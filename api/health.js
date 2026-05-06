import { clients } from '../data/clients.js'

const PLATFORM_FIELDS = {
  meta: {
    idField: 'metaAccountId',
    matchField: 'metaMatch'
  },
  tiktok: {
    idField: 'tiktokAdvertiserId'
  },
  snapchat: {
    idField: 'snapchatAdAccountId',
    matchField: 'snapMatch'
  },
  linkedin: {
    idField: 'linkedinAccountId'
  },
  google: {
    idField: 'googleCustomerId'
  }
}

function platformStatus(client, platform) {
  const config = client.platforms?.[platform] || { enabled: false }
  const fields = PLATFORM_FIELDS[platform]
  const accountId = fields?.idField ? client[fields.idField] || null : null
  const match = fields?.matchField ? client[fields.matchField] || null : null

  if (!config.enabled) {
    return {
      enabled: false,
      status: 'disabled',
      accountId,
      match: match?.value || null
    }
  }

  if (accountId) {
    return {
      enabled: true,
      status: 'connected_exact_id',
      accountId,
      match: match?.value || null
    }
  }

  if (match?.value) {
    return {
      enabled: true,
      status: 'needs_exact_id_uses_name_match',
      accountId: null,
      match: match.value
    }
  }

  return {
    enabled: true,
    status: 'enabled_missing_account_id',
    accountId: null,
    match: null
  }
}

function buildAccountAudit() {
  const platforms = Object.keys(PLATFORM_FIELDS)
  const rows = clients.map((client) => {
    const checks = Object.fromEntries(
      platforms.map((platform) => [platform, platformStatus(client, platform)])
    )

    return {
      id: client.id,
      name: client.name,
      reportingStartDate: client.reportingStartDate || '2026-01-01',
      checks,
      needsConfirmation: platforms.filter((platform) => checks[platform].status !== 'connected_exact_id')
    }
  })

  return {
    ok: true,
    type: 'account-mapping-audit',
    generatedAt: new Date().toISOString(),
    summary: {
      clients: rows.length,
      connectedExactIds: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'connected_exact_id').length
        ])
      ),
      nameMatched: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'needs_exact_id_uses_name_match').length
        ])
      ),
      enabledMissingIds: Object.fromEntries(
        platforms.map((platform) => [
          platform,
          rows.filter((row) => row.checks[platform].status === 'enabled_missing_account_id').length
        ])
      )
    },
    clients: rows
  }
}

export default function handler(req, res) {
  if (req.query.audit === 'accounts') {
    return res.status(200).json(buildAccountAudit())
  }

  res.status(200).json({
    ok: true,
    message: 'Backend is working',
    timestamp: new Date().toISOString()
  })
}
