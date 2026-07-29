function safeCount(value) {
  const count = Number(value || 0)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function createLeadBreakdown({
  formSubmissions = 0,
  directMessages = 0,
  details = []
} = {}) {
  const forms = safeCount(formSubmissions)
  const messages = safeCount(directMessages)

  return {
    formSubmissions: forms,
    directMessages: messages,
    totalLeads: forms + messages,
    details: Array.isArray(details) ? details : []
  }
}

export function getLeadBreakdown(row = null) {
  if (row?.leadBreakdown) {
    return createLeadBreakdown(row.leadBreakdown)
  }

  const conversionBreakdown = row?.conversionBreakdown || {}
  return createLeadBreakdown({
    formSubmissions: conversionBreakdown.leads,
    directMessages: conversionBreakdown.messagingConversations
  })
}

const GOOGLE_FORM_CATEGORIES = new Set([
  'SUBMIT_LEAD_FORM',
  'REQUEST_QUOTE',
  'BOOK_APPOINTMENT',
  'SIGNUP'
])

const MESSAGE_NAME_PATTERN = /\b(message|messaging|messenger|whatsapp|chat|direct message|dm)\b/i
const FORM_NAME_PATTERN = /\b(form|lead|enquiry|inquiry|quote|appointment|booking|signup|sign up|registration)\b/i

export function classifyGoogleLeadAction({ category = '', name = '' } = {}) {
  const normalizedCategory = String(category || '').toUpperCase()
  const normalizedName = String(name || '').trim()

  if (MESSAGE_NAME_PATTERN.test(normalizedName)) return 'directMessages'
  if (GOOGLE_FORM_CATEGORIES.has(normalizedCategory)) return 'formSubmissions'
  if (normalizedCategory === 'CONTACT' && FORM_NAME_PATTERN.test(normalizedName)) return 'formSubmissions'

  return null
}

export function summarizeGoogleLeadActions(metricRows = [], actionRows = []) {
  const actionMap = new Map(
    actionRows.map((row) => [
      row.conversionAction?.resourceName,
      {
        name: row.conversionAction?.name || '',
        category: row.conversionAction?.category || ''
      }
    ])
  )
  const details = []
  let formSubmissions = 0
  let directMessages = 0

  metricRows.forEach((row) => {
    const resourceName = row.segments?.conversionAction || ''
    const metadata = actionMap.get(resourceName) || {
      name: row.segments?.conversionActionName || '',
      category: ''
    }
    const kind = classifyGoogleLeadAction(metadata)
    if (!kind) return

    const value = safeCount(row.metrics?.allConversions ?? row.metrics?.conversions)
    if (value === 0) return

    if (kind === 'directMessages') directMessages += value
    else formSubmissions += value

    details.push({
      source: metadata.name || resourceName,
      category: metadata.category || null,
      type: kind,
      value
    })
  })

  return createLeadBreakdown({ formSubmissions, directMessages, details })
}
