import { buildDashboardPayload } from './dashboard.js'
import { getPublicReportByToken, verifySignedReportToken } from '../data/publicReports.js'

const ALLOWED_RANGES = new Set(['7d', '30d', 'this_month', 'max'])

export default async function handler(req, res) {
  const token = req.query.token || req.query.shareToken
  const reportLink = verifySignedReportToken(token) || getPublicReportByToken(token)

  if (!reportLink) {
    return res.status(404).json({
      ok: false,
      error: 'This report link is unavailable or has expired.'
    })
  }

  const range = ALLOWED_RANGES.has(req.query.range) ? req.query.range : '30d'

  try {
    const payload = await buildDashboardPayload({
      clientId: reportLink.clientId,
      platformFilter: reportLink.platform,
      range,
      publicMode: true,
      selectedAccountIds: reportLink.selectedAccountIds || [],
      lockedAccount: reportLink.platform === 'all'
        ? null
        : {
            clientName: reportLink.clientName,
            platform: reportLink.platform,
            accountId: reportLink.accountId,
            accountName: reportLink.accountName,
            businessKey: reportLink.businessKey,
            loginCustomerId: reportLink.loginCustomerId
          }
    })

    if (reportLink.platform === 'all') {
      payload.client.name = reportLink.clientName || payload.client.name
      payload.share = {
        locked: true,
        platform: 'all',
        platforms: reportLink.platforms || payload.availablePlatforms,
        accountId: null,
        selectedAccountIds: reportLink.selectedAccountIds || []
      }
    }

    return res.status(200).json(payload)
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || 'Unable to load this report link.'
    })
  }
}
