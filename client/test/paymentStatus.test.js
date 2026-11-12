import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasInitiatedPayment,
  shouldWaitForPayment,
} from '../src/utils/paymentStatus.js'

test('keeps the order socket open while an M-Pesa request is initiated', () => {
  assert.equal(
    hasInitiatedPayment({ latestPayment: { status: 'initiated' } }),
    true
  )
})

test('closes the order socket when no M-Pesa request remains initiated', () => {
  for (const status of ['cancelled', 'failed', 'succeeded', null]) {
    assert.equal(
      hasInitiatedPayment(status ? { latestPayment: { status } } : null),
      false
    )
  }
})

test('manual stop ends the spinner without changing the initiated payment state', () => {
  const status = { latestPayment: { status: 'initiated' } }

  assert.equal(shouldWaitForPayment(status, '', false), true)
  assert.equal(shouldWaitForPayment(status, '', true), false)
  assert.equal(hasInitiatedPayment(status), true)
})
