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
  useGetPaymentStatusQuery,
  usePayOrderWithMpesaMutation,
} from '../services/api'
import { formatPrice } from '../utils/formatPrice'

const PHONE_PATTERN = /^(?:\+?254|0)[17]\d{8}$/
const STOP_WAITING_AFTER_MS = 2 * 60 * 1000

export default function OrderPaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()

  const [phone, setPhone] = useState(state?.phone ?? '')
  const [phoneError, setPhoneError] = useState('')
  const [retryError, setRetryError] = useState(state?.promptError ?? '')
  const [now, setNow] = useState(() => Date.now())

  const { data: order } = useGetOrderByIdQuery(orderId)
  const { data: status, isLoading, isError } = useGetPaymentStatusQuery(orderId, {
    pollingInterval: 3000,
  })
  const [payOrderWithMpesa, { isLoading: isSending }] = usePayOrderWithMpesaMutation()

  // Lets us notice when we have waited too long.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  const paid = status?.paymentStatus === 'paid'

  // Payment confirmed: go to the confirmation page.
  useEffect(() => {
    if (paid) navigate(`/orders/${orderId}/confirmation`, { replace: true })
  }, [paid, navigate, orderId])

  const latest = status?.latestPayment
  const startedAt = latest ? new Date(latest.startedAt).getTime() : 0
  const waitedTooLong = latest?.status === 'initiated' && now - startedAt > STOP_WAITING_AFTER_MS
  const isWaiting = latest?.status === 'initiated' && !waitedTooLong && !retryError
  const canRetry = !isWaiting && !paid

  const handleRetry = async () => {
    setRetryError('')
    setPhoneError('')

    if (phone.trim() && !PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) {
      setPhoneError('Enter a valid Safaricom number, e.g. 0712345678')
      return
    }

    if (!phone.trim()) {
      setPhoneError('Enter the number that should receive the prompt')
      return
    }

    try {
      await payOrderWithMpesa({ orderId, phone }).unwrap()
      setNow(Date.now())
    } catch (error) {
      setRetryError(
        error?.data?.message ?? 'We could not send the M-Pesa prompt. Please try again.'
      )
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (isError || !status) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">We couldn’t find this order.</Alert>
        <Button component={Link} to="/my-orders" sx={{ mt: 2 }}>
          View my orders
        </Button>
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
            </>
          ) : (
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {latest?.status === 'cancelled'
                  ? 'Payment cancelled'
                  : latest?.status === 'needs_review'
                    ? 'We are checking your payment'
                    : 'Payment not completed'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {latest?.status === 'needs_review'
                  ? 'Your payment was received but needs a quick manual check. Please contact us with your order number.'
                  : 'Your order is saved. Send a new M-Pesa prompt to finish paying.'}
              </Typography>
            </Box>
          )}

          {order && (
            <Typography variant="body2" color="text.secondary">
              Order {order.orderNumber}
            </Typography>
          )}

          {retryError && <Alert severity="error" sx={{ width: '100%' }}>{retryError}</Alert>}

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