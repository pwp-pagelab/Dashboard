export default async function handler(req, res) {
  const accessToken = process.env.META_ACCESS_TOKEN
  const accountId = req.query.accountId || '770445006102868'

  if (!accessToken) {
    return res.status(500).json({
      ok: false,
      error: 'Missing META_ACCESS_TOKEN'
    })
  }

  const accountPath = String(accountId).startsWith('act_')
    ? String(accountId)
    : `act_${accountId}`

  const url =
    `https://graph.facebook.com/v19.0/${accountPath}/insights` +
    `?level=account` +
    `&fields=${encodeURIComponent('account_name,actions')}` +
    `&action_report_time=conversion` +
    `&use_account_attribution_setting=true` +
    `&time_range=${encodeURIComponent(
      JSON.stringify({
        since: '2023-01-01',
        until: new Date().toISOString().slice(0, 10)
      })
    )}` +
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

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || 'Meta API error',
        raw: data
      })
    }

    const row = data?.data?.[0] || null
    const actions = Array.isArray(row?.actions) ? row.actions : []

    const actionTypeTotals = {}
    for (const action of actions) {
      const key = action.action_type || 'unknown'
      actionTypeTotals[key] = Number(action.value || 0)
    }

    return res.status(200).json({
      ok: true,
      accountId,
      accountName: row?.account_name || null,
      actionTypeTotals
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    })
  }
}
