import test from 'node:test'
import assert from 'node:assert/strict'
import { getLoginDestination } from '../src/utils/loginDestination.js'

test('sends an admin to the admin dashboard after login by default', () => {
  assert.equal(getLoginDestination({ role: 'admin' }), '/admin')
})

test('returns a customer to the storefront after login by default', () => {
  assert.equal(getLoginDestination({ role: 'customer' }), '/')
})

test('preserves the protected route the user originally requested', () => {
  assert.equal(getLoginDestination({ role: 'admin' }, '/admin/orders'), '/admin/orders')
})
