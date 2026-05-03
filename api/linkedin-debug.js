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

  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  const dateRange = encodeURIComponent(
    `(start:(year:${startDate.getUTCFullYear()},month:${startDate.getUTCMonth() + 1},day:${startDate.getUTCDate()}),end:(year:${endDate.getUTCFullYear()},month:${endDate.getUTCMonth() + 1},day:${endDate.getUTCDate()}))`
  )

  const accountUrnEncoded = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`)

  const url =
    `https://api.linkedin.com/rest/adAnalytics` +
    `?q=analytics` +
    `&pivot=ACCOUNT` +
    `&timeGranularity=ALL` +
    `&dateRange=${dateRange}` +
    `&accounts=List(${accountUrnEncoded})` +
    `&fields=dateRange,pivotValues,costInLocalCurrency,impressions,clicks,landingPageClicks,externalWebsiteConversions`

  try {
    const response = await fetch(url, {
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
      return res.status(500).json({
        ok: false,
        stage: 'non_json',
        snippet: text.slice(0, 500),
        url
      })
    }

    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok,
      url,
      data
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
