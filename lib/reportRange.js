export function formatReportDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function parseCustomStartDate(range, today = new Date()) {
  const match = /^custom:(\d{4}-\d{2}-\d{2})$/.exec(String(range || ''))
  if (!match) return null

  const startDate = match[1]
  const parsed = new Date(`${startDate}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || formatReportDate(parsed) !== startDate) return null
  if (startDate > formatReportDate(today)) return null

  return startDate
}

export function buildCustomRange(startDate, today = new Date()) {
  return parseCustomStartDate(`custom:${startDate}`, today)
    ? `custom:${startDate}`
    : null
}

export function isCustomRange(range) {
  return Boolean(parseCustomStartDate(range))
}
