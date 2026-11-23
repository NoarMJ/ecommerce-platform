import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, useTheme,
} from '@mui/material'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import { useGetAdminDashboardOverviewQuery, useGetCategoriesQuery, useGetProductsQuery } from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'
import WeeklySalesChart from '../../components/dashboard/WeeklySalesChart'

const STATUS_COLOR = {
  pending: 'warning', processing: 'info', shipped: 'primary',
  delivered: 'success', cancelled: 'default',
}

function orderDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function customerName(order) {
  const user = order.user && typeof order.user === 'object' ? order.user : {}
  return [user.firstName, user.lastName].filter(Boolean).join(' ')
    || order.shippingAddress?.fullName || 'Customer'
}

function imageUrl(image) {
  return typeof image === 'string' ? image : image?.url || image?.secureUrl || ''
}

function Panel({ children, sx = {}, ...props }) {
  return (
    <Paper variant="outlined" {...props} sx={{
      minWidth: 0, height: '100%', overflow: 'hidden',
      borderColor: 'divider', borderRadius: { xs: 2, sm: 2.5 },
      bgcolor: 'background.paper', boxShadow: '0 2px 10px rgba(17,24,39,.035)',
      ...sx,
    }}>
      {children}
    </Paper>
  )
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography fontSize={15} fontWeight={800}>{title}</Typography>
        {subtitle && <Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>{subtitle}</Typography>}
      </Box>
      {action && <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>{action}</Box>}
    </Stack>
  )
}

