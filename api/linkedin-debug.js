import { getLinkedInDebugReport } from '../lib/linkedin.js'

export default async function handler(req, res) {
  const accountId = req.query.accountId || '512874914'
  const start = req.query.start || '2023-09-01'
  const end = req.query.end || new Date().toISOString().slice(0, 10)

  const report = await getLinkedInDebugReport({
    accountId,
    start,
    end
  })

  return res.status(report.ok ? 200 : 500).json(report)
}
