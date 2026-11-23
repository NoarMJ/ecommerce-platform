import { Link as RouterLink, useOutletContext } from 'react-router-dom'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'

import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

import {
  useGetSellerDashboardOverviewQuery,
  useGetSellerProductsQuery,
} from '../../services/sellerApi'
import { formatPrice } from '../../utils/formatPrice'
import WeeklySalesChart from '../../components/dashboard/WeeklySalesChart'

const STATUS_COLOR = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'default',
  // payment statuses
  paid: 'success',
  failed: 'error',
  refunded: 'default',
}

const ACCENT = '#42BFA8'
// Theme-aware colours: these follow light/dark mode.
const INK = 'text.primary'
const MUTED = 'text.secondary'
const BORDER = 'divider'
const MINT_WASH = alpha(ACCENT, 0.14)

function orderDate(value) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(date)
}

function DashboardPanel({ children, sx = {}, ...props }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        minWidth: 0,
        height: '100%',
        borderColor: BORDER,
        borderRadius: 2.5,
        boxShadow: '0 2px 10px rgba(28, 57, 49, 0.025)',
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color: INK, fontSize: '0.98rem' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.35, color: MUTED, fontSize: '0.75rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  )
}

function MetricCard({ label, value, helper, icon, loading, tone = 'mint' }) {
  const tones = {
    mint: { bg: alpha('#299C83', 0.14), color: '#299C83' },
    blue: { bg: alpha('#5785B4', 0.14), color: '#5785B4' },
    amber: { bg: alpha('#B8893C', 0.14), color: '#B8893C' },
    violet: { bg: alpha('#8876B7', 0.14), color: '#8876B7' },
  }
  const selectedTone = tones[tone]

  return (
    <DashboardPanel sx={{ p: { xs: 1.8, sm: 2.1 } }}>
      <Stack spacing={1.4}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ color: MUTED, fontSize: '0.76rem', fontWeight: 650 }}>
            {label}
          </Typography>
          <Box
            sx={{
              width: 35,
              height: 35,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.5,
              bgcolor: selectedTone.bg,
              color: selectedTone.color,
            }}
          >
            {icon}
          </Box>
        </Stack>

        {loading ? (
          <Skeleton variant="text" width="58%" height={38} />
        ) : (
          <Typography
            sx={{
              color: INK,
              fontSize: { xs: '1.35rem', sm: '1.6rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.045em',
              fontWeight: 850,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value ?? '—'}
          </Typography>
        )}

        <Typography sx={{ color: MUTED, fontSize: '0.69rem', lineHeight: 1.4 }}>
          {helper}
        </Typography>
      </Stack>
    </DashboardPanel>
  )
}

function StatusChip({ status, outlined = false }) {
  const normalized = String(status || 'unknown').toLowerCase()

  return (
    <Chip
      size="small"
      label={normalized.replaceAll('_', ' ')}
      color={STATUS_COLOR[normalized] || 'default'}
      variant={outlined ? 'outlined' : 'filled'}
      sx={{
        height: 23,
        fontSize: '0.67rem',
        fontWeight: 700,
        textTransform: 'capitalize',
        borderRadius: 1.2,
      }}
    />
  )
}

function QuickLink({ title, description, icon, to }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      variant="outlined"
      sx={{
        p: 1.7,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1.4,
        color: 'inherit',
        textDecoration: 'none',
        borderColor: BORDER,
        borderRadius: 2,
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: ACCENT,
          bgcolor: alpha(ACCENT, 0.06),
        },
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1.5,
          bgcolor: MINT_WASH,
          color: '#279A82',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 750, color: INK }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.2, fontSize: '0.69rem', color: MUTED }}>
          {description}
        </Typography>
      </Box>
      <ArrowForwardRoundedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
    </Paper>
  )
}

export default function SellerOverview() {
  const theme = useTheme()
  const { seller } = useOutletContext()
  const approved = seller?.status === 'approved'

  const overview = useGetSellerDashboardOverviewQuery(undefined, {
    skip: !approved,
    refetchOnMountOrArgChange: true,
  })

  const products = useGetSellerProductsQuery(
    { limit: 1 },
    { skip: !approved },
  )

  const activeProducts = useGetSellerProductsQuery(
    { limit: 1, isActive: 'true' },
    { skip: !approved },
  )

  const summary = overview.data?.summary ?? {}
  const counts = overview.data?.counts ?? {}
  const weeklySales = overview.data?.weeklySales ?? []
  const recentOrders = overview.data?.recentOrders ?? []
  const topProducts = overview.data?.topProducts ?? []

  const shopName = seller?.shopName || seller?.companyName || 'Your store'
  const initialLoading =
    overview.isLoading || products.isLoading || activeProducts.isLoading
  const queryError =
    overview.isError || products.isError || activeProducts.isError

  const refreshDashboard = () => {
    overview.refetch()
    products.refetch()
    activeProducts.refetch()
  }

  const metrics = [
    {
      label: 'Paid revenue',
      value: formatPrice(summary.paidSalesMinor ?? 0),
      helper: `${summary.paidOrderCount ?? 0} confirmed paid orders`,
      icon: <PaymentsOutlinedIcon fontSize="small" />,
      tone: 'mint',
      loading: overview.isLoading,
    },
    {
      label: 'Total orders',
      value: (summary.totalOrders ?? 0).toLocaleString(),
      helper: `${summary.weeklyPaidOrderCount ?? 0} paid this week`,
      icon: <ShoppingBagOutlinedIcon fontSize="small" />,
      tone: 'blue',
      loading: overview.isLoading,
    },
    {
      label: 'Pending orders',
      value: (counts.pending ?? 0).toLocaleString(),
      helper: 'Awaiting your attention',
      icon: <PendingActionsOutlinedIcon fontSize="small" />,
      tone: 'amber',
      loading: overview.isLoading,
    },
    {
      label: 'Products listed',
      value: products.data?.total,
      helper: `${activeProducts.data?.total ?? 0} active in your shop`,
      icon: <Inventory2OutlinedIcon fontSize="small" />,
      tone: 'violet',
      loading: products.isLoading || activeProducts.isLoading,
    },
  ]

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
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
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
              Overview
            </Typography>
            {approved && (
              <Chip
                size="small"
                label="Approved seller"
                sx={{
                  height: 23,
                  bgcolor: MINT_WASH,
                  color: '#258C76',
                  fontSize: '0.66rem',
                  fontWeight: 750,
                }}
              />
            )}
          </Stack>
          <Typography sx={{ color: MUTED, fontSize: '0.84rem' }}>
            Welcome back to {shopName}. Here is what is happening with your shop.
          </Typography>
        </Box>

        {approved && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              onClick={refreshDashboard}
              disabled={initialLoading}
              startIcon={<RefreshRoundedIcon />}
              sx={{
                color: 'text.secondary',
                borderColor: BORDER,
                textTransform: 'none',
                fontWeight: 700,
              }}
              variant="outlined"
            >
              Refresh
            </Button>
            <Button
              component={RouterLink}
              to="/seller/products/new"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{
                bgcolor: '#39B99F',
                color: '#fff',
                borderRadius: 1.7,
                px: 2,
                textTransform: 'none',
                fontWeight: 750,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#279C84', boxShadow: 'none' },
              }}
            >
              Add product
            </Button>
          </Stack>
        )}
      </Stack>

      {!approved ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Your seller account must be approved before you can manage products and orders.
        </Alert>
      ) : (
        <>
          {queryError && (
            <Alert
              severity="error"
              sx={{ borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" onClick={refreshDashboard}>
                  Retry
                </Button>
              }
            >
              Some dashboard information could not be loaded. Refresh to try again.
            </Alert>
          )}

          {/* KPI cards */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography sx={{ color: INK, fontSize: '0.94rem', fontWeight: 800 }}>
                Store performance
              </Typography>
              <Typography sx={{ color: MUTED, fontSize: '0.7rem' }}>
                All figures relate to your products
              </Typography>
            </Stack>
            <Grid container spacing={1.5}>
              {metrics.map((metric) => (
                <Grid key={metric.label} size={{ xs: 12, sm: 6, xl: 3 }}>
                  <MetricCard {...metric} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Sales chart and weekly summary */}
          <Grid container spacing={1.5} alignItems="stretch">
            <Grid size={{ xs: 12, lg: 8 }}>
              <DashboardPanel sx={{ p: { xs: 2, sm: 2.5 } }}>
                <SectionHeading
                  title="Sales analytics"
                  subtitle="Revenue from your items when payment is confirmed"
                  action={
                    <Chip
                      size="small"
                      label="Last 7 days"
                      variant="outlined"
                      sx={{ borderColor: BORDER, color: MUTED, fontSize: '0.68rem' }}
                    />
                  }
                />
                {overview.isLoading ? (
                  <Box sx={{ minHeight: 245, display: 'grid', placeItems: 'center' }}>
                    <CircularProgress size={23} sx={{ color: ACCENT }} />
                  </Box>
                ) : (
                  <Box sx={{ mt: 1.5, minWidth: 0 }}>
                    <WeeklySalesChart points={weeklySales} theme={theme} />
                  </Box>
                )}
              </DashboardPanel>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <DashboardPanel sx={{ p: { xs: 2, sm: 2.5 } }}>
                <SectionHeading
                  title="Weekly snapshot"
                  subtitle="Confirmed activity · last 7 days"
                  action={
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: MINT_WASH,
                        color: '#279A82',
                        borderRadius: 1.5,
                      }}
                    >
                      <TrendingUpRoundedIcon fontSize="small" />
                    </Avatar>
                  }
                />

                <Stack spacing={1.2} sx={{ mt: 2.2 }}>
                  <Box sx={{ p: 1.6, bgcolor: alpha(ACCENT, 0.08), borderRadius: 1.8 }}>
                    <Typography sx={{ color: MUTED, fontSize: '0.7rem' }}>
                      Paid revenue this week
                    </Typography>
                    <Typography sx={{ mt: 0.4, color: INK, fontSize: '1.35rem', fontWeight: 850 }}>
                      {overview.isLoading ? '—' : formatPrice(summary.weeklySalesMinor ?? 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.6, bgcolor: 'action.hover', borderRadius: 1.8 }}>
                    <Typography sx={{ color: MUTED, fontSize: '0.7rem' }}>
                      Paid orders this week
                    </Typography>
                    <Typography sx={{ mt: 0.4, color: INK, fontSize: '1.35rem', fontWeight: 850 }}>
                      {overview.isLoading ? '—' : summary.weeklyPaidOrderCount ?? 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ mb: 1, color: MUTED, fontSize: '0.7rem', fontWeight: 700 }}>
                      Order status breakdown
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.7}>
                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                        <Chip
                          key={status}
                          size="small"
                          variant="outlined"
                          color={STATUS_COLOR[status]}
                          label={`${status} ${counts[status] ?? 0}`}
                          sx={{
                            height: 24,
                            fontSize: '0.65rem',
                            textTransform: 'capitalize',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </DashboardPanel>
            </Grid>
          </Grid>

          {/* Top products */}
          <DashboardPanel sx={{ p: { xs: 2, sm: 2.5 } }}>
            <SectionHeading
              title="Top selling products"
              subtitle="Products ranked by units sold in paid orders"
              action={
                <Button
                  component={RouterLink}
                  to="/seller/products"
                  size="small"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ color: '#299B83', fontWeight: 750, textTransform: 'none' }}
                >
                  View products
                </Button>
              }
            />

            {overview.isLoading ? (
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                {[1, 2, 3, 4].map((item) => (
                  <Box key={item} sx={{ flex: 1 }}>
                    <Skeleton variant="rounded" height={105} />
                    <Skeleton width="80%" sx={{ mt: 1 }} />
                    <Skeleton width="55%" />
                  </Box>
                ))}
              </Stack>
            ) : topProducts.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Inventory2OutlinedIcon sx={{ color: 'text.disabled', fontSize: 30 }} />
                <Typography sx={{ mt: 1, color: INK, fontWeight: 700, fontSize: '0.84rem' }}>
                  Your product highlights will appear here
                </Typography>
                <Typography sx={{ mt: 0.4, color: MUTED, fontSize: '0.74rem' }}>
                  Once customers purchase your products, your best sellers will be shown.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                {topProducts.slice(0, 4).map((product, index) => (
                  <Grid key={product.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box
                      sx={{
                        p: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.2,
                        border: 1,
                        borderColor: BORDER,
                        borderRadius: 1.8,
                        minWidth: 0,
                      }}
                    >
                      <Typography sx={{ color: 'text.disabled', fontSize: '0.68rem', fontWeight: 800 }}>
                        {String(index + 1).padStart(2, '0')}
                      </Typography>
                      <Avatar
                        variant="rounded"
                        src={product.image || undefined}
                        alt={product.name || 'Product'}
                        sx={{
                          width: 58,
                          height: 58,
                          bgcolor: 'action.hover',
                          color: 'text.secondary',
                          borderRadius: 1.5,
                        }}
                      >
                        <Inventory2OutlinedIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ color: INK, fontSize: '0.76rem', fontWeight: 750 }}>
                          {product.name}
                        </Typography>
                        <Typography sx={{ mt: 0.3, color: MUTED, fontSize: '0.67rem' }}>
                          {product.unitsSold ?? 0} sold
                        </Typography>
                        <Typography sx={{ mt: 0.25, color: INK, fontSize: '0.7rem', fontWeight: 800 }}>
                          {formatPrice(product.revenueMinor ?? 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </DashboardPanel>

          {/* Recent orders */}
          <DashboardPanel sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
              <SectionHeading
                title="Recent orders"
                subtitle="Latest orders containing your products"
                action={
                  <Button
                    component={RouterLink}
                    to="/seller/orders"
                    size="small"
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ color: '#299B83', fontWeight: 750, textTransform: 'none' }}
                  >
                    All orders
                  </Button>
                }
              />
            </Box>

            <TableContainer>
              <Table size="small" aria-label="Recent seller orders" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['Order', 'Customer', 'Date', 'Payment', 'Order status', 'Your items'].map((label, index) => (
                      <TableCell
                        key={label}
                        align={index === 5 ? 'right' : 'left'}
                        sx={{
                          py: 1.2,
                          color: 'text.secondary',
                          borderColor: BORDER,
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          letterSpacing: 0.45,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overview.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={20} sx={{ color: ACCENT }} />
                      </TableCell>
                    </TableRow>
                  ) : recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ color: MUTED, fontSize: '0.78rem' }}>
                          No orders to display yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ py: 1.5, color: '#279A82', fontSize: '0.76rem', fontWeight: 800 }}>
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ color: INK, fontSize: '0.75rem', fontWeight: 700 }}>
                            {order.shipping?.fullName || 'Customer'}
                          </Typography>
                          <Typography sx={{ color: MUTED, fontSize: '0.67rem' }}>
                            {order.shipping?.city || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: MUTED, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {orderDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={order.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusChip status={order.fulfilment?.status ?? order.orderStatus} outlined />
                        </TableCell>
                        <TableCell align="right" sx={{ color: INK, fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {formatPrice(order.sellerSubtotalMinor ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DashboardPanel>

          {/* Quick links */}
          <Box>
            <SectionHeading
              title="Quick actions"
              subtitle="Shortcuts to the parts of your shop you use most."
            />
            <Grid container spacing={1.5} sx={{ mt: 0.2 }}>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <QuickLink
                  title="Manage products"
                  description="Edit listings and stock levels"
                  icon={<Inventory2OutlinedIcon fontSize="small" />}
                  to="/seller/products"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <QuickLink
                  title="Manage orders"
                  description="Review orders and update fulfilment"
                  icon={<ShoppingBagOutlinedIcon fontSize="small" />}
                  to="/seller/orders"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                <QuickLink
                  title="Store information"
                  description="Review the seller information page"
                  icon={<StorefrontOutlinedIcon fontSize="small" />}
                  to="/seller/lp"
                />
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </Stack>
  )
}
