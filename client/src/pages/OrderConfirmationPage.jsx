import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { useGetOrderByIdQuery } from '../services/api'
import { formatPrice } from '../utils/formatPrice'

const PAYMENT_LABELS = { cash_on_delivery: 'Cash on delivery' }

function ConfirmationSkeleton() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Stack alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={56} height={56} />
          <Skeleton variant="text" width="60%" height={44} />
          <Skeleton variant="text" width="40%" />
        </Stack>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Skeleton variant="rounded" width={110} height={24} />
            <Skeleton variant="rounded" width={110} height={24} />
          </Stack>
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="70%" />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Skeleton variant="text" width="30%" height={32} />
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="80%" />
        </Paper>
      </Stack>
    </Container>
  )
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId)

  if (isLoading) {
    return <ConfirmationSkeleton />
  }

  if (isError || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">We couldn’t find this order.</Alert>
        <Button component={Link} to="/my-orders" sx={{ mt: 2 }}>
          View my orders
        </Button>
      </Container>
    )
  }

  const { shippingAddress: a } = order

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        {/* Success header */}
        <Box sx={{ textAlign: 'center' }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 56,
              height: 56,
              mx: 'auto',
              borderRadius: '50%',
              bgcolor: 'success.main',
              color: 'success.contrastText',
              display: 'grid',
              placeItems: 'center',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            ✓
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 2 }}>
            Thank you for your order
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Your order reference is <strong>{order.orderNumber}</strong>
          </Typography>
        </Box>

        {/* Items and totals */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Chip label={`Order: ${order.orderStatus}`} color="primary" size="small" />
            <Chip label={`Payment: ${order.paymentStatus}`} size="small" />
            <Chip
              label={PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack spacing={1.5}>
            {order.items.map((item) => (
              <Stack
                key={item.product}
                direction="row"
                justifyContent="space-between"
                spacing={2}
              >
                <Typography variant="body2">
                  {item.name} × {item.quantity}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatPrice(item.lineTotalMinor)}
                </Typography>
              </Stack>
            ))}

            <Divider />

            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography>{formatPrice(order.subtotalMinor)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Delivery</Typography>
              <Typography>{formatPrice(order.shippingFeeMinor)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatPrice(order.totalMinor)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Delivery details */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Delivering to
          </Typography>
          <Typography>{a.fullName}</Typography>
          <Typography color="text.secondary">{a.phone}</Typography>
          <Typography color="text.secondary">
            {[a.addressLine1, a.addressLine2, a.city, a.county, a.postalCode]
              .filter(Boolean)
              .join(', ')}
          </Typography>
          {order.customerNote && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Note: {order.customerNote}
            </Typography>
          )}
        </Paper>

        {/* Actions */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
        >
          <Button component={Link} to="/my-orders" variant="contained">
            View my orders
          </Button>
          <Button component={Link} to="/products" variant="outlined">
            Continue shopping
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}