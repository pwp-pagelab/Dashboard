import { generateValueReport } from '../lib/value-report/index.js'

export const config = {
  maxDuration: 60
}

function safeFileName(value) {
  return String(value || 'client')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'client'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Use POST to generate a value report.' })
  }

  try {
    const rawReport = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!rawReport || typeof rawReport !== 'object') {
      return res.status(400).json({ error: 'Dashboard report data is required.' })
    }

    const buffer = await generateValueReport(rawReport)
    const clientName = rawReport?.client?.name || rawReport?.clientName || 'client'
    const fileName = `value-report-${safeFileName(clientName)}.docx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', String(buffer.length))
    return res.status(200).send(buffer)
  } catch (error) {
    console.error('Value report generation failed:', error)
    return res.status(500).json({
      error: 'Unable to generate the value report. Please try again.'
    })
  }
}