function MetricCard({ icon: Icon, title, value, hint, accent, theme }) {
  return (
    <Card variant="outlined" sx={{
      height: '100%', minWidth: 0, borderColor: 'divider', borderRadius: 2.5,
      boxShadow: '0 2px 10px rgba(17,24,39,.035)',
    }}>
      <CardContent sx={{ p: { xs: 1.6, sm: 2.1 }, '&:last-child': { pb: { xs: 1.6, sm: 2.1 } } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={11} fontWeight={700} color="text.secondary">{title}</Typography>
            <Typography sx={{
              mt: 1.1, fontSize: { xs: 20, sm: 24, lg: 27 }, lineHeight: 1.15,
              fontWeight: 800, color: 'text.primary', letterSpacing: '-.5px',
              overflowWrap: 'anywhere',
            }}>{value}</Typography>
            <Typography sx={{ mt: .8, fontSize: 10.5, color: 'text.secondary' }}>{hint}</Typography>
          </Box>
          <Avatar variant="rounded" sx={{
            flexShrink: 0, width: { xs: 33, sm: 39 }, height: { xs: 33, sm: 39 },
            bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : accent.bg,
            color: accent.color, borderRadius: 2,
          }}><Icon sx={{ fontSize: 19 }} /></Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}

function ProductThumbnail({ image, name, size = 36 }) {
  const src = imageUrl(image)
  return src
    ? <Box component="img" src={src} alt={name || ''} loading="lazy"
        sx={{ width: size, height: size, flexShrink: 0, borderRadius: 1.5, objectFit: 'cover', bgcolor: 'action.hover' }} />
    : <Avatar variant="rounded" sx={{ width: size, height: size, flexShrink: 0, bgcolor: 'action.hover', color: 'text.secondary' }}>
        <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
      </Avatar>
}

export default function AdminOverview({ user, onNavigate, onCreateProduct }) {
  const theme = useTheme()
  const overview = useGetAdminDashboardOverviewQuery()
  const categoriesQuery = useGetCategoriesQuery()
  const productsQuery = useGetProductsQuery({ limit: 4 })

  const summary = overview.data?.summary ?? {}
  const orders = overview.data?.recentOrders ?? []
  const topProducts = overview.data?.topProducts ?? []
  const weeklySales = overview.data?.weeklySales ?? []
  const categories = categoriesQuery.data?.data ?? []
  const recentProducts = productsQuery.data?.data ?? []
  const productCount = productsQuery.data?.pagination?.total
    ?? productsQuery.data?.total ?? recentProducts.length

  const openCreateProduct = () => {
    if (onCreateProduct) onCreateProduct()
    else onNavigate?.('products')
  }

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ width: '100%', minWidth: 0 }}>
      {overview.isError && <Alert severity="warning">
        Sales and order analytics could not be loaded. Refresh the page or check the server connection.
      </Alert>}

      <Box>
        <Typography fontSize={15} fontWeight={800} sx={{ mb: 1.4 }}>Store performance</Typography>
        <Grid container spacing={{ xs: 1.25, sm: 1.75 }}>
          <Grid item xs={6} md={3}><MetricCard theme={theme} icon={PaymentsOutlinedIcon}
            title="Total paid sales" value={overview.isLoading ? '—' : formatPrice(summary.paidSalesMinor ?? 0)}
            hint={`${summary.paidOrderCount ?? 0} paid orders`} accent={{ bg: '#E8EEFF', color: '#2563EB' }} /></Grid>
          <Grid item xs={6} md={3}><MetricCard theme={theme} icon={ShoppingBagOutlinedIcon}
            title="Total orders" value={overview.isLoading ? '—' : (summary.totalOrders ?? 0).toLocaleString()}
            hint={`${summary.weeklyPaidOrderCount ?? 0} paid this week`} accent={{ bg: '#E8EEFF', color: '#2563EB' }} /></Grid>
          <Grid item xs={6} md={3}><MetricCard theme={theme} icon={Inventory2OutlinedIcon}
            title="Products" value={productsQuery.isLoading ? '—' : productCount.toLocaleString()}
            hint="In your catalogue" accent={{ bg: '#EEF2FF', color: '#4F46E5' }} /></Grid>
          <Grid item xs={6} md={3}><MetricCard theme={theme} icon={CategoryOutlinedIcon}
            title="Categories" value={categoriesQuery.isLoading ? '—' : categories.length.toLocaleString()}
            hint="Product groups" accent={{ bg: '#E0F2FE', color: '#0369A1' }} /></Grid>
        </Grid>
      </Box>

      <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <Panel sx={{ p: { xs: 1.6, sm: 2.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
              <Box>
                <Typography fontSize={15} fontWeight={800}>Weekly sales</Typography>
                <Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>
                  Sales are counted when payment is confirmed
                </Typography>
              </Box>
              <Chip size="small" label="Last 7 days" variant="outlined"
                sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: 10 }} />
            </Stack>
            {overview.isLoading
              ? <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center' }}><CircularProgress size={23} /></Box>
              : <Box sx={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  <WeeklySalesChart points={weeklySales} theme={theme} />
                </Box>}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel sx={{ p: { xs: 1.6, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Typography fontSize={15} fontWeight={800}>Weekly snapshot</Typography>
                <Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>
                  Confirmed payments · last 7 days
                </Typography>
              </Box>
              <Avatar variant="rounded" sx={{
                flexShrink: 0, bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#EFF6FF',
                color: '#2563EB', width: 36, height: 36,
              }}><TrendingUpOutlinedIcon fontSize="small" /></Avatar>
            </Stack>
            <Stack spacing={1.1} sx={{ mt: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#F5F8FF', borderRadius: 2 }}>
                <Typography fontSize={10} color="text.secondary">Paid revenue</Typography>
                <Typography fontSize={{ xs: 18, sm: 20 }} fontWeight={800}>
                  {overview.isLoading ? '—' : formatPrice(summary.weeklySalesMinor ?? 0)}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography fontSize={10} color="text.secondary">Payments completed</Typography>
                <Typography fontSize={20} fontWeight={800}>
                  {overview.isLoading ? '—' : summary.weeklyPaidOrderCount ?? 0}
                </Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardOutlinedIcon />}
                onClick={() => onNavigate?.('orders')} sx={{ alignSelf: 'flex-start', px: 0 }}>
                Review order activity
              </Button>
            </Stack>
          </Panel>
        </Grid>
      </Grid>

      <Panel>
        <Box sx={{ p: { xs: 1.6, sm: 2.5 }, pb: 1.4 }}>
          <SectionHeading title="Recent transactions"
            subtitle="Latest customer orders and payment status"
            action={<Button size="small" endIcon={<ArrowForwardOutlinedIcon />}
              onClick={() => onNavigate?.('orders')}>All orders</Button>} />
        </Box>
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" aria-label="Recent transactions" sx={{ minWidth: 650 }}>
            <TableHead><TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#F7F9FC' }}>
              {['Order', 'Customer', 'Date', 'Payment', 'Status', 'Amount'].map((label, i) => (
                <TableCell key={label} align={i === 5 ? 'right' : 'left'} sx={{
                  py: 1.2, px: { xs: 1.2, sm: 2 }, color: 'text.secondary',
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: .4, whiteSpace: 'nowrap',
                }}>{label}</TableCell>
              ))}
            </TableRow></TableHead>
            <TableBody>
              {overview.isLoading ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <CircularProgress size={20} />
              </TableCell></TableRow>
              : orders.length === 0 ? <TableRow><TableCell colSpan={6} align="center"
                sx={{ py: 4, color: 'text.secondary', fontSize: 12 }}>No transactions yet.</TableCell></TableRow>
              : orders.map((order) => <TableRow key={order._id} hover>
                <TableCell sx={{ px: { xs: 1.2, sm: 2 }, whiteSpace: 'nowrap' }}>
                  <Typography fontSize={11} fontWeight={700} color="primary.main">{order.orderNumber}</Typography>
                </TableCell>
                <TableCell sx={{ px: { xs: 1.2, sm: 2 }, minWidth: 130 }}>
                  <Typography fontSize={11} fontWeight={600}>{customerName(order)}</Typography>
                  <Typography fontSize={10} color="text.secondary">{order.shippingAddress?.phone || '—'}</Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11, color: 'text.secondary' }}>{orderDate(order.createdAt)}</TableCell>
                <TableCell><Chip size="small" label={order.paymentStatus || 'unknown'}
                  color={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'error' : 'warning'}
                  sx={{ height: 22, fontSize: 10, textTransform: 'capitalize' }} /></TableCell>
                <TableCell><Chip size="small" variant="outlined" label={order.orderStatus || 'unknown'}
                  color={STATUS_COLOR[order.orderStatus] || 'default'}
                  sx={{ height: 22, fontSize: 10, textTransform: 'capitalize' }} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                  {formatPrice(order.totalMinor)}
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>

      <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="stretch">
        <Grid item xs={12} lg={7}>
          <Panel>
            <Box sx={{ p: { xs: 1.6, sm: 2.5 }, pb: 1 }}>
              <SectionHeading title="Top-selling products"
                subtitle="Ranked by units sold in paid orders"
                action={<IconButton size="small" aria-label="View products"
                  onClick={() => onNavigate?.('products')}><MoreHorizOutlinedIcon /></IconButton>} />
            </Box>
            {overview.isLoading
              ? <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={20} /></Box>
              : topProducts.length === 0
                ? <Typography fontSize={12} color="text.secondary" sx={{ px: 2.5, pb: 3 }}>
                    Product sales will appear after the first completed payment.
                  </Typography>
                : <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                    {topProducts.slice(0, 5).map((product, index) => (
                      <Stack key={product.id} direction="row" alignItems="center" spacing={1.2}
                        sx={{ px: { xs: 1.6, sm: 2.5 }, py: 1.1, minWidth: 0 }}>
                        <Typography fontSize={10} fontWeight={800} color="text.secondary" sx={{ width: 18, flexShrink: 0 }}>
                          {String(index + 1).padStart(2, '0')}
                        </Typography>
                        <ProductThumbnail image={product.image} name={product.name} size={36} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap fontSize={11} fontWeight={700}>{product.name}</Typography>
                          <Typography fontSize={10} color="text.secondary">{product.unitsSold} purchased</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography fontSize={11} fontWeight={800}>{formatPrice(product.revenueMinor)}</Typography>
                          <Typography fontSize={9.5} color="text.secondary">Revenue</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>}
            <Box sx={{ px: { xs: 1.6, sm: 2.5 }, py: 1.2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button size="small" endIcon={<ArrowForwardOutlinedIcon />}
                onClick={() => onNavigate?.('products')}>View product catalogue</Button>
            </Box>
          </Panel>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Panel sx={{ p: { xs: 1.6, sm: 2.5 } }}>
            <SectionHeading title="Catalogue overview" subtitle="Manage products and product groups"
              action={<Button onClick={openCreateProduct} startIcon={<AddOutlinedIcon />}
                size="small" variant="contained">Add product</Button>} />
            <Typography sx={{ mb: .9, fontSize: 10, color: 'text.secondary', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: .65 }}>Categories</Typography>
            <Stack direction="row" gap={.75} flexWrap="wrap">
              {categories.slice(0, 6).map((category) => <Chip key={category._id || category.id}
                label={category.name} onClick={() => onNavigate?.('categories')}
                variant="outlined" size="small"
                sx={{ borderColor: 'divider', color: 'text.primary', fontSize: 10, maxWidth: '100%' }} />)}
              {categories.length === 0 && <Typography fontSize={11} color="text.secondary">No categories available.</Typography>}
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2.1, mb: .7 }}>
              <Typography fontSize={10} color="text.secondary" fontWeight={800}
                sx={{ textTransform: 'uppercase', letterSpacing: .65 }}>Recently added</Typography>
              <Button size="small" onClick={() => onNavigate?.('products')} sx={{ minWidth: 0, px: .5 }}>View all</Button>
            </Stack>
            {productsQuery.isLoading
              ? <Box sx={{ py: 2, display: 'grid', placeItems: 'center' }}><CircularProgress size={18} /></Box>
              : recentProducts.length === 0
                ? <Typography fontSize={11} color="text.secondary" sx={{ py: 1.5 }}>No products found in the catalogue.</Typography>
                : <Stack spacing={.25}>
                    {recentProducts.slice(0, 3).map((product) => (
                      <Stack key={product._id || product.id} direction="row" alignItems="center"
                        spacing={1} sx={{ py: .7, minWidth: 0 }}>
                        <ProductThumbnail image={product.images?.[0]} name={product.name} size={33} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap fontSize={11} fontWeight={650}>{product.name}</Typography>
                          <Typography fontSize={10} color="text.secondary">{formatPrice(product.priceMinor)}</Typography>
                        </Box>
                        <Button size="small" onClick={() => onNavigate?.('products')}
                          sx={{ minWidth: 0, px: 1, flexShrink: 0 }}>Manage</Button>
                      </Stack>
                    ))}
                  </Stack>}
            <Button fullWidth size="small" endIcon={<ArrowForwardOutlinedIcon />}
              onClick={() => onNavigate?.('products')}
              sx={{ mt: 1.2, pt: 1.2, borderTop: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
              Open product manager
            </Button>
          </Panel>
        </Grid>
      </Grid>

      <Typography fontSize={10} color="text.secondary"
        sx={{ textAlign: { xs: 'left', sm: 'right' }, px: .25 }}>
        Signed in as {user?.isPrimaryAdmin ? 'Primary administrator' : 'Administrator'}
        {' · '}Paid sales update when a payment is confirmed
      </Typography>
    </Stack>
  )
}
