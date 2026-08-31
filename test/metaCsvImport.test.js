import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyMetaImportToDashboard,
  parseMetaCsv
} from '../lib/metaCsvImport.js'

const csv = `Reporting starts,Campaign name,Amount spent (SAR),Reach,Impressions,Link clicks,Leads,Messaging conversations started,Age,Gender,Region,Device platform
2026-07-31,"Cloud Chefs, Riyadh",100.50,1000,1500,75,3,2,25-34,Female,Riyadh,mobile
2026-08-01,"Cloud Chefs, Riyadh",80,800,1200,60,2,1,35-44,Male,Riyadh,mobile
`

test('parses common Meta Ads Manager CSV columns', () => {
  const imported = parseMetaCsv(csv, {
    fileName: 'cloud-chefs-meta.csv',
    uploadedAt: '2026-08-02T12:00:00.000Z'
  })

  assert.equal(imported.rows.length, 2)
  assert.equal(imported.rows[0].campaign, 'Cloud Chefs, Riyadh')
  assert.equal(imported.rows[0].spend, 100.5)
  assert.equal(imported.rows[0].formSubmissions, 3)
  assert.equal(imported.rows[0].directMessages, 2)
  assert.deepEqual(imported.rows[0].audience, {
    age: '25-34',
    gender: 'Female',
    country: '',
    region: 'Riyadh',
    city: '',
    device: 'mobile',
    publisherPlatform: '',
    placement: ''
  })
})

test('adds uploaded Meta totals to the dashboard and respects the selected date range', () => {
  const imported = parseMetaCsv(csv, {
    fileName: 'cloud-chefs-meta.csv',
    uploadedAt: '2026-08-02T12:00:00.000Z'
  })
  const base = {
    client: { id: 'cloud-chefs', name: 'Cloud Chefs' },
    summaryCards: [
      { label: 'Total Spend', value: 'SAR 20' },
      { label: 'Reach', value: '100' },
      { label: 'Impressions', value: '200' },
      { label: 'Clicks', value: '10' },
      { label: 'CTR', value: '5.00%' },
      { label: 'Leads', value: '1' },
      { label: 'Form Submissions', value: '1' },
      { label: 'Direct Messages', value: '0' },
      { label: 'Cost per Lead', value: 'SAR 20' },
      { label: 'Lead Rate', value: '10.00%' },
      { label: 'Platforms Active', value: '1' }
    ],
    campaignRows: [{ platform: 'TikTok', campaign: 'Cloud Chefs', spend: 'SAR 20', clicks: '10', conversions: '1' }],
    exportRows: [{
      platform: 'TikTok',
      accountName: 'Cloud Chefs',
      spendSar: 20,
      reach: 100,
      impressions: 200,
      clicks: 10,
      leads: 1,
      formSubmissions: 1,
      directMessages: 0,
      daily: [{ date: '2026-08-01', spend: 20, conversions: 1 }]
    }],
    accountOptions: [{
      id: 'meta:cloud-chefs:auto',
      platform: 'meta',
      platformLabel: 'Meta',
      clientId: 'cloud-chefs',
      accountId: '',
      accountName: 'Cloud Chefs'
    }],
    accountStatuses: [{
      id: 'tiktok:cloud-chefs:1',
      platform: 'tiktok',
      platformLabel: 'TikTok',
      accountId: '1',
      accountName: 'Cloud Chefs',
      status: 'loaded'
    }],
    dataQuality: {},
    trends: { daily: [] },
    diagnostics: {},
    insights: {}
  }

  const result = applyMetaImportToDashboard(base, imported, {
    range: 'custom:2026-08-01',
    platform: 'all',
    now: new Date('2026-08-02T12:00:00.000Z')
  })

  const byLabel = Object.fromEntries(result.summaryCards.map((card) => [card.label, card.value]))
  assert.equal(byLabel['Total Spend'], 'SAR 100')
  assert.equal(byLabel.Impressions, '1,400')
  assert.equal(byLabel.Clicks, '70')
  assert.equal(byLabel.Leads, '4')
  assert.equal(byLabel['Form Submissions'], '3')
  assert.equal(byLabel['Direct Messages'], '1')
  assert.equal(result.campaignRows.some((row) => row.platform === 'Meta'), true)
  assert.equal(result.accountOptions[0].accountId, '640964945046086')
  assert.equal(result.accountStatuses.find((status) => status.platform === 'meta').status, 'loaded')
  assert.deepEqual(
    result.exportRows.find((row) => row.platform === 'Meta').audienceBreakdown,
    [
      {
        dimension: 'Age',
        segment: '35-44',
        spend: 80,
        reach: 800,
        impressions: 1200,
        clicks: 60,
        leads: 3,
        formSubmissions: 2,
        directMessages: 1
      },
      {
        dimension: 'Gender',
        segment: 'Male',
        spend: 80,
        reach: 800,
        impressions: 1200,
        clicks: 60,
        leads: 3,
        formSubmissions: 2,
        directMessages: 1
      },
      {
        dimension: 'Region',
        segment: 'Riyadh',
        spend: 80,
        reach: 800,
        impressions: 1200,
        clicks: 60,
        leads: 3,
        formSubmissions: 2,
        directMessages: 1
      },
      {
        dimension: 'Device',
        segment: 'mobile',
        spend: 80,
        reach: 800,
        impressions: 1200,
        clicks: 60,
        leads: 3,
        formSubmissions: 2,
        directMessages: 1
      }
    ]
  )
  assert.deepEqual(result.trends.daily, [{
    date: '2026-08-01',
    spend: 100,
    conversions: 4
  }])
})

test('excludes uploaded Meta rows after an exact custom end date', () => {
  const imported = parseMetaCsv(csv)
  const base = {
    client: { id: 'cloud-chefs', name: 'Cloud Chefs' },
    summaryCards: [
      { label: 'Total Spend', value: 'SAR 0' },
      { label: 'Reach', value: '0' },
      { label: 'Impressions', value: '0' },
      { label: 'Clicks', value: '0' },
      { label: 'Leads', value: '0' },
      { label: 'Form Submissions', value: '0' },
      { label: 'Direct Messages', value: '0' }
    ],
    campaignRows: [], exportRows: [], accountOptions: [], accountStatuses: [],
    dataQuality: {}, trends: { daily: [] }, diagnostics: {}, insights: {}
  }

  const result = applyMetaImportToDashboard(base, imported, {
    range: 'custom:2026-07-31:2026-07-31',
    platform: 'all',
    now: new Date('2026-08-02T12:00:00.000Z')
  })
  const byLabel = Object.fromEntries(result.summaryCards.map((card) => [card.label, card.value]))
  assert.equal(byLabel['Total Spend'], 'SAR 100.5')
  assert.equal(byLabel.Leads, '5')
})

test('rejects files that do not contain Meta reporting metrics', () => {
  assert.throws(
    () => parseMetaCsv('Name,Email\nA,a@example.com\n'),
    /does not look like a Meta Ads report/
  )
})
