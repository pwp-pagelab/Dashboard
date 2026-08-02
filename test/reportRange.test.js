import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCustomRange,
  isCustomRange,
  parseCustomStartDate
} from '../lib/reportRange.js'

const today = new Date('2026-08-02T12:00:00.000Z')

test('builds and reads a valid custom report starting date', () => {
  assert.equal(buildCustomRange('2026-04-15', today), 'custom:2026-04-15')
  assert.equal(parseCustomStartDate('custom:2026-04-15', today), '2026-04-15')
  assert.equal(isCustomRange('custom:2026-04-15'), true)
})

test('rejects malformed, impossible, and future custom dates', () => {
  assert.equal(parseCustomStartDate('custom:2026-2-01', today), null)
  assert.equal(parseCustomStartDate('custom:2026-02-30', today), null)
  assert.equal(parseCustomStartDate('custom:2026-08-03', today), null)
  assert.equal(buildCustomRange('not-a-date', today), null)
})
