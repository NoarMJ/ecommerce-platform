import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'

import {
  useGetAdminOrdersQuery,
  useGetAdminOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
} from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'

// ---------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'default',
}

const PAYMENT_COLORS = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'default',
}

// Must match NEXT_STATUS on the backend.
const NEXT_STATUS = {
  pending: { status: 'processing', label: 'Mark as processing' },
  processing: { status: 'shipped', label: 'Mark as shipped' },
  shipped: { status: 'delivered', label: 'Mark as delivered' },
}

const CANCELLABLE = ['pending', 'processing']

const PAYMENT_METHOD_LABELS = { cash_on_delivery: 'Cash on delivery' }

function getErrorMessage(error) {
  return (
    error?.data?.message ||
    error?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

function hasPermission(user, permission) {
  if (user?.isPrimaryAdmin === true) return true

  return (
    Array.isArray(user?.permissions) &&
    user.permissions.includes(permission)
  )
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCustomerName(order) {
  const customer = order.user
  const accountName =
    customer?.name ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')

  return accountName || order.shippingAddress?.fullName || 'Customer'
}

// ---------------------------------------------------------
// Order details dialog
// ---------------------------------------------------------

function OrderDetailsDialog({
  orderId,
  canUpdate,
  onClose,
  onNotice,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false)

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useGetAdminOrderByIdQuery(orderId, { skip: !orderId })

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation()
  const [cancelOrder, { isLoading: isCancelling }] =
    useCancelOrderMutation()

  const isBusy = isUpdating || isCancelling
  const next = order ? NEXT_STATUS[order.orderStatus] : null
  const canCancel = order && CANCELLABLE.includes(order.orderStatus)

  const handleAdvance = async () => {
    try {
      await updateOrderStatus({
        id: order._id,
        status: next.status,
      }).unwrap()

      onNotice({
        type: 'success',
        message: `Order ${order.orderNumber} is now ${next.status}.`,
      })
    } catch (err) {
      onNotice({ type: 'error', message: getErrorMessage(err) })
    }
  }

  const handleCancel = async () => {
    try {
      await cancelOrder(order._id).unwrap()

      setConfirmCancel(false)
      onNotice({
        type: 'success',
        message: `Order ${order.orderNumber} was cancelled and its stock restored.`,
      })
    } catch (err) {
      setConfirmCancel(false)
      onNotice({ type: 'error', message: getErrorMessage(err) })
    }
  }

  const address = order?.shippingAddress

  return (
    <>
      <Dialog
        open={Boolean(orderId)}
        onClose={isBusy ? undefined : onClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {order ? `Order ${order.orderNumber}` : 'Order details'}
            </Typography>

            {order && (
              <Typography variant="body2" color="text.secondary">
                Placed {formatDateTime(order.createdAt)}
              </Typography>
            )}
          </Box>

          <IconButton
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close order details"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent>
          {isLoading ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Loading order...
              </Typography>
            </Stack>
          ) : isError || !order ? (
            <Alert severity="error">{getErrorMessage(error)}</Alert>
          ) : (
            <Stack spacing={3}>
              {/* Status */}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
              >
                <Chip
                  label={`Order: ${order.orderStatus}`}
                  color={STATUS_COLORS[order.orderStatus]}
                  size="small"
                />
                <Chip
                  label={`Payment: ${order.paymentStatus}`}
                  color={PAYMENT_COLORS[order.paymentStatus]}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={
                    PAYMENT_METHOD_LABELS[order.paymentMethod] ??
                    order.paymentMethod
                  }
                  variant="outlined"
                  size="small"
                />
              </Stack>

              {/* Customer and delivery */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Customer account
                  </Typography>
                  <Typography variant="body2">
                    {getCustomerName(order)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {order.user?.email ?? '—'}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Deliver to
                  </Typography>
                  <Typography variant="body2">{address.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {address.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[
                      address.addressLine1,
                      address.addressLine2,
                      address.city,
                      address.county,
                      address.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Typography>
                </Paper>
              </Box>

              {order.customerNote && (
                <Alert severity="info" icon={false}>
                  <strong>Customer note:</strong> {order.customerNote}
                </Alert>
              )}

              {/* Items */}
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell align="right">Unit price</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.product}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.sku || '—'}</TableCell>
                          <TableCell align="right">
                            {formatPrice(item.unitPriceMinor)}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatPrice(item.lineTotalMinor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider />

                <Stack spacing={0.75} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Subtotal</Typography>
                    <Typography>{formatPrice(order.subtotalMinor)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Delivery</Typography>
                    <Typography>
                      {formatPrice(order.shippingFeeMinor)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>Total</Typography>
                    <Typography fontWeight={700}>
                      {formatPrice(order.totalMinor)}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              {/* History */}
              {order.statusHistory?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Status history
                  </Typography>

                  <Stack spacing={0.75}>
                    {[...order.statusHistory].reverse().map((entry, index) => (
                      <Stack
                        key={`${entry.status}-${entry.changedAt}-${index}`}
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                      >
                        <Chip
                          label={entry.status}
                          color={STATUS_COLORS[entry.status]}
                          size="small"
                          sx={{ minWidth: 96 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(entry.changedAt)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {canUpdate && next?.status === 'delivered' &&
                order.paymentMethod === 'cash_on_delivery' && (
                  <Alert severity="info">
                    Marking this order as delivered also marks the cash
                    payment as paid.
                  </Alert>
                )}
            </Stack>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          {canUpdate && order && canCancel && (
            <Button
              color="error"
              onClick={() => setConfirmCancel(true)}
              disabled={isBusy}
            >
              Cancel order
            </Button>
          )}

          <Box sx={{ flex: 1 }} />

          <Button color="inherit" onClick={onClose} disabled={isBusy}>
            Close
          </Button>

          {canUpdate && order && next && (
            <Button
              variant="contained"
              onClick={handleAdvance}
              disabled={isBusy}
              startIcon={
                isUpdating ? (
                  <CircularProgress size={18} color="inherit" />
                ) : null
              }
            >
              {isUpdating ? 'Updating...' : next.label}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog
        open={confirmCancel}
        onClose={() => {
          if (!isCancelling) setConfirmCancel(false)
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel this order?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {`Order ${order?.orderNumber ?? ''} will be cancelled and the items will be returned to stock. This cannot be undone.`}
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            color="inherit"
            onClick={() => setConfirmCancel(false)}
            disabled={isCancelling}
          >
            Keep order
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel order'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------
// Main page
// ---------------------------------------------------------

export default function AdminOrders({ user }) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [notice, setNotice] = useState(null)

  const canUpdate = hasPermission(user, 'orders.update')

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetAdminOrdersQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  })

  const orders = Array.isArray(data?.orders) ? data.orders : []
  const total = data?.total ?? 0
  const counts = data?.counts ?? {}
  const allOrdersCount = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  )

  const handleSearch = (event) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(0)
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('all')
    setPage(0)
  }

  const getFilterCount = (value) =>
    value === 'all' ? allOrdersCount : counts[value] ?? 0

  return (
    <Stack spacing={3}>
      {/* Page heading */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Orders
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Review customer orders and manage their fulfilment.
          </Typography>
        </Box>

        <Tooltip title="Refresh orders">
          <span>
            <IconButton
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh orders"
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              {isFetching ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Notices */}
      {notice && (
        <Alert severity={notice.type} onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {getErrorMessage(error)}
        </Alert>
      )}

      {/* Status filters */}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {STATUS_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            label={`${filter.label} (${getFilterCount(filter.value)})`}
            color={status === filter.value ? 'primary' : 'default'}
            variant={status === filter.value ? 'filled' : 'outlined'}
            onClick={() => {
              setStatus(filter.value)
              setPage(0)
            }}
          />
        ))}
      </Stack>

      {/* Search */}
      <Paper
        component="form"
        onSubmit={handleSearch}
        variant="outlined"
        sx={{ p: 2, borderRadius: 3 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Search orders"
            placeholder="Order number, customer name or phone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained">
              Search
            </Button>

            <Button type="button" color="inherit" onClick={handleClearFilters}>
              Clear
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Orders table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
                    <CircularProgress size={30} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5 }}
                    >
                      Loading orders...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
                    <ReceiptLongOutlinedIcon
                      sx={{ fontSize: 42, color: 'text.disabled' }}
                    />

                    <Typography fontWeight={600} sx={{ mt: 1 }}>
                      No orders found
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {search || status !== 'all'
                        ? 'Try changing your search or filters.'
                        : 'Orders will appear here once customers check out.'}
                    </Typography>

                    {(search || status !== 'all') && (
                      <Button
                        size="small"
                        onClick={handleClearFilters}
                        sx={{ mt: 1 }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order._id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {order.orderNumber}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 170 }}>
                      <Typography variant="body2">
                        {getCustomerName(order)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.shippingAddress?.phone}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography variant="body2">
                        {formatDateTime(order.createdAt)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">{order.items.length}</TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatPrice(order.totalMinor)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={order.paymentStatus}
                        color={PAYMENT_COLORS[order.paymentStatus]}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={order.orderStatus}
                        color={STATUS_COLORS[order.orderStatus]}
                        size="small"
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="View order">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedOrderId(order._id)}
                          aria-label={`View order ${order.orderNumber}`}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />

        <TablePagination
          component="div"
          count={Number(total) || 0}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 20, 50]}
          showFirstButton
          showLastButton
        />
      </Paper>

      <OrderDetailsDialog
        key={selectedOrderId ?? 'closed'}
        orderId={selectedOrderId}
        canUpdate={canUpdate}
        onClose={() => setSelectedOrderId(null)}
        onNotice={setNotice}
      />
    </Stack>
  )
}