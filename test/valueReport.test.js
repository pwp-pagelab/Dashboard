import test from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics } from '../lib/value-report/computeMetrics.js'
import { FALLBACK_NARRATIVE, writeValueReportNarrative } from '../lib/value-report/llmClient.js'

const dashboardReport = {
  client: { name: 'Dar Alosrah' },
  filters: { range: '30d' },
  summaryCards: [
    { label: 'Total Spend', value: 'SAR 1,000' },
    { label: 'Reach', value: '5,000' },
    { label: 'Impressions', value: '10,000' },
    { label: 'Clicks', value: '500' },
    { label: 'Results', value: '25' }
  ],
  exportRows: [
    {
      platform: 'Meta',
      spendSar: 600,
      reach: 3000,
      impressions: 6000,
      clicks: 300,
      leads: 15,
      formSubmissions: 10,
      directMessages: 5
    },
    {
      platform: 'Google Ads',
      spendSar: 400,
      reach: 2000,
      impressions: 4000,
      clicks: 200,
      leads: 10,
      formSubmissions: 10,
      directMessages: 0
    }
  ]
}

test('computes all value-report figures deterministically from dashboard data', () => {
  const metrics = computeMetrics(dashboardReport)

  assert.equal(metrics.clientName, 'Dar Alosrah')
  assert.deepEqual(metrics.totals, {
    spend: 1000,
    reach: 5000,
    impressions: 10000,
    clicks: 500,
    leads: 25,
    formSubmissions: 20,
    directMessages: 5
  })
  assert.deepEqual(metrics.efficiency, {
    ctrPercent: 5,
    clickToLeadPercent: 5,
    costPerClick: 2,
    costPerLead: 40,
    frequency: 2,
    reachPerSar: 5
  })
  assert.equal(metrics.breakEven.minimumValuePerLead, 40)
  assert.equal(metrics.platforms[0].spendSharePercent, 60)
  assert.equal(metrics.platforms[0].leadSharePercent, 60)
})

test('uses number-free fallback narrative when no Anthropic key is configured', async () => {
  const narrative = await writeValueReportNarrative(computeMetrics(dashboardReport), { apiKey: '' })

  assert.equal(narrative.source, 'fallback')
  assert.equal(narrative.executiveSummary, FALLBACK_NARRATIVE.executiveSummary)
  assert.equal(/[0-9٠-٩]/.test(JSON.stringify(narrative)), false)
})

test('rejects an LLM narrative that introduces numbers', async () => {
  const narrative = await writeValueReportNarrative(computeMetrics(dashboardReport), {
    apiKey: 'test',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            executiveSummary: 'تحسن الأداء بنسبة 99 بالمئة',
            performanceNarrative: 'الأداء مستقر',
            breakEvenNarrative: 'التعادل واضح',
            recommendations: ['حسنوا التتبع', 'راجعوا الجودة', 'اختبروا الرسائل'],
            conclusion: 'استمروا في التحسين'
          })
        }]
      })
    })
  })

  assert.equal(narrative.source, 'fallback')
})
