export default async function handler(req, res) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const accountId = req.query.accountId || '770445006102868'

  const accountPath = String(accountId).startsWith('act_')
    ? String(accountId)
    : `act_${accountId}`

  const url =
    `https://graph.facebook.com/v19.0/${accountPath}` +
    `?fields=${encodeURIComponent('id,name,account_id')}` +
    `&access_token=${encodeURIComponent(String(accessToken).trim())}`

  try {
    const response = await fetch(url)
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
