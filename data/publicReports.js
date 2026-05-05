import { createHash } from 'crypto'

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

function parseJsonLinks() {
  if (!process.env.PUBLIC_REPORT_LINKS) return []

  try {
    const parsed = JSON.parse(process.env.PUBLIC_REPORT_LINKS)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeLink(link) {
  if (!link || !link.clientId || !link.platform || !link.accountId) return null

  return {
    id: link.id || `${link.clientId}-${link.platform}-${link.accountId}`,
    clientId: link.clientId,
    clientName: link.clientName || null,
    platform: String(link.platform).toLowerCase(),
    accountId: String(link.accountId),
    accountName: link.accountName || null,
    businessKey: link.businessKey || null,
    loginCustomerId: link.loginCustomerId || null,
    tokenHash: link.tokenHash || (link.token ? hashToken(link.token) : null)
  }
}

export function getPublicReportLinks() {
  return parseJsonLinks()
    .map(normalizeLink)
    .filter((link) => link?.tokenHash)
}

export function getPublicReportByToken(token) {
  if (!token) return null

  const requestedHash = hashToken(token)
  return getPublicReportLinks().find((link) => link.tokenHash === requestedHash) || null
}
