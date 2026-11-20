import test from 'node:test'
import assert from 'node:assert/strict'
import {
  describePaymentFailure,
  getPaymentView,
  hasInitiatedPayment,
} from '../src/utils/paymentStatus.js'

const withPayment = (paymentStatus, extra = {}) => ({
  paymentStatus: 'pending',
  orderStatus: 'pending',
  latestPayment: paymentStatus ? { status: paymentStatus } : null,
  ...extra,
})

test('an unresolved prompt shows waiting, or pending once the customer stops waiting', () => {
  assert.equal(getPaymentView(withPayment('initiated'), false), 'waiting')
  assert.equal(getPaymentView(withPayment('initiated'), true), 'pending')
})

test('resend is only offered once the last prompt is resolved', () => {
  for (const status of ['failed', 'cancelled', null]) {
    assert.equal(getPaymentView(withPayment(status), false), 'failed')
  }
})

test('paid, expired and needs-review take priority and never offer resend', () => {
  assert.equal(getPaymentView(withPayment('succeeded', { paymentStatus: 'paid' }), false), 'paid')
  assert.equal(getPaymentView(withPayment('initiated', { orderStatus: 'cancelled' }), false), 'expired')
  assert.equal(getPaymentView(withPayment('needs_review'), false), 'review')
  assert.equal(getPaymentView(null, false), 'loading')
})

test('tells the customer which way an M-Pesa prompt failed', () => {
  assert.equal(describePaymentFailure({ status: 'cancelled', resultCode: 1032 }).title, 'Payment cancelled')
  assert.equal(describePaymentFailure({ status: 'failed', resultCode: 1037 }).title, 'Payment timed out')
  assert.equal(describePaymentFailure({ status: 'failed', resultCode: 1 }).title, 'Not enough M-Pesa balance')
  assert.equal(describePaymentFailure({ status: 'failed', resultCode: 2001 }).title, 'Wrong M-Pesa PIN')
  assert.equal(describePaymentFailure({ status: 'failed' }).title, 'Prompt not sent')
  assert.equal(describePaymentFailure({ status: 'failed', resultCode: 9999 }).title, 'Payment not complete')
  assert.equal(describePaymentFailure(null).title, 'Payment not complete')
})

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

