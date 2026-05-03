export default async function handler(req, res) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  const accountId = req.query.accountId || '512874914'

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      error: 'Missing LINKEDIN_ACCESS_TOKEN'
    })
  }

  const accountUrn = `urn:li:sponsoredAccount:${accountId}`

  const url =
    `https://api.linkedin.com/rest/adCampaigns` +
    `?q=search` +
    `&search.account.value=${encodeURIComponent(accountUrn)}`

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
        snippet: text.slice(0, 500)
      })
    }

    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok,
      accountId,
      accountUrn,
      data
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
