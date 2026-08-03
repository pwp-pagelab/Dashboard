import { computeMetrics } from './computeMetrics.js'
import { writeValueReportNarrative } from './llmClient.js'
import { buildValueReportDocx } from './generateDocx.js'

export async function generateValueReport(rawReport, options = {}) {
  const metrics = computeMetrics(rawReport)
  const narrative = await writeValueReportNarrative(metrics, options)
  return buildValueReportDocx(metrics, narrative)
}

export { computeMetrics } from './computeMetrics.js'
