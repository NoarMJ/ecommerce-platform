import { formatPrice } from './formatPrice.js'

export function formatMinor(amount) {
  return formatPrice(amount)
}

export function fromMinor(amount) {
  const value = Number(amount)
  return Number.isFinite(value) ? (value / 100).toFixed(2) : ''
}

export function toMinor(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return null

  const minor = Math.round(value * 100)
  return Number.isSafeInteger(minor) ? minor : null
}
