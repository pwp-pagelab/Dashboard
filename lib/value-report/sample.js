import { writeFile } from 'node:fs/promises'
import { generateValueReport } from './index.js'

const rawReport = {
  clientName: 'دار الأسرة',
  periodStart: '2026-02-20',
  periodEnd: '2026-07-29',
  spend: 7547.56,
  reach: 97150,
  impressions: 262719,
  clicks: 6642,
  ctr: 2.53,
  leads: 373,
  costPerLead: 20.23,
  leadsBySourceType: { formSubmissions: 158, directMessages: 215 },
  platforms: [
    { name: 'Meta', leads: 306 },
    { name: 'TikTok', leads: 55 },
    { name: 'LinkedIn', leads: 12 },
    { name: 'Google Ads', leads: 0 }
  ],
  costPerLeadTrend: 'down'
}

const outputPath = process.argv[2] || 'value-report-sample.docx'
const buffer = await generateValueReport(rawReport, { apiKey: '' })
await writeFile(outputPath, buffer)
console.log(`Created ${outputPath}`)
