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

const STATUS_COLOR = { pending: 'warning', processing: 'info', shipped: 'primary', delivered: 'success', cancelled: 'default' }

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
}

function orderDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function customerName(order) {
  const user = order.user && typeof order.user === 'object' ? order.user : {}
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || order.shippingAddress?.fullName || 'Customer'
}

function Panel({ children, sx = {}, ...props }) {
  return <Paper variant="outlined" {...props} sx={{ borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: '0 2px 10px rgba(17, 24, 39, .035)', ...sx }}>{children}</Paper>
}

function MetricCard({ icon: Icon, title, value, hint, accent, theme }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: '0 2px 10px rgba(17,24,39,.035)' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography fontSize={12} fontWeight={600} color="text.secondary">{title}</Typography>
            <Typography sx={{ mt: 1.3, fontSize: { xs: 24, md: 27 }, lineHeight: 1.1, fontWeight: 800, color: 'text.primary', letterSpacing: '-.5px' }}>{value}</Typography>
            <Typography sx={{ mt: 1, fontSize: 11, color: 'text.secondary' }}>{hint}</Typography>
          </Box>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: theme.palette.mode === 'dark' ? 'rgba(37,99,235,.18)' : accent.bg, color: accent.color, borderRadius: 2 }}><Icon fontSize="small" /></Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}

function WeeklyChart({ points, theme }) {
  const max = Math.max(...points.map((point) => point.salesMinor), 1)
  const coords = points.map((point, index) => `${34 + index * 86},${142 - (point.salesMinor / max) * 102}`).join(' ')
  const fillPoints = `34,146 ${coords} 550,146`
  const currency = (minor) => `KSh ${Math.round(minor / 100).toLocaleString('en-KE')}`
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', letterSpacing: '-.7px' }}>{currency(points.reduce((sum, point) => sum + point.salesMinor, 0))}</Typography>
        <Chip size="small" icon={<TrendingUpOutlinedIcon sx={{ '&.MuiChip-icon': { color: 'inherit' } }} />} label="Paid sales" sx={{ height: 24, bgcolor: theme.palette.mode === 'dark' ? 'rgba(37,99,235,.16)' : '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700 }} />
      </Stack>
      <Typography fontSize={11} color="text.secondary">Last 7 days · completed payments</Typography>
      <Box sx={{ mt: 1.5, width: '100%', overflow: 'hidden' }}>
        <svg viewBox="0 0 584 182" width="100%" role="img" aria-label="Paid sales by day for the last seven days">
          <defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity=".23" /><stop offset="1" stopColor="#2563EB" stopOpacity=".015" /></linearGradient></defs>
          {[40, 90, 140].map((y) => <line key={y} x1="30" x2="558" y1={y} y2={y} stroke={theme.palette.divider} strokeDasharray="3 5" />)}
          <polygon points={fillPoints} fill="url(#sales-area)" />
          <polyline points={coords} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => {
            const x = 34 + index * 86
            const y = 142 - (point.salesMinor / max) * 102
            return <g key={point.date}><circle cx={x} cy={y} r="4" fill="#fff" stroke="#2563EB" strokeWidth="2.5" /><text x={x} y="170" textAnchor="middle" fill={theme.palette.text.secondary} fontSize="10">{dateLabel(point.date)}</text></g>
          })}
        </svg>
      </Box>
    </Box>
  )
}

