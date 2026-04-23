async function getSnapAccessToken() {
  const clientId = process.env.SNAP_CLIENT_ID
  const clientSecret = process.env.SNAP_CLIENT_SECRET
  const refreshToken = process.env.SNAP_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing SNAP_CLIENT_ID, SNAP_CLIENT_SECRET, or SNAP_REFRESH_TOKEN')
  }

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
    throw new Error(`Snap OAuth returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!tokenResp.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Failed to refresh Snapchat access token')
  }

  return json.access_token
}

export default async function handler(req, res) {
  const organizationId = req.query.organizationId || null

  try {
    const accessToken = await getSnapAccessToken()

    // Mode 1: list all orgs + ad accounts
    if (!organizationId) {
      const response = await fetch(
        'https://adsapi.snapchat.com/v1/me/organizations?with_ad_accounts=true',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      const text = await response.text()

      let json
      try {
        json = JSON.parse(text)
      } catch {
        return res.status(500).json({
          ok: false,
          stage: 'organizations_non_json',
          snippet: text.slice(0, 500)
        })
      }

      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          stage: 'organizations',
          snapError: json
        })
      }

      return res.status(200).json({
        ok: true,
        mode: 'all_organizations',
        data: json
      })
    }

    // Mode 2: list ad accounts for one org
    const response = await fetch(
      `https://adsapi.snapchat.com/v1/organizations/${organizationId}/adaccounts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    )

    const text = await response.text()

    let json
    try {
      json = JSON.parse(text)
    } catch {
      return res.status(500).json({
        ok: false,
        stage: 'adaccounts_non_json',
        snippet: text.slice(0, 500)
      })
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        stage: 'adaccounts',
        snapError: json
      })
    }

    return res.status(200).json({
      ok: true,
      mode: 'organization_adaccounts',
      organizationId,
      data: json
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
