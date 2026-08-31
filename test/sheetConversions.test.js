import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { clients } from '../data/clients.js'
import {
  getSheetConversions,
  filterSheetConversionsByDate,
  mergeConversions,
  parseSheetConversionRows,
  summarizeConversions
} from '../lib/sheetConversions.js'

const sheetConfig = {
  leadIdColumn: 'Lead ID',
  convertedColumn: 'Converted (Y/N)',
  sourceColumn: 'Source',
  dateColumn: 'Date'
}

test('only Cloud Chefs has a lead Sheet configuration', () => {
  const configuredClients = clients.filter((client) => client.leadsSheet)
  assert.deepEqual(configuredClients.map((client) => client.id), ['cloud-chefs'])
})

test('returns null without a lead Sheet and does not call fetch', async () => {
  let fetchCalls = 0
  const result = await getSheetConversions(
    { id: 'no-sheet' },
    { fetchImpl: async () => { fetchCalls += 1 } }
  )

  assert.equal(result, null)
  assert.equal(fetchCalls, 0)
})

test('returns null when environment-backed Sheet configuration is unresolved', async () => {
  let fetchCalls = 0
  const result = await getSheetConversions(
    {
      id: 'cloud-chefs',
      leadsSheet: {
        ...sheetConfig,
        spreadsheetId: 'env:MISSING_SHEET_ID',
        sheetName: 'env:MISSING_SHEET_NAME'
      }
    },
    {
      env: {},
      fetchImpl: async () => { fetchCalls += 1 }
    }
  )

  assert.equal(result, null)
  assert.equal(fetchCalls, 0)
})

test('parses, normalizes, and deduplicates lead conversion rows', () => {
  const rows = parseSheetConversionRows([
    ['Lead ID', 'Converted (Y/N)', 'Source', 'Date'],
    ['lead-1', 'Yes', 'Meta', '2026/08/10'],
    ['lead-2', 'N', 'Snapchat', '2026-08-11'],
    ['lead-1', 'Y', 'Meta', '2026-08-12'],
    ['', 'Y', 'TikTok', '2026-08-12']
  ], sheetConfig)

  assert.deepEqual(rows, [
    { leadId: 'lead-1', converted: true, source: 'Meta', date: '2026-08-12' },
    { leadId: 'lead-2', converted: false, source: 'Snapchat', date: '2026-08-11' }
  ])
})

test('parses a platform tab with a configured fixed source', () => {
  const rows = parseSheetConversionRows([
    ['lead_id', 'created_date', 'تم الفوز بالفرصة؟ نعم/ لا'],
    ['linkedin-1', '8/8/2026', 'Yes'],
    ['linkedin-2', '8/9/2026', 'نعم'],
    ['linkedin-3', '8/10/2026', 'Maybe']
  ], {
    leadIdColumn: 'lead_id',
    dateColumn: 'created_date',
    convertedColumn: 'تم الفوز بالفرصة؟ نعم/ لا',
    sourceValue: 'LinkedIn',
    dateFormat: 'MDY'
  })

  assert.deepEqual(rows, [
    { leadId: 'linkedin-1', converted: true, source: 'LinkedIn', date: '2026-08-08' },
    { leadId: 'linkedin-2', converted: true, source: 'LinkedIn', date: '2026-08-09' },
    { leadId: 'linkedin-3', converted: false, source: 'LinkedIn', date: '2026-08-10' }
  ])
})

test('leaves platform data unchanged when Sheet data is unavailable', () => {
  const platformData = [{ platform: 'Meta', campaign: 'Cloud Chefs', spend: 100 }]
  assert.equal(mergeConversions(platformData, null), platformData)
  assert.equal(summarizeConversions(platformData, null), null)
})

