import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeMetrics,
  normalizeValueReportInput
} from '../lib/value-report/computeMetrics.js'
import {
  fallbackNarrative,
  writeValueReportNarrative
} from '../lib/value-report/llmClient.js'

const normalizedReport = {
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

const dashboardReport = {
  updatedAt: '2026-07-29T12:00:00.000Z',
  client: { name: 'Dar Alosrah' },
  filters: { range: '30d' },
  summaryCards: [
    { label: 'Total Spend', value: 'SAR 1,000' },
    { label: 'Reach', value: '5,000' },
    { label: 'Impressions', value: '10,000' },
    { label: 'Clicks', value: '500' },
    { label: 'CTR', value: '5.00%' },
    { label: 'Leads', value: '25' },
    { label: 'Form Submissions', value: '20' },
    { label: 'Direct Messages', value: '5' },
    { label: 'Cost per Lead', value: 'SAR 40' }
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
      directMessages: 5,
      daily: [
        { date: '2026-07-01', spend: 300, leads: 5 },
        { date: '2026-07-29', spend: 300, leads: 10 }
      ]
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

test('reproduces the supplied Dar Alosrah value-report calculations', () => {
  const metrics = computeMetrics(normalizedReport)

  assert.equal(metrics.clientName, 'دار الأسرة')
  assert.equal(metrics.days, 159)
  assert.equal(metrics.spendPerDay, 47)
  assert.equal(metrics.clickToLeadRate, 5.62)
  assert.equal(metrics.avgFrequency, 2.7)
  assert.equal(metrics.topChannel.name, 'Meta')
  assert.equal(metrics.topChannel.sharePct, 82)
  assert.equal(metrics.dmSharePct, 58)
  assert.deepEqual(metrics.breakeven, [
    { customerValue: 500, customersNeeded: 16, pctOfLeads: 4.3 },
    { customerValue: 1000, customersNeeded: 8, pctOfLeads: 2.1 },
    { customerValue: 2000, customersNeeded: 4, pctOfLeads: 1.1 },
    { customerValue: 5000, customersNeeded: 2, pctOfLeads: 0.5 }
  ])
})

test('adapts the current dashboard response to the supplied value-report input', () => {
  const normalized = normalizeValueReportInput(dashboardReport)
  const metrics = computeMetrics(dashboardReport)

  assert.deepEqual({
    clientName: normalized.clientName,
    periodStart: normalized.periodStart,
    periodEnd: normalized.periodEnd,
    spend: normalized.spend,
    leads: normalized.leads,
    costPerLead: normalized.costPerLead
  }, {
    clientName: 'Dar Alosrah',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-29',
    spend: 1000,
    leads: 25,
    costPerLead: 40
  })
  assert.equal(metrics.platformRows[0].name, 'Meta')
  assert.equal(metrics.platformRows[0].sharePct, 60)
  assert.equal(metrics.costPerLeadTrend, 'down')
})

test('uses the full safe fallback narrative without an Anthropic key', async () => {
  const metrics = computeMetrics(normalizedReport)
  const narrative = await writeValueReportNarrative(metrics, { apiKey: '' })

  assert.equal(narrative.source, 'fallback')
  assert.equal(narrative.openingHook, fallbackNarrative(metrics).openingHook)
  assert.equal(narrative.remainingValueBullets.length, 4)
  assert.equal(narrative.recommendations.length, 5)
})

test('rejects an LLM narrative that introduces an uncomputed number', async () => {
  const metrics = computeMetrics(normalizedReport)
  const unsafe = fallbackNarrative(metrics)
  unsafe.openingHook = 'حققت الحملة نتيجة غير موثقة مقدارها 999999.'

  const narrative = await writeValueReportNarrative(metrics, {
    apiKey: 'test',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(unsafe) }]
      })
    })
  })

  assert.equal(narrative.source, 'fallback')
  assert.notEqual(narrative.openingHook, unsafe.openingHook)
})
