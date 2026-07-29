import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyGoogleLeadAction,
  createLeadBreakdown,
  getLeadBreakdown,
  summarizeGoogleLeadActions
} from '../lib/leads.js'

test('creates a strict lead total from forms and direct messages', () => {
  assert.deepEqual(
    createLeadBreakdown({ formSubmissions: 4, directMessages: 3 }),
    {
      formSubmissions: 4,
      directMessages: 3,
      totalLeads: 7,
      details: []
    }
  )
})

test('reads the standardized breakdown without counting other conversions', () => {
  assert.deepEqual(
    getLeadBreakdown({
      conversions: 99,
      conversionBreakdown: {
        leads: 5,
        messagingConversations: 2,
        purchases: 20,
        registrations: 12
      }
    }),
    {
      formSubmissions: 5,
      directMessages: 2,
      totalLeads: 7,
      details: []
    }
  )
})

test('classifies only Google form and messaging conversion actions as leads', () => {
  assert.equal(
    classifyGoogleLeadAction({ category: 'SUBMIT_LEAD_FORM', name: 'Website lead form' }),
    'formSubmissions'
  )
  assert.equal(
    classifyGoogleLeadAction({ category: 'CONTACT', name: 'WhatsApp message' }),
    'directMessages'
  )
  assert.equal(
    classifyGoogleLeadAction({ category: 'PURCHASE', name: 'Purchase' }),
    null
  )
  assert.equal(
    classifyGoogleLeadAction({ category: 'PHONE_CALL_LEAD', name: 'Calls from ads' }),
    null
  )
})

test('summarizes Google action rows and excludes purchases and calls', () => {
  const actionRows = [
    {
      conversionAction: {
        resourceName: 'customers/1/conversionActions/form',
        name: 'Website enquiry form',
        category: 'SUBMIT_LEAD_FORM'
      }
    },
    {
      conversionAction: {
        resourceName: 'customers/1/conversionActions/message',
        name: 'WhatsApp message',
        category: 'CONTACT'
      }
    },
    {
      conversionAction: {
        resourceName: 'customers/1/conversionActions/purchase',
        name: 'Purchase',
        category: 'PURCHASE'
      }
    }
  ]
  const metricRows = [
    {
      segments: { conversionAction: 'customers/1/conversionActions/form' },
      metrics: { conversions: 2, allConversions: 2 }
    },
    {
      segments: { conversionAction: 'customers/1/conversionActions/message' },
      metrics: { conversions: 3, allConversions: 3 }
    },
    {
      segments: { conversionAction: 'customers/1/conversionActions/purchase' },
      metrics: { conversions: 10, allConversions: 10 }
    }
  ]

  const result = summarizeGoogleLeadActions(metricRows, actionRows)
  assert.equal(result.formSubmissions, 2)
  assert.equal(result.directMessages, 3)
  assert.equal(result.totalLeads, 5)
})
