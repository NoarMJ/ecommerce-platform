import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
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

import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'

import {
  useGetSellerProductsQuery,
  useSetSellerProductActiveMutation,
} from '../../services/sellerApi'
import { apiErrorMessage } from '../../utils/apiError'
import { formatMinor } from '../../utils/money'
import PageSpinner from '../../components/seller/PageSpinner'
import SellerStatusChip from '../../components/seller/SellerStatusChip'
import UpdateStockDialog from '../../components/seller/UpdateStockDialog'

const LIMIT = 10
// Text follows light/dark mode; accents below are readable on both.
const INK = 'text.primary'
const MUTED = 'text.secondary'
const BORDER = '#938b21'
const MINT = '#a57b1b'

function Panel({ children, sx = {}, ...props }) {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        minWidth: 0,
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
            bgcolor: '#EAF8F4',
            color: '#676206',
            borderRadius: 1.5,
          }}
        >
          {icon}
        </Avatar>
      </Stack>
    </Panel>
  )
}

function ProductIdentity({ product }) {
  const initials = String(product.name || 'P').trim().slice(0, 1).toUpperCase()

  return (
    <Stack direction="row" alignItems="center" spacing={1.3} sx={{ minWidth: 190 }}>
      <Avatar
        variant="rounded"
        sx={{
          width: 42,
          height: 42,
          bgcolor: '#F0F7F4',
          color: '#388E7B',
          border: `1px solid ${BORDER}`,
          borderRadius: 1.5,
          fontSize: '0.9rem',
          fontWeight: 800,
        }}
      >
        {initials || <Inventory2OutlinedIcon fontSize="small" />}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ color: INK, fontSize: '0.78rem', fontWeight: 750, maxWidth: 260 }}>
          {product.name}
        </Typography>
        <Typography sx={{ mt: 0.25, color: MUTED, fontSize: '0.67rem' }}>
          Product listing
        </Typography>
      </Box>
    </Stack>
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
          color: '#267e6b',
          borderRadius: 2,
        }}
      >
        <Inventory2OutlinedIcon />
      </Avatar>
      <Typography sx={{ mt: 1.5, color: INK, fontWeight: 800, fontSize: '0.9rem' }}>
        {filtered ? 'No products match these filters' : 'Your catalogue is empty'}
      </Typography>
      <Typography sx={{ mt: 0.5, color: MUTED, fontSize: '0.75rem' }}>
        {filtered
          ? 'Try a different search term or change the status filter.'
          : 'Add your first product to start building your store catalogue.'}
      </Typography>
    </Box>
  )
}

