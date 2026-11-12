export function hasInitiatedPayment(status) {
  return status?.latestPayment?.status === 'initiated'
}

export function shouldWaitForPayment(status, retryError, stoppedWaiting) {
  return hasInitiatedPayment(status) && !retryError && !stoppedWaiting
}
