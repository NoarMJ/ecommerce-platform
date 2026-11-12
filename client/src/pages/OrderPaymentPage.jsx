import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  useGetOrderByIdQuery,
  usePayOrderWithMpesaMutation,
  useReconcileMpesaReceiptMutation,
} from '../services/api'
import { formatPrice } from '../utils/formatPrice'
import { hasInitiatedPayment, shouldWaitForPayment } from '../utils/paymentStatus'
import { usePaymentSocket } from '../hooks/usePaymentSocket'

const PHONE_PATTERN = /^(?:\+?254|0)[17]\d{8}$/

export default function OrderPaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()

  const [phone, setPhone] = useState(state?.phone ?? '')
  const [phoneError, setPhoneError] = useState('')
  const [retryError, setRetryError] = useState(state?.promptError ?? '')
  const [stoppedWaiting, setStoppedWaiting] = useState(false)
  const [receiptCode, setReceiptCode] = useState('')
  const [receiptError, setReceiptError] = useState('')
  const [receiptCheckError, setReceiptCheckError] = useState('')
  const [receiptCheckStarted, setReceiptCheckStarted] = useState(false)
  const {
    connected: socketConnected,
    status,
    connectionError,
    refreshStatus,
    startPromptSession,
    finishPromptSession,
  } = usePaymentSocket(orderId)

  const { data: order, refetch: refetchOrder } = useGetOrderByIdQuery(orderId)
  const [payOrderWithMpesa, { isLoading: isSending }] = usePayOrderWithMpesaMutation()
  const [reconcileMpesaReceipt, { isLoading: isVerifyingReceipt }] = useReconcileMpesaReceiptMutation()

  const paid = status?.paymentStatus === 'paid'
  const latest = status?.latestPayment
  const isWaiting = shouldWaitForPayment(status, retryError, stoppedWaiting)
  const paymentInitiated = hasInitiatedPayment(status)
  const stoppedPending = paymentInitiated && stoppedWaiting
  // Stopping the spinner does not cancel the provider request. Let the user
  // attempt the same retry action from this state, while the server still
  // rejects it until the outstanding attempt has a confirmed terminal result.
  const canRetry = (!paymentInitiated || stoppedPending) && !paid
  const reconciliationStatus = latest?.reconciliationStatus
  const receiptCheckPending = isVerifyingReceipt || receiptCheckStarted || reconciliationStatus === 'pending'

  useEffect(() => {
    if (reconciliationStatus && reconciliationStatus !== 'pending') {
      setReceiptCheckStarted(false)
    }
  }, [reconciliationStatus])

  // Payment confirmed: go to the confirmation page.
  useEffect(() => {
    if (!paid) return
    refetchOrder()
    navigate(`/orders/${orderId}/confirmation`, { replace: true })
  }, [paid, navigate, orderId, refetchOrder])

  const handleRetry = async () => {
    setRetryError('')
    setPhoneError('')
    setStoppedWaiting(false)

    if (phone.trim() && !PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) {
      setPhoneError('Enter a valid Safaricom number, e.g. 0712345678')
      return
    }

    if (!phone.trim()) {
      setPhoneError('Enter the number that should receive the prompt')
      return
    }

    try {
      // Join the order room before asking the server to send another prompt.
      await startPromptSession()
      await payOrderWithMpesa({ orderId, phone }).unwrap()
      try {
        await refreshStatus()
        finishPromptSession()
      } catch {
        // Keep the socket open if the request was accepted but its status ack
        // was lost; reconnect will read the current DB state again.
        finishPromptSession(false)
      }
    } catch (error) {
      try {
        const latestStatus = await refreshStatus()
        // Keep the retry action available when the server correctly refuses
        // a second prompt because the first attempt is still unresolved.
        if (hasInitiatedPayment(latestStatus)) setStoppedWaiting(true)
      } catch {
        // The original prompt error is more useful if the socket is unavailable.
      }
      finishPromptSession()
      setRetryError(
        error?.data?.message ?? error?.message ?? 'We could not send the M-Pesa prompt. Please try again.'
      )
    }
  }

  const handleReceiptVerification = async () => {
    const cleanReceipt = receiptCode.trim().toUpperCase()
    setReceiptError('')
    setReceiptCheckError('')
    if (!/^[A-Z0-9]{8,12}$/.test(cleanReceipt)) {
      setReceiptError('Enter the receipt code from your M-Pesa confirmation message.')
      return
    }

    try {
      await startPromptSession()
      setReceiptCheckStarted(true)
      await reconcileMpesaReceipt({ orderId, receipt: cleanReceipt }).unwrap()
      setReceiptCheckStarted(false)
    } catch (error) {
      setReceiptCheckStarted(false)
      setReceiptCheckError(error?.data?.message ?? error?.message ?? 'We could not check this receipt. Please try again.')
    } finally {
      finishPromptSession(false)
    }
  }

  if (!status) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        {connectionError ? (
          <Alert severity="warning">{connectionError}</Alert>
        ) : (
          <CircularProgress />
        )}
      </Container>
    )
  }

  // Only M-Pesa orders that are still unpaid belong on this page.
  if (status.paymentMethod !== 'mpesa' || status.orderStatus === 'cancelled') {
    return <Navigate to={`/orders/${orderId}/confirmation`} replace />
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          {!socketConnected && (connectionError || latest?.status === 'initiated') && (
            <Alert severity="warning" sx={{ width: '100%' }}>
              {connectionError || 'Reconnecting to live payment updates…'}
            </Alert>
          )}

          {isWaiting ? (
            <>
              <CircularProgress size={48} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Check your phone
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Enter your M-Pesa PIN on the prompt to pay{' '}
                  <strong>{order ? formatPrice(order.totalMinor) : ''}</strong>.
                  This page updates by itself once the payment is received.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setStoppedWaiting(true)}
              >
                Stop waiting
              </Button>
            </>
          ) : (
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {stoppedPending
                  ? 'Payment is still pending'
                  : latest?.status === 'needs_review'
                    ? 'We are checking your payment'
                    : 'Payment not complete'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {stoppedPending
                  ? 'The loading screen is stopped, but no final payment result has arrived. If you accepted the prompt, payment may still complete; this page will update if M-Pesa responds.'
                  : latest?.status === 'needs_review'
                  ? 'Your payment was received but needs a quick manual check. Please contact us with your order number.'
                  : latest?.status === 'cancelled'
                    ? 'The M-Pesa prompt was cancelled. Your order is saved; send another prompt when you are ready.'
                    : latest?.status === 'failed'
                      ? 'The M-Pesa payment did not complete. Your order is saved; send another prompt when you are ready.'
                      : 'Your order is saved. Send a new M-Pesa prompt to finish paying.'}
              </Typography>
            </Box>
          )}

          {stoppedPending && (
            <Alert severity="warning" sx={{ width: '100%', textAlign: 'left' }}>
              The previous M-Pesa prompt has no confirmed result yet. Check its status before trying again.
            </Alert>
          )}

          {paymentInitiated && !paid && (
            <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'left' }}>
              {receiptCheckPending ? (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Safaricom is checking receipt {latest?.reconciliationReceipt || receiptCode.trim().toUpperCase()}. We’ll update this order when the result arrives.
                </Alert>
              ) : reconciliationStatus === 'verified' ? (
                <Alert severity="success" sx={{ width: '100%' }}>Safaricom confirmed the payment.</Alert>
              ) : reconciliationStatus === 'not_found' ? (
                <Alert severity="warning" sx={{ width: '100%' }}>Safaricom could not find that receipt. Check the code and try again.</Alert>
              ) : reconciliationStatus === 'mismatch' ? (
                <Alert severity="error" sx={{ width: '100%' }}>Safaricom found a transaction, but its details did not match this order. The order has not been marked paid.</Alert>
              ) : reconciliationStatus === 'failed' ? (
                <Alert severity="warning" sx={{ width: '100%' }}>Safaricom could not complete the status check. You can try checking the receipt again.</Alert>
              ) : null}

              <TextField
                label="M-Pesa receipt code"
                value={receiptCode}
                onChange={(event) => setReceiptCode(event.target.value.toUpperCase().replace(/\s/g, ''))}
                error={!!receiptError}
                helperText={receiptError || 'For example, the code in the M-Pesa payment confirmation SMS.'}
                placeholder="QHX7ABC123"
                inputProps={{ maxLength: 12, autoCapitalize: 'characters' }}
                disabled={isVerifyingReceipt}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleReceiptVerification}
                disabled={isVerifyingReceipt}
                startIcon={receiptCheckPending ? <CircularProgress size={16} /> : undefined}
              >
                {isVerifyingReceipt ? 'Sending verification request…' : reconciliationStatus === 'pending' ? 'Check receipt status again' : 'Verify M-Pesa payment'}
              </Button>
              {receiptCheckError && <Alert severity="error">{receiptCheckError}</Alert>}
            </Stack>
          )}

          {order && (
            <Typography variant="body2" color="text.secondary">
              Order {order.orderNumber}
            </Typography>
          )}

          {retryError && retryError !== 'The previous M-Pesa prompt has no confirmed result yet. Check its status before trying again.' && (
            <Alert severity="error" sx={{ width: '100%' }}>{retryError}</Alert>
          )}

          {canRetry && latest?.status !== 'needs_review' && (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <TextField
                label="M-Pesa phone number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={!!phoneError}
                helperText={phoneError}
                placeholder="0712345678"
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleRetry}
                disabled={isSending}
              >
                {isSending ? 'Sending prompt…' : 'Send M-Pesa prompt again'}
              </Button>
            </Stack>
          )}

          <Button component={Link} to="/my-orders" color="inherit">
            Pay later from my orders
          </Button>
        </Stack>
      </Paper>
    </Container>
  )
}