export default function SellerProducts() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('')
  const [stockProduct, setStockProduct] = useState(null)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetSellerProductsQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    isActive: isActive || undefined,
  })

  const [setActive, { isLoading: toggling, error: toggleError }] =
    useSetSellerProductActiveMutation()

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0
  const hasFilters = Boolean(search || isActive)

  const applySearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setIsActive('')
    setPage(1)
  }

  const handleStatusChange = (event) => {
    setPage(1)
    setIsActive(event.target.value)
  }

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
            Products
          </Typography>
          <Typography sx={{ mt: 0.55, color: MUTED, fontSize: '0.84rem' }}>
            Manage your catalogue, prices and stock availability.
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/seller/products/new"
          variant="contained"
          startIcon={<AddRoundedIcon />}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            bgcolor: MINT,
            color: '#efe8e8',
            borderRadius: 1.7,
            px: 2,
            py: 1.1,
            textTransform: 'none',
            fontWeight: 750,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0f1715', boxShadow: 'none' },
          }}
        >
          Add product
        </Button>
      </Stack>

      {/* Catalogue summary */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Products in catalogue"
            value={isLoading ? '—' : total.toLocaleString()}
            helper="Matching your current filters"
            icon={<Inventory2OutlinedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Showing on this page"
            value={isLoading ? '—' : products.length.toLocaleString()}
            helper={`Up to ${LIMIT} products per page`}
            icon={<Inventory2OutlinedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SummaryCard
            label="Current view"
            value={isActive === 'true' ? 'Active' : isActive === 'false' ? 'Inactive' : 'All'}
            helper={search ? `Search: “${search}”` : 'Product status filter'}
            icon={<FilterListRoundedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {toggleError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {apiErrorMessage(toggleError)}
        </Alert>
      )}
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

      {/* Search and filters */}
      <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack
          component="form"
          onSubmit={applySearch}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.2}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Search by product name or SKU"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'action.hover',
                borderRadius: 1.7,
                fontSize: '0.8rem',
              },
            }}
          />

          <TextField
            size="small"
            select
            label="Product status"
            value={isActive}
            onChange={handleStatusChange}
            sx={{
              minWidth: { xs: '100%', md: 175 },
              '& .MuiOutlinedInput-root': { borderRadius: 1.7, fontSize: '0.8rem' },
              '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            }}
          >
            <MenuItem value="">All products</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>

          <Stack direction="row" spacing={1}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              sx={{
                flex: { xs: 1, md: 'initial' },
                bgcolor: MINT,
                color: '#efe8e8',
                borderRadius: 1.7,
                px: 2,
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#172A24', boxShadow: 'none' },
              }}
            >
              Search
            </Button>
            {hasFilters && (
              <Button
                type="button"
                onClick={clearFilters}
                sx={{ color: MUTED, borderRadius: 1.7, textTransform: 'none', fontWeight: 700 }}
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              onClick={refetch}
              disabled={isFetching}
              aria-label="Refresh products"
              sx={{
                minWidth: 40,
                px: 1,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 1.7,
              }}
            >
              <RefreshRoundedIcon fontSize="small" />
            </Button>
          </Stack>
        </Stack>
      </Panel>

      {/* Product table */}
      <Panel sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            px: { xs: 1.8, sm: 2.3 },
            py: 1.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ color: INK, fontSize: '0.92rem', fontWeight: 800 }}>
              Product catalogue
            </Typography>
            <Typography sx={{ mt: 0.3, color: MUTED, fontSize: '0.7rem' }}>
              {total.toLocaleString()} {total === 1 ? 'product' : 'products'} found
            </Typography>
          </Box>
          {isFetching && !isLoading && (
            <Chip
              size="small"
              label="Updating…"
              sx={{ bgcolor: '#EAF8F4', color: '#279A82', fontSize: '0.67rem', fontWeight: 700 }}
            />
          )}
        </Box>

        {isLoading ? (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <PageSpinner />
          </Box>
        ) : products.length === 0 ? (
          <EmptyState filtered={hasFilters} />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="medium" aria-label="Seller product catalogue" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  {[
                    { label: 'Product', align: 'left' },
                    { label: 'SKU', align: 'left' },
                    { label: 'Price', align: 'right' },
                    { label: 'Stock', align: 'right' },
                    { label: 'Status', align: 'left' },
                    { label: 'Actions', align: 'right' },
                  ].map((column) => (
                    <TableCell
                      key={column.label}
                      align={column.align}
                      sx={{
                        py: 1.25,
                        color: '#7C8985',
                        borderColor: BORDER,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        letterSpacing: 0.45,
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
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ py: 1.4, borderColor: BORDER }}>
                      <ProductIdentity product={product} />
                    </TableCell>
                    <TableCell
                      sx={{
                        color: MUTED,
                        fontSize: '0.73rem',
                        borderColor: BORDER,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {product.sku || '—'}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: INK,
                        fontSize: '0.76rem',
                        fontWeight: 750,
                        borderColor: BORDER,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMinor(product.priceMinor)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: product.stock <= 5 ? '#B7791F' : INK,
                        fontSize: '0.76rem',
                        fontWeight: 750,
                        borderColor: BORDER,
                      }}
                    >
                      {product.stock ?? 0}
                    </TableCell>
                    <TableCell sx={{ borderColor: BORDER }}>
                      <SellerStatusChip status={product.isActive ? 'approved' : 'cancelled'} />
                    </TableCell>
                    <TableCell align="right" sx={{ borderColor: BORDER, whiteSpace: 'nowrap' }}>
                      <Button
                        component={RouterLink}
                        to={`/seller/products/${product.id}/edit`}
                        size="small"
                        startIcon={<EditOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                        sx={{
                          mr: 0.5,
                          color: '#348F7B',
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          textTransform: 'none',
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setStockProduct(product)}
                        startIcon={<InventoryOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                        sx={{
                          mr: 0.5,
                          color: '#348F7B',
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          textTransform: 'none',
                        }}
                      >
                        Update stock
                      </Button>
                      <Button
                        size="small"
                        color={product.isActive ? 'warning' : 'success'}
                        disabled={toggling}
                        onClick={() =>
                          setActive({ id: product.id, active: !product.isActive })
                        }
                        sx={{ fontSize: '0.72rem', fontWeight: 750, textTransform: 'none' }}
                      >
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

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

      <UpdateStockDialog
        open={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        product={stockProduct}
      />
    </Stack>
  )
}
