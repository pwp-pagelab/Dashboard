export default async function handler(req, res) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN
  const appId = process.env.TIKTOK_APP_ID
  const secret = process.env.TIKTOK_APP_SECRET

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      error: 'Missing TIKTOK_ACCESS_TOKEN'
    })
  }

  if (!appId || !secret) {
    return res.status(500).json({
      ok: false,
      error: 'Missing TIKTOK_APP_ID or TIKTOK_APP_SECRET'
    })
  }

  const url =
    `https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&secret=${encodeURIComponent(secret)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
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
      data
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
