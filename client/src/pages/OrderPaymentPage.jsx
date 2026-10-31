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
import { usePaymentSocket } from '../hooks/usePaymentSocket'
import { formatPrice } from '../utils/formatPrice'

const PHONE_PATTERN = /^(?:\+?254|0)[17]\d{8}$/
const STOP_WAITING_AFTER_MS = 2 * 60 * 1000
const POLL_EVERY_MS = 3000

const FINAL_PAYMENT_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
  'needs_review',
]

export default function OrderPaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()

  const [phone, setPhone] = useState(state?.phone ?? '')
  const [phoneError, setPhoneError] = useState('')
  const [retryError, setRetryError] = useState(state?.promptError ?? '')
  const [now, setNow] = useState(() => Date.now())
  const [pollingInterval, setPollingInterval] = useState(POLL_EVERY_MS)

  // Subscribe to real-time updates for this order.
  const { isLive } = usePaymentSocket(orderId)

  const { data: order } = useGetOrderByIdQuery(orderId)

  const {
    data: status,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetPaymentStatusQuery(orderId)

  const [payOrderWithMpesa, { isLoading: isSending }] =
    usePayOrderWithMpesaMutation()

  // Update the current time so the payment timeout can be detected.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)

    return () => clearInterval(timer)
  }, [])

  const paid = status?.paymentStatus === 'paid'
  const latest = status?.latestPayment

  const startedAt = latest?.startedAt
    ? new Date(latest.startedAt).getTime()
    : 0

  const waitedTooLong =
    latest?.status === 'initiated' &&
    startedAt > 0 &&
    now - startedAt > STOP_WAITING_AFTER_MS

  const isWaiting =
    latest?.status === 'initiated' &&
    !waitedTooLong &&
    !retryError

  // Do not offer another payment prompt for a payment already received
  // or one that requires manual verification.
  const canRetry =
    !isWaiting &&
    !paid &&
    latest?.status !== 'succeeded' &&
    latest?.status !== 'needs_review'

  // Stop polling when the payment reaches a final state or times out.
  const isFinal =
    paid || FINAL_PAYMENT_STATUSES.includes(latest?.status)

  const shouldPoll = !isFinal && !waitedTooLong

  useEffect(() => {
    setPollingInterval(shouldPoll ? POLL_EVERY_MS : 0)
  }, [shouldPoll])

  // Payment confirmed: redirect to the order confirmation page.
  useEffect(() => {
    if (paid) {
      navigate(`/orders/${orderId}/confirmation`, { replace: true })
    }
  }, [paid, navigate, orderId])

  const handleRetry = async () => {
    setRetryError('')
    setPhoneError('')

    const normalizedPhone = phone.replace(/[\s-]/g, '')

    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setPhoneError('Enter a valid Safaricom number, e.g. 0712345678')
      return
    }

    try {
      await payOrderWithMpesa({
        orderId,
        phone: normalizedPhone,
      }).unwrap()

      setNow(Date.now())
    } catch (error) {
      setRetryError(
        error?.data?.message ??
          'We could not send the M-Pesa prompt. Please try again.'
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
        <Alert severity="error">
          We couldn't find this order.
        </Alert>

        <Button component={Link} to="/my-orders" sx={{ mt: 2 }}>
          View my orders
        </Button>
      </Container>
    )
  }

  // Only unpaid M-Pesa orders belong on this page.
  if (
    status.paymentMethod !== 'mpesa' ||
    status.orderStatus === 'cancelled'
  ) {
    return (
      <Navigate
        to={`/orders/${orderId}/confirmation`}
        replace
      />
    )
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
                  <strong>
                    {order ? formatPrice(order.totalMinor) : ''}
                  </strong>.
                  This page updates automatically once the payment is received.
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
                    : latest?.status === 'succeeded'
                      ? 'Payment received'
                      : 'Payment not completed'}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {latest?.status === 'needs_review'
                  ? 'Your payment was received but needs a manual check. Please contact us with your order number.'
                  : latest?.status === 'succeeded'
                    ? 'Your payment was received. Your order is being updated.'
                    : 'Your order is saved. Send a new M-Pesa prompt to finish paying.'}
              </Typography>
            </Box>
          )}

          {order && (
            <Typography variant="body2" color="text.secondary">
              Order {order.orderNumber}
            </Typography>
          )}

          {retryError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {retryError}
            </Alert>
          )}

          {/* Manual check remains available after the waiting timeout. */}
          {waitedTooLong && (
            <Button
              variant="outlined"
              onClick={refetch}
              disabled={isFetching}
            >
              {isFetching ? 'Checking...' : 'I have paid – check again'}
            </Button>
          )}

          {canRetry && (
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
                {isSending
                  ? 'Sending prompt...'
                  : 'Send M-Pesa prompt again'}
              </Button>
            </Stack>
          )}

          <Button
            component={Link}
            to="/my-orders"
            color="inherit"
          >
            Pay later from my orders
          </Button>

        </Stack>
      </Paper>
    </Container>
  )
}