import { useState } from 'react'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'

import { useGetSellerOrdersQuery } from '../../services/sellerApi'
import { apiErrorMessage } from '../../utils/apiError'
import { formatMinor } from '../../utils/money'
import PageSpinner from '../../components/seller/PageSpinner'
import SellerStatusChip from '../../components/seller/SellerStatusChip'
import FulfilmentPanel from '../../components/seller/FulfilmentPanel'

const LIMIT = 10
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// Text follows light/dark mode; accents below are readable on both.
const INK = 'text.primary'
const MUTED = 'text.secondary'
const BORDER = '#ac9619'
const MINT = '#395852'

function Panel({ children, sx = {}, ...props }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        minWidth: 0,
        borderColor: BORDER,
        borderRadius: 2.5,
        boxShadow: '0 2px 10px rgba(29, 63, 54, 0.03)',
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}

function SummaryCard({ label, value, helper, icon }) {
  return (
    <Panel sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: MUTED, fontSize: '0.72rem', fontWeight: 650 }}>
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 0.65,
              color: INK,
              fontSize: '1.55rem',
              fontWeight: 850,
              letterSpacing: '-0.045em',
              lineHeight: 1.15,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Typography>
          <Typography sx={{ mt: 0.5, color: MUTED, fontSize: '0.68rem' }}>
            {helper}
          </Typography>
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#cad01c',
            color: '#061512',
            borderRadius: 1.5,
          }}
        >
          {icon}
        </Avatar>
      </Stack>
    </Panel>
  )
}

function formatOrderDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function DetailItem({ icon, label, children }) {
  return (
    <Stack direction="row" spacing={1.1} alignItems="flex-start">
      <Box sx={{ color: '#729087', mt: 0.1 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: MUTED, fontSize: '0.66rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.25, color: INK, fontSize: '0.76rem', lineHeight: 1.55 }}>
          {children || '—'}
        </Typography>
      </Box>
    </Stack>
  )
}

function OrderCard({ order }) {
  const shipping = order.shipping ?? {}
  const items = order.items ?? []
  const address = [
    shipping.addressLine1,
    shipping.addressLine2,
    shipping.city,
    shipping.county,
    shipping.postalCode,
  ].filter(Boolean).join(', ')

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: `1px solid ${BORDER}`,
        borderRadius: '10px !important',
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '& + &': { mt: 1.2 },
        '&.Mui-expanded': { my: 0, borderColor: '#a6b4af' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon sx={{ color: '#71827B' }} />}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.7,
          minHeight: 76,
          bgcolor: 'background.paper',
          '& .MuiAccordionSummary-content': { my: 1.2, minWidth: 0 },
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1, md: 2 }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ width: '100%', minWidth: 0, pr: 1 }}
        >
          <Box sx={{ minWidth: { md: 145 } }}>
            <Typography sx={{ color: INK, fontSize: '0.8rem', fontWeight: 800 }}>
              {order.orderNumber || 'Order'}
            </Typography>
            <Typography sx={{ mt: 0.25, color: MUTED, fontSize: '0.67rem' }}>
              {formatOrderDate(order.createdAt)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center">
            {/* This seller's own progress; the whole order may include other sellers */}
            <SellerStatusChip status={order.fulfilment?.status ?? order.orderStatus} />
            <SellerStatusChip status={order.paymentStatus} />
            <Chip
              size="small"
              variant="outlined"
              color={order.readyToFulfil ? 'success' : 'default'}
              label={order.readyToFulfil ? 'Ready to fulfil' : 'Not ready'}
              sx={{ height: 23, fontSize: '0.65rem', fontWeight: 650 }}
            />
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ textAlign: { xs: 'left', md: 'right' }, minWidth: 105 }}>
            <Typography sx={{ color: MUTED, fontSize: '0.65rem' }}>
              Your order total
            </Typography>
            <Typography sx={{ mt: 0.2, color: INK, fontSize: '0.9rem', fontWeight: 850 }}>
              {formatMinor(order.sellerSubtotalMinor)}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: { xs: 1.5, sm: 2.2 }, bgcolor: 'action.hover', borderTop: `1px solid ${BORDER}` }}>
        <Stack spacing={2.2}>
          {!order.readyToFulfil && (
            <Alert severity="info" sx={{ borderRadius: 1.8, fontSize: '0.76rem' }}>
              This order is not ready to fulfil yet. Wait until payment is confirmed and ensure the order has not been cancelled.
            </Alert>
          )}

          <FulfilmentPanel order={order} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Panel sx={{ p: 1.8, height: '100%', bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.7 }}>
                  <Avatar
                    variant="rounded"
                    sx={{ width: 30, height: 30, bgcolor: '#EAF8F4', color: '#279A82' }}
                  >
                    <PersonOutlineRoundedIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Typography sx={{ color: INK, fontSize: '0.78rem', fontWeight: 800 }}>
                    Customer and delivery
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  <DetailItem icon={<PersonOutlineRoundedIcon fontSize="small" />} label="Recipient">
                    {shipping.fullName}
                  </DetailItem>
                  <DetailItem icon={<LocalShippingOutlinedIcon fontSize="small" />} label="Phone">
                    {shipping.phone}
                  </DetailItem>
                  <DetailItem icon={<LocationOnOutlinedIcon fontSize="small" />} label="Delivery address">
                    {address}
                  </DetailItem>
                  {order.customerNote && (
                    <Box sx={{ p: 1.2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                      <Typography sx={{ color: MUTED, fontSize: '0.65rem', fontWeight: 750 }}>
                        CUSTOMER NOTE
                      </Typography>
                      <Typography sx={{ mt: 0.4, color: INK, fontSize: '0.75rem' }}>
                        {order.customerNote}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Panel>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Panel sx={{ p: 1.8, height: '100%', bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.7 }}>
                  <Avatar
                    variant="rounded"
                    sx={{ width: 30, height: 30, bgcolor: '#EAF8F4', color: '#279A82' }}
                  >
                    <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Typography sx={{ color: INK, fontSize: '0.78rem', fontWeight: 800 }}>
                    Order summary
                  </Typography>
                </Stack>
                <Stack spacing={1.1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Items in this order</Typography>
                    <Typography sx={{ color: INK, fontSize: '0.78rem', fontWeight: 750 }}>
                      {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ color: MUTED, fontSize: '0.72rem' }}>Different products</Typography>
                    <Typography sx={{ color: INK, fontSize: '0.78rem', fontWeight: 750 }}>
                      {items.length}
                    </Typography>
                  </Stack>
                  <Box sx={{ borderTop: `1px solid ${BORDER}`, pt: 1.2, mt: 0.3 }}>
                    <Typography sx={{ color: MUTED, fontSize: '0.68rem' }}>Your subtotal</Typography>
                    <Typography sx={{ mt: 0.25, color: INK, fontSize: '1.2rem', fontWeight: 850 }}>
                      {formatMinor(order.sellerSubtotalMinor)}
                    </Typography>
                  </Box>
                </Stack>
              </Panel>
            </Grid>
          </Grid>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.1 }}>
              <Inventory2OutlinedIcon sx={{ color: '#729087', fontSize: 19 }} />
              <Typography sx={{ color: INK, fontSize: '0.8rem', fontWeight: 800 }}>
                Items in this order
              </Typography>
              <Chip size="small" label={items.length} sx={{ height: 21, bgcolor: '#EEF4F1', color: '#52655E', fontSize: '0.65rem' }} />
            </Stack>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderColor: BORDER, borderRadius: 1.8, bgcolor: 'background.paper' }}
            >
              <Table size="small" aria-label={`Items for order ${order.orderNumber}`} sx={{ minWidth: 570 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {[
                      { label: 'Item', align: 'left' },
                      { label: 'SKU', align: 'left' },
                      { label: 'Qty', align: 'right' },
                      { label: 'Unit price', align: 'right' },
                      { label: 'Total', align: 'right' },
                    ].map((column) => (
                      <TableCell
                        key={column.label}
                        align={column.align}
                        sx={{
                          py: 1,
                          color: '#7C8985',
                          borderColor: BORDER,
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          letterSpacing: 0.35,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ py: 1.1, color: INK, fontSize: '0.73rem', fontWeight: 700, borderColor: BORDER }}>
                        {item.name}
                      </TableCell>
                      <TableCell sx={{ color: MUTED, fontSize: '0.7rem', borderColor: BORDER }}>
                        {item.sku || '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: INK, fontSize: '0.72rem', borderColor: BORDER }}>
                        {item.quantity}
                      </TableCell>
                      <TableCell align="right" sx={{ color: INK, fontSize: '0.72rem', borderColor: BORDER, whiteSpace: 'nowrap' }}>
                        {formatMinor(item.unitPriceMinor)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: INK, fontSize: '0.72rem', fontWeight: 750, borderColor: BORDER, whiteSpace: 'nowrap' }}>
                        {formatMinor(item.lineTotalMinor)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 2, color: MUTED, fontSize: '0.75rem' }}>
                        No item details are available for this order.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

function EmptyState({ filtered }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <Avatar
        variant="rounded"
        sx={{
          width: 52,
          height: 52,
          mx: 'auto',
          bgcolor: '#EAF8F4',
          color: '#279A82',
          borderRadius: 2,
        }}
      >
        <ShoppingBagOutlinedIcon />
      </Avatar>
      <Typography sx={{ mt: 1.5, color: INK, fontWeight: 800, fontSize: '0.9rem' }}>
        {filtered ? 'No orders in this status' : 'No orders yet'}
      </Typography>
      <Typography sx={{ mt: 0.5, color: MUTED, fontSize: '0.75rem' }}>
        {filtered
          ? 'Choose another order status to see matching orders.'
          : 'Orders containing your products will appear here when customers place them.'}
      </Typography>
    </Box>
  )
}

export default function SellerOrders() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetSellerOrdersQuery({
    page,
    limit: LIMIT,
    status: status || undefined,
  })

  const orders = data?.orders ?? []
  const total = data?.total ?? orders.length
  const totalPages = data?.totalPages ?? 0

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      {/* Page heading */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              color: INK,
              fontSize: { xs: '1.55rem', md: '1.85rem' },
              lineHeight: 1.2,
              fontWeight: 850,
              letterSpacing: '-0.045em',
            }}
          >
            Orders
          </Typography>
          <Typography sx={{ mt: 0.55, color: MUTED, fontSize: '0.84rem' }}>
            Review customer purchases and track fulfilment of your products.
          </Typography>
        </Box>

        <Button
          onClick={refetch}
          disabled={isFetching}
          startIcon={<RefreshRoundedIcon />}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            color: 'text.secondary',
            border: `1px solid ${BORDER}`,
            borderRadius: 1.7,
            px: 1.8,
            py: 1,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Refresh orders
        </Button>
      </Stack>

      {/* Order summary */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Orders in this result"
            value={isLoading ? '—' : total.toLocaleString()}
            helper="Based on the selected filter"
            icon={<ShoppingBagOutlinedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Showing on this page"
            value={isLoading ? '—' : orders.length.toLocaleString()}
            helper={`Up to ${LIMIT} orders per page`}
            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Current status filter"
            value={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
            helper="Orders containing your products"
            icon={<FilterListRoundedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {isError && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {apiErrorMessage(error)}
        </Alert>
      )}

      {/* Filter and order list */}
      <Panel sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            px: { xs: 1.8, sm: 2.3 },
            py: 1.8,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ color: INK, fontSize: '0.92rem', fontWeight: 800 }}>
              Order management
            </Typography>
            <Typography sx={{ mt: 0.3, color: MUTED, fontSize: '0.7rem' }}>
              Expand an order to view delivery details and line items.
            </Typography>
          </Box>

          <TextField
            size="small"
            select
            label="Your status"
            value={status}
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value)
            }}
            sx={{
              minWidth: { xs: '100%', sm: 190 },
              '& .MuiOutlinedInput-root': { borderRadius: 1.7, fontSize: '0.8rem' },
              '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map((value) => (
              <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ px: { xs: 1.2, sm: 2 }, pb: 1.8 }}>
          {isLoading ? (
            <PageSpinner />
          ) : orders.length === 0 ? (
            <EmptyState filtered={Boolean(status)} />
          ) : (
            <Stack spacing={1.2}>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </Stack>
          )}
        </Box>

        {data && totalPages > 1 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{
              px: { xs: 1.8, sm: 2.3 },
              py: 1.7,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <Typography sx={{ color: MUTED, fontSize: '0.7rem' }}>
              Page {page} of {totalPages}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              size="small"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': { color: '#63736D', fontWeight: 650 },
                '& .Mui-selected': { bgcolor: '#E5F6F1 !important', color: '#238B75' },
              }}
            />
          </Stack>
        )}
      </Panel>
    </Stack>
  )
}
