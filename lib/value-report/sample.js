import { writeFile } from 'node:fs/promises'
import { generateValueReport } from './index.js'

const sampleReport = {
  client: { name: 'دار الأسرة' },
  filters: { range: '30d' },
  summaryCards: [
    { label: 'Total Spend', value: 'SAR 10,000' },
    { label: 'Reach', value: '125,000' },
    { label: 'Impressions', value: '250,000' },
    { label: 'Clicks', value: '7,500' },
    { label: 'Results', value: '300' }
  ],
  exportRows: [
    {
      platform: 'Meta',
      spendSar: 5500,
      reach: 75000,
      impressions: 150000,
      clicks: 4800,
      leads: 210,
      formSubmissions: 130,
      directMessages: 80
    },
    {
      platform: 'Google Ads',
      spendSar: 3000,
      reach: 30000,
      impressions: 60000,
      clicks: 1900,
      leads: 65,
      formSubmissions: 65,
      directMessages: 0
    },
    {
      platform: 'TikTok',
      spendSar: 1500,
      reach: 20000,
      impressions: 40000,
      clicks: 800,
      leads: 25,
      formSubmissions: 5,
      directMessages: 20
    }
  ]
}

const outputPath = process.argv[2] || 'value-report-sample.docx'
const buffer = await generateValueReport(sampleReport, { apiKey: '' })
await writeFile(outputPath, buffer)
console.log(`Created ${outputPath}`)
