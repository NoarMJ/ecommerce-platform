import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPrice } from '../src/utils/formatPrice.js'

test('formats minor currency units as Kenyan shillings', () => {
  assert.equal(formatPrice(123456), 'KSh 1,234.56')
  assert.equal(formatPrice(0), 'KSh 0.00')
})

test('defaults an omitted price to zero', () => {
  assert.equal(formatPrice(), 'KSh 0.00')
})
