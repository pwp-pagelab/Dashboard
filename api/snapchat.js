export default async function handler(req, res) {
  const clientId = process.env.SNAP_CLIENT_ID
  const clientSecret = process.env.SNAP_CLIENT_SECRET
  const redirectUri = process.env.SNAP_REDIRECT_URI
  const refreshToken = process.env.SNAP_REFRESH_TOKEN

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    return res.status(500).json({
      ok: false,
      error: 'Missing one or more Snapchat environment variables'
    })
  }

  try {
    const tokenResp = await fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    })

    const text = await tokenResp.text()

    let json
    try {
      json = JSON.parse(text)
    } catch {
      return res.status(500).json({
        ok: false,
        stage: 'oauth_non_json',
        snippet: text.slice(0, 500)
      })
    }

    if (!tokenResp.ok) {
      return res.status(tokenResp.status).json({
        ok: false,
        stage: 'oauth',
        snapError: json
      })
    }

    return res.status(200).json({
      ok: true,
      source: 'snapchat',
      message: 'Snapchat OAuth is working',
      tokenPreview: {
        token_type: json.token_type,
        expires_in: json.expires_in,
        scope: json.scope || null
      }
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
