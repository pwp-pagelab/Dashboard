import { createHash, createHmac, timingSafeEqual } from 'crypto'

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(String(value), 'base64url').toString('utf8')
}

function signPayload(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
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
  if (!link || !link.clientId || !link.platform) return null

  return {
    id: link.id || `${link.clientId}-${link.platform}-${link.accountId}`,
    clientId: link.clientId,
    clientName: link.clientName || null,
    platform: String(link.platform).toLowerCase(),
    platforms: Array.isArray(link.platforms) ? link.platforms.map((platform) => String(platform).toLowerCase()) : null,
    selectedAccountIds: Array.isArray(link.selectedAccountIds)
      ? link.selectedAccountIds.map((id) => String(id)).filter(Boolean)
      : Array.isArray(link.accounts)
        ? link.accounts.map((id) => String(id)).filter(Boolean)
        : [],
    accountId: link.accountId ? String(link.accountId) : null,
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

export function createSignedReportToken(link) {
  const secret = process.env.PUBLIC_SHARE_SECRET
  const normalized = normalizeLink(link)

  if (!secret) {
    throw new Error('Missing PUBLIC_SHARE_SECRET')
  }

  if (!normalized) {
    throw new Error('Invalid share link details')
  }

  const payload = base64UrlEncode(JSON.stringify({
    version: 1,
    clientId: normalized.clientId,
    clientName: normalized.clientName,
    platform: normalized.platform,
    platforms: normalized.platforms,
    selectedAccountIds: normalized.selectedAccountIds,
    accountId: normalized.accountId,
    accountName: normalized.accountName,
    businessKey: normalized.businessKey,
    loginCustomerId: normalized.loginCustomerId
  }))
  const signature = signPayload(payload, secret)

  return `${payload}.${signature}`
}

export function verifySignedReportToken(token) {
  const secret = process.env.PUBLIC_SHARE_SECRET
  if (!secret || !token || !String(token).includes('.')) return null

  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) return null

  const expected = signPayload(payload, secret)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    return normalizeLink(JSON.parse(base64UrlDecode(payload)))
  } catch {
    return null
  }
}
