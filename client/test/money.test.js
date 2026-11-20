import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMinor, fromMinor, toMinor } from '../src/utils/money.js'

test('converts and formats minor currency units', () => {
  assert.equal(formatMinor(123456), 'KSh 1,234.56')
  assert.equal(fromMinor(123456), '1234.56')
  assert.equal(toMinor('1234.56'), 123456)
})

test('rejects invalid or non-positive prices', () => {
  assert.equal(toMinor(''), null)
  assert.equal(toMinor('invalid'), null)
  assert.equal(toMinor('0'), null)
  assert.equal(toMinor('-1'), null)
})
