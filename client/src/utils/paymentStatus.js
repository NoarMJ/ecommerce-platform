export function hasInitiatedPayment(status) {
  return status?.latestPayment?.status === 'initiated'
}

// Which screen the payment page shows. The server's status decides; the
// browser only chooses between "waiting" and "pending" for an unresolved
// prompt (stoppedWaiting), and never decides that a payment succeeded.
//   paid     -> go to the confirmation page
//   expired  -> order cancelled before payment; no resend
//   review   -> money received but needs a manual check; no resend
//   waiting  -> prompt unresolved, spinner
//   pending  -> prompt unresolved, customer stopped waiting; no resend
//   failed   -> no unresolved prompt (failed, cancelled or none yet); resend allowed
export function getPaymentView(status, stoppedWaiting) {
  if (!status) return 'loading'
  if (status.paymentStatus === 'paid') return 'paid'
  if (status.orderStatus === 'cancelled') return 'expired'
  if (status.latestPayment?.status === 'needs_review') return 'review'
  if (status.latestPayment?.status === 'cancelled') return 'cancelled'
  if (hasInitiatedPayment(status)) return stoppedWaiting ? 'pending' : 'waiting'
  return 'failed'
}

const RETRY_HINT = 'Your order is saved; send another prompt when you are ready.'

// M-Pesa result codes the customer can act on.
const FAILURE_MESSAGES = {
  1032: {
    title: 'Payment cancelled',
    message: `The M-Pesa prompt was cancelled on the phone. ${RETRY_HINT}`,
  },
  1037: {
    title: 'Payment timed out',
    message: `The phone did not respond to the M-Pesa prompt in time. Make sure it is on, unlocked and has signal. ${RETRY_HINT}`,
  },
  1019: {
    title: 'Payment timed out',
    message: `The M-Pesa prompt expired before it was completed. ${RETRY_HINT}`,
  },
  1: {
    title: 'Not enough M-Pesa balance',
    message: 'The M-Pesa account does not have enough funds for this order. Top up, or use a different number, then send another prompt.',
  },
  2001: {
    title: 'Wrong M-Pesa PIN',
    message: `The PIN entered on the prompt was incorrect. ${RETRY_HINT}`,
  },
  1001: {
    title: 'Phone is busy',
    message: 'Another M-Pesa transaction is in progress on this phone. Wait a minute, then send another prompt.',
  },
}

// Heading and explanation for a payment attempt that ended without paying.
export function describePaymentFailure(latestPayment) {
  if (!latestPayment) {
    return { title: 'Payment not complete', message: 'Your order is saved. Send an M-Pesa prompt to finish paying.' }
  }

  const known = FAILURE_MESSAGES[latestPayment.resultCode]
  if (known) return known

  if (latestPayment.status === 'cancelled') return FAILURE_MESSAGES[1032]

  // No result code: the prompt was never delivered to the phone.
  if (latestPayment.status === 'failed' && latestPayment.resultCode == null) {
    return {
      title: 'Prompt not sent',
      message: `We could not send the M-Pesa prompt to the phone. ${RETRY_HINT}`,
    }
  }

  return {
    title: 'Payment not complete',
    message: `The M-Pesa payment did not complete. ${RETRY_HINT}`,
  }
}
