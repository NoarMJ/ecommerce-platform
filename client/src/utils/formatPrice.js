export function formatPrice(priceMinor = 0) {
  return `KSh ${(priceMinor / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}