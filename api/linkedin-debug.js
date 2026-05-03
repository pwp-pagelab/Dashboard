export default async function handler(req, res) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  const accountId = req.query.accountId || '512874914'
  const start = req.query.start || '2026-01-01'
  const end = req.query.end || new Date().toISOString().slice(0, 10)

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      error: 'Missing LINKEDIN_ACCESS_TOKEN'
    })
  }

  const accountUrn = `urn:li:sponsoredAccount:${accountId}`

  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  const dateRange =
    `(start:(year:${startDate.getUTCFullYear()},month:${startDate.getUTCMonth() + 1},day:${startDate.getUTCDate()}),` +
    `end:(year:${endDate.getUTCFullYear()},month:${endDate.getUTCMonth() + 1},day:${endDate.getUTCDate()}))`

  const variants = [
    {
      name: 'analytics_minimal_no_fields',
      url:
        `https://api.linkedin.com/rest/adAnalytics` +
        `?q=analytics` +
        `&pivot=ACCOUNT` +
        `&accounts=List(${encodeURIComponent(accountUrn)})` +
        `&dateRange=${encodeURIComponent(dateRange)}`
    },
    {
      name: 'analytics_with_time_all',
      url:
        `https://api.linkedin.com/rest/adAnalytics` +
        `?q=analytics` +
        `&pivot=ACCOUNT` +
        `&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountUrn)})` +
        `&dateRange=${encodeURIComponent(dateRange)}`
    },
    {
      name: 'analytics_with_basic_fields',
      url:
        `https://api.linkedin.com/rest/adAnalytics` +
        `?q=analytics` +
        `&pivot=ACCOUNT` +
        `&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountUrn)})` +
        `&dateRange=${encodeURIComponent(dateRange)}` +
        `&fields=impressions,clicks`
    },
    {
      name: 'statistics_with_pivots',
      url:
        `https://api.linkedin.com/rest/adAnalytics` +
        `?q=statistics` +
        `&pivots=List(ACCOUNT)` +
        `&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountUrn)})` +
        `&dateRange=${encodeURIComponent(dateRange)}` +
        `&fields=impressions,clicks`
    }
  ]

  const results = []

  for (const variant of variants) {
    try {
      const response = await fetch(variant.url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202604',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      })

      const text = await response.text()

      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = { non_json: text.slice(0, 500) }
      }

      results.push({
        name: variant.name,
        status: response.status,
        ok: response.ok,
        url: variant.url,
        data
      })
    } catch (error) {
      results.push({
        name: variant.name,
        ok: false,
        error: error.message
      })
    }
  }

  return res.status(200).json({
    ok: true,
    accountId,
    start,
    end,
    results
  })
}