test('filters dated Sheet conversions to the selected reporting period', () => {
  const sheetData = {
    dateColumnConfigured: true,
    rows: [
      { leadId: 'before', date: '2026-06-30' },
      { leadId: 'start', date: '2026-07-01' },
      { leadId: 'end', date: '2026-07-31' },
      { leadId: 'after', date: '2026-08-01' },
      { leadId: 'undated', date: null }
    ]
  }

  assert.deepEqual(
    filterSheetConversionsByDate(sheetData, '2026-07-01', '2026-07-31').rows.map((row) => row.leadId),
    ['start', 'end']
  )
})

test('adds per-platform and overall converted-lead metrics', () => {
  const platformData = [
    {
      platform: 'Meta',
      campaign: 'Cloud Chefs Meta',
      spend: 300,
      leadBreakdown: { totalLeads: 6 },
      daily: [{ date: '2026-08-12', spend: 100, totalLeads: 2 }]
    },
    {
      platform: 'Snapchat',
      campaign: 'Cloud Chefs Snapchat',
      spend: 200,
      leadBreakdown: { totalLeads: 4 }
    }
  ]
  const sheetData = {
    fetchedAt: '2026-08-31T00:00:00.000Z',
    rows: [
      { leadId: '1', converted: true, source: 'Meta', date: '2026-08-12' },
      { leadId: '2', converted: false, source: 'Meta', date: '2026-08-12' },
      { leadId: '3', converted: true, source: 'Snapchat', date: null },
      { leadId: '4', converted: true, source: 'Unknown', date: null }
    ]
  }

  const merged = mergeConversions(platformData, sheetData)
  const summary = summarizeConversions(merged, sheetData)

  assert.equal(merged[0].convertedCount, 1)
  assert.ok(Math.abs(merged[0].conversionRate - (100 / 6)) < 1e-10)
  assert.equal(merged[0].costPerConvertedLead, 300)
  assert.equal(merged[0].daily[0].convertedCount, 1)
  assert.equal(merged[1].convertedCount, 1)
  assert.equal(merged[1].costPerConvertedLead, 200)
  assert.equal(summary.convertedCount, 2)
  assert.equal(summary.conversionRate, 20)
  assert.equal(summary.costPerConvertedLead, 250)
  assert.equal(summary.attributedCount, 3)
  assert.equal(summary.unattributedCount, 1)
})

test('swallows Sheets authentication failures and logs them', async () => {
  const errors = []
  const result = await getSheetConversions(
    {
      id: 'cloud-chefs',
      leadsSheet: {
        ...sheetConfig,
        spreadsheetId: 'sheet-id',
        sheetName: 'Leads'
      }
    },
    {
      env: {
        GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: 'service@example.com',
        GOOGLE_SHEETS_PRIVATE_KEY: 'not-a-private-key'
      },
      fetchImpl: async () => { throw new Error('fetch should not be reached') },
      logger: { error: (message) => errors.push(message) }
    }
  )

  assert.equal(result, null)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /Sheet conversions unavailable for cloud-chefs/)
})

test('falls back to null when an authenticated Sheet request fails', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const serviceAccountKey = Buffer.from(JSON.stringify({
    client_email: 'sheet-failure@example.com',
    private_key: privateKeyPem
  })).toString('base64')
  const errors = []
  let fetchCalls = 0
  const result = await getSheetConversions(
    {
      id: 'cloud-chefs',
      leadsSheet: {
        ...sheetConfig,
        spreadsheetId: 'renamed-or-unshared-sheet',
        sheetName: 'Leads'
      }
    },
    {
      env: {
        GOOGLE_SERVICE_ACCOUNT_KEY_B64: serviceAccountKey
      },
      fetchImpl: async (url) => {
        fetchCalls += 1
        if (url.includes('oauth2.googleapis.com')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'test-token', expires_in: 3600 })
          }
        }
        return {
          ok: false,
          json: async () => ({ error: { message: 'Requested entity was not found' } })
        }
      },
      logger: { error: (message) => errors.push(message) }
    }
  )

  assert.equal(result, null)
  assert.equal(fetchCalls, 2)
  assert.match(errors[0], /Requested entity was not found/)
})
