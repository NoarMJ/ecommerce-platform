import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useGetMyOrdersQuery } from '../services/api'
import { formatPrice } from '../utils/formatPrice'

export default function MyOrdersPage() {
  const { data: orders = [], isLoading, isError } = useGetMyOrdersQuery()

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (isError) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">We couldn’t load your orders. Please refresh.</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        My orders
      </Typography>

      {orders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">You haven’t placed any orders yet</Typography>
          <Button component={Link} to="/products" variant="contained" sx={{ mt: 2 }}>
            Browse products
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {orders.map((order) => (
            <Paper key={order._id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography fontWeight={700}>{order.orderNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(order.createdAt).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip label={order.orderStatus} color="primary" size="small" />
                    <Chip label={`Payment: ${order.paymentStatus}`} size="small" variant="outlined" />
                  </Stack>
                </Stack>

                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                  <Typography fontWeight={700}>{formatPrice(order.totalMinor)}</Typography>
                  <Button
                    component={Link}
                    to={`/orders/${order._id}/confirmation`}
                    size="small"
                  >
                    View details
                  </Button>
                  {order.paymentMethod === 'mpesa' &&
                    order.paymentStatus === 'pending' &&
                    order.orderStatus !== 'cancelled' && (
                        <Button
                        component={Link}
                        to={`/orders/${order._id}/payment`}
                        size="small"
                        variant="contained"
                        >
                        Pay now
                        </Button>
                    )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  )
}