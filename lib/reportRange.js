export function formatReportDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function parseDate(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || formatReportDate(parsed) !== value) return null
  return value
}

export function parseCustomDateRange(range, today = new Date()) {
  const match = /^custom:(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/.exec(String(range || ''))
  if (!match) return null

  const todayDate = formatReportDate(today)
  const startDate = parseDate(match[1])
  const endDate = parseDate(match[2] || todayDate)
  if (!startDate || !endDate || startDate > endDate || endDate > todayDate) return null

  return { startDate, endDate }
}

export function parseCustomStartDate(range, today = new Date()) {
  return parseCustomDateRange(range, today)?.startDate || null
}

export function buildCustomRange(startDate, endDate = formatReportDate(), today = new Date()) {
  return parseCustomDateRange(`custom:${startDate}:${endDate}`, today)
    ? `custom:${startDate}:${endDate}`
    : null
}

export function isCustomRange(range) {
  return Boolean(parseCustomDateRange(range))
}