export default function AdminOverview({ user, onNavigate, onCreateProduct }) {
  const theme = useTheme()
  const overview = useGetAdminDashboardOverviewQuery()
  const categoriesQuery = useGetCategoriesQuery()
  const productsQuery = useGetProductsQuery({ limit: 4 })
  const data = overview.data
  const summary = data?.summary ?? {}
  const orders = data?.recentOrders ?? []
  const topProducts = data?.topProducts ?? []
  const weeklySales = data?.weeklySales ?? []
  const categories = categoriesQuery.data?.data ?? []
  const productCount = productsQuery.data?.pagination?.total ?? productsQuery.data?.total ?? productsQuery.data?.data?.length ?? 0

  return (
    <Stack spacing={2.5}>
      {overview.isError && <Alert severity="warning">Sales and order analytics could not be loaded. Refresh the page or check the server connection.</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}><MetricCard theme={theme} icon={PaymentsOutlinedIcon} title="Total paid sales" value={overview.isLoading ? '—' : formatPrice(summary.paidSalesMinor ?? 0)} hint={`${summary.paidOrderCount ?? 0} paid orders`} accent={{ bg: '#E8EEFF', color: '#2563EB' }} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard theme={theme} icon={ShoppingBagOutlinedIcon} title="Total orders" value={overview.isLoading ? '—' : (summary.totalOrders ?? 0).toLocaleString()} hint={`${summary.weeklyPaidOrderCount ?? 0} paid this week`} accent={{ bg: '#E8EEFF', color: '#2563EB' }} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard theme={theme} icon={Inventory2OutlinedIcon} title="Products" value={productsQuery.isLoading ? '—' : productCount.toLocaleString()} hint="In your catalogue" accent={{ bg: '#EEF2FF', color: '#4F46E5' }} /></Grid>
        <Grid item xs={12} sm={6} lg={3}><MetricCard theme={theme} icon={CategoryOutlinedIcon} title="Categories" value={categoriesQuery.isLoading ? '—' : categories.length.toLocaleString()} hint="Product groups" accent={{ bg: '#E0F2FE', color: '#0369A1' }} /></Grid>
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <Panel sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box><Typography fontSize={16} fontWeight={800} color="text.primary">Weekly report</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Sales are counted when payment is confirmed</Typography></Box>
              <Chip size="small" label="Last 7 days" variant="outlined" sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: 10 }} />
            </Stack>
            {overview.isLoading ? <Box sx={{ minHeight: 230, display: 'grid', placeItems: 'center' }}><CircularProgress size={23} /></Box> : <WeeklyChart points={weeklySales} theme={theme} />}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel sx={{ p: 2.5, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontSize={16} fontWeight={800} color="text.primary">Weekly snapshot</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Confirmed payments · last 7 days</Typography></Box><Avatar variant="rounded" sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(37,99,235,.18)' : '#EFF6FF', color: '#2563EB', width: 38, height: 38 }}><TrendingUpOutlinedIcon fontSize="small" /></Avatar></Stack>
            <Stack spacing={1.3} sx={{ mt: 2.4 }}><Box sx={{ p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(37,99,235,.12)' : '#F5F8FF', borderRadius: 2 }}><Typography fontSize={10} color="text.secondary">Paid revenue</Typography><Typography fontSize={19} fontWeight={800} color="text.primary">{overview.isLoading ? '—' : formatPrice(summary.weeklySalesMinor ?? 0)}</Typography></Box><Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}><Typography fontSize={10} color="text.secondary">Payments completed</Typography><Typography fontSize={19} fontWeight={800} color="text.primary">{overview.isLoading ? '—' : summary.weeklyPaidOrderCount ?? 0}</Typography></Box><Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => onNavigate?.('orders')} sx={{ alignSelf: 'flex-start', px: 0 }}>Review order activity</Button></Stack>
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} xl={8}>
          <Panel sx={{ overflow: 'hidden', height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5, pb: 1.6 }}>
              <Box><Typography fontSize={16} fontWeight={800} color="text.primary">Transactions</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Latest customer orders and payment status</Typography></Box>
              <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => onNavigate?.('orders')}>All orders</Button>
            </Stack>
            <TableContainer>
              <Table size="small" aria-label="Recent transactions" sx={{ minWidth: 610 }}>
                <TableHead><TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1B2638' : '#F7F9FC' }}>{['Order', 'Customer', 'Date', 'Payment', 'Status', 'Amount'].map((label, i) => <TableCell key={label} align={i === 5 ? 'right' : 'left'} sx={{ py: 1.25, color: 'text.secondary', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .45 }}>{label}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {overview.isLoading ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
                    : orders.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No transactions yet.</TableCell></TableRow>
                      : orders.map((order) => <TableRow key={order._id} hover>
                        <TableCell><Typography fontSize={11} fontWeight={700} color="primary.main">{order.orderNumber}</Typography></TableCell>
                        <TableCell><Typography fontSize={11} fontWeight={600}>{customerName(order)}</Typography><Typography fontSize={10} color="text.secondary">{order.shippingAddress?.phone}</Typography></TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11, color: 'text.secondary' }}>{orderDate(order.createdAt)}</TableCell>
                        <TableCell><Chip size="small" label={order.paymentStatus} color={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'error' : 'warning'} sx={{ height: 22, fontSize: 10, textTransform: 'capitalize' }} /></TableCell>
                        <TableCell><Chip size="small" variant="outlined" label={order.orderStatus} color={STATUS_COLOR[order.orderStatus] || 'default'} sx={{ height: 22, fontSize: 10, textTransform: 'capitalize' }} /></TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>{formatPrice(order.totalMinor)}</TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Panel>
        </Grid>
        <Grid item xs={12} xl={4}>
          <Panel sx={{ p: 2.5, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.4 }}><Box><Typography fontSize={16} fontWeight={800} color="text.primary">Top products</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Most units sold · paid orders</Typography></Box><IconButton size="small" aria-label="View products" onClick={() => onNavigate?.('products')}><MoreHorizOutlinedIcon /></IconButton></Stack>
            {overview.isLoading ? <CircularProgress size={20} /> : topProducts.length === 0 ? <Typography fontSize={12} color="text.secondary" sx={{ py: 3 }}>Product sales will appear after the first completed payment.</Typography> : <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>{topProducts.slice(0, 5).map((product, index) => <Stack key={product.id} direction="row" alignItems="center" spacing={1.2} sx={{ py: 1.1 }}><Typography fontSize={11} fontWeight={700} color="text.secondary" sx={{ width: 16 }}>{String(index + 1).padStart(2, '0')}</Typography>{product.image ? <Box component="img" src={product.image} alt="" sx={{ width: 35, height: 35, borderRadius: 1.5, objectFit: 'cover', bgcolor: 'action.hover' }} /> : <Avatar variant="rounded" sx={{ width: 35, height: 35, bgcolor: 'action.hover', color: 'text.secondary' }}><Inventory2OutlinedIcon fontSize="small" /></Avatar>}<Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap fontSize={11} fontWeight={700} color="text.primary">{product.name}</Typography><Typography fontSize={10} color="text.secondary">{product.unitsSold} purchased</Typography></Box><Typography fontSize={10} fontWeight={700} color="text.primary">{formatPrice(product.revenueMinor)}</Typography></Stack>)}</Stack>}
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} xl={8}>
          <Panel sx={{ overflow: 'hidden', height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5, pb: 1.6 }}><Box><Typography fontSize={16} fontWeight={800} color="text.primary">Best selling products</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Ranked by units in paid orders</Typography></Box><Button size="small" onClick={() => onNavigate?.('products')}>Product list</Button></Stack>
            <TableContainer><Table size="small" aria-label="Best selling products" sx={{ minWidth: 520 }}><TableHead><TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? '#1B2638' : '#F7F9FC' }}>{['Product', 'Units sold', 'Stock', 'Price', 'Sales'].map((label, index) => <TableCell key={label} align={index ? 'right' : 'left'} sx={{ py: 1.25, color: 'text.secondary', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .45 }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{topProducts.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Best sellers appear after completed payments.</TableCell></TableRow> : topProducts.map((product) => <TableRow key={product.id} hover><TableCell><Stack direction="row" alignItems="center" spacing={1}>{product.image ? <Box component="img" src={product.image} alt="" sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }} /> : <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}><Inventory2OutlinedIcon sx={{ fontSize: 16 }} /></Avatar>}<Typography fontSize={11} fontWeight={700}>{product.name}</Typography></Stack></TableCell><TableCell align="right" sx={{ fontSize: 11 }}>{product.unitsSold}</TableCell><TableCell align="right" sx={{ fontSize: 11 }}>{product.stock}</TableCell><TableCell align="right" sx={{ fontSize: 11 }}>{formatPrice(product.priceMinor)}</TableCell><TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>{formatPrice(product.revenueMinor)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
          </Panel>
        </Grid>
        <Grid item xs={12} xl={4}>
          <Panel sx={{ p: 2.5, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontSize={16} fontWeight={800} color="text.primary">Add new product</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .35 }}>Start with a category or open the form</Typography></Box><Button onClick={() => onCreateProduct?.() || onNavigate?.('products')} startIcon={<AddOutlinedIcon />} size="small" variant="contained">Add</Button></Stack>
            <Typography sx={{ mt: 2.2, mb: .8, fontSize: 10, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7 }}>Categories</Typography>
            <Stack direction="row" gap={.8} flexWrap="wrap">{categories.slice(0, 5).map((category) => <Chip key={category._id || category.id} label={category.name} onClick={() => onNavigate?.('categories')} variant="outlined" size="small" sx={{ borderColor: 'divider', color: 'text.primary', fontSize: 10 }} />)}{categories.length === 0 && <Typography fontSize={11} color="text.secondary">No categories available</Typography>}</Stack>
            <Typography sx={{ mt: 2.2, mb: .8, fontSize: 10, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7 }}>Recently added</Typography>
            <Stack spacing={.25}>{(productsQuery.data?.data ?? []).slice(0, 3).map((product) => <Stack key={product._id || product.id} direction="row" alignItems="center" spacing={1} sx={{ py: .7 }}>{product.images?.[0] ? <Box component="img" src={product.images[0]} alt="" sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' }} /> : <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: 'action.hover', color: 'text.secondary' }}><Inventory2OutlinedIcon sx={{ fontSize: 16 }} /></Avatar>}<Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap fontSize={11} fontWeight={600}>{product.name}</Typography><Typography fontSize={10} color="text.secondary">{formatPrice(product.priceMinor)}</Typography></Box><Button size="small" onClick={() => onNavigate?.('products')} sx={{ minWidth: 0, px: 1 }}>Edit</Button></Stack>)}</Stack>
            <Button fullWidth size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => onNavigate?.('products')} sx={{ mt: 1.3, borderTop: '1px solid', borderColor: 'divider', borderRadius: 0, pt: 1.4 }}>Open product manager</Button>
          </Panel>
        </Grid>
      </Grid>

      <Typography fontSize={10} color="text.secondary" sx={{ textAlign: 'right' }}>Signed in as {user?.isPrimaryAdmin ? 'Primary administrator' : 'Administrator'} · paid sales update when a payment is confirmed</Typography>
    </Stack>
  )
}
