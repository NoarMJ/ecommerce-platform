import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

import {
  useAdjustSellerProductStockMutation,
  useGetSellerProductStockHistoryQuery,
} from '../../services/sellerApi'
import { apiErrorMessage } from '../../utils/apiError'

// What the seller picks -> movement type sent to the server.
const REASONS = {
  add: [
    { key: 'received', label: 'New stock received', type: 'received' },
    { key: 'returned', label: 'Customer return restocked', type: 'received' },
    { key: 'count_up', label: 'Stock count correction', type: 'correction' },
  ],
  remove: [
    { key: 'damaged', label: 'Damaged', type: 'damaged' },
    { key: 'lost', label: 'Lost or stolen', type: 'damaged' },
    { key: 'supplier', label: 'Returned to supplier', type: 'removed' },
    { key: 'other', label: 'Removed for another reason', type: 'removed' },
    { key: 'count_down', label: 'Stock count correction', type: 'correction' },
  ],
}

const ACTIVITY_LABEL = {
  initial: 'Initial stock',
  received: 'Stock received',
  removed: 'Stock removed',
  damaged: 'Damaged / lost',
  correction: 'Correction',
  order: 'Customer order',
  order_cancelled: 'Order cancelled',
}

const MAX_NOTE = 120

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function StockFigure({ label, value, tone }) {
  return (
    <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} color={tone || 'text.primary'}>
        {value}
      </Typography>
    </Box>
  )
}

function StockHistory({ productId }) {
  const { data, isLoading, isError, refetch } = useGetSellerProductStockHistoryQuery(
    { id: productId, limit: 20 },
    { refetchOnMountOrArgChange: true }
  )
  const movements = data?.movements ?? []

  if (isLoading) {
    return (
      <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={22} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refetch}>
            Retry
          </Button>
        }
      >
        Stock history could not be loaded.
      </Alert>
    )
  }

  if (movements.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No stock movements yet.
      </Typography>
    )
  }

  return (
    <>
      <TableContainer>
        <Table size="small" aria-label="Stock history">
          <TableHead>
            <TableRow>
              {['Date', 'Activity', 'Change', 'Stock'].map((label, index) => (
                <TableCell
                  key={label}
                  align={index >= 2 ? 'right' : 'left'}
                  sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem' }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.75rem' }}>
                  {formatDate(movement.createdAt)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {ACTIVITY_LABEL[movement.type] || movement.type}
                  </Typography>
                  {(movement.orderNumber || movement.reason) && (
                    <Typography variant="caption" color="text.secondary">
                      {movement.orderNumber ? `Order ${movement.orderNumber}` : movement.reason}
                    </Typography>
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 800,
                    color: movement.quantityChange > 0 ? 'success.main' : movement.quantityChange < 0 ? 'error.main' : 'text.secondary',
                  }}
                >
                  {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                </TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {movement.stockAfter}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data.total > movements.length && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing the latest {movements.length} of {data.total} movements.
        </Typography>
      )}
    </>
  )
}

// product: { id, name, sku, stock }
export default function UpdateStockDialog({ open, onClose, product, onUpdated }) {
  const [tab, setTab] = useState('update')
  const [direction, setDirection] = useState('add')
  const [reasonKey, setReasonKey] = useState(REASONS.add[0].key)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const [adjustStock, { isLoading: saving }] = useAdjustSellerProductStockMutation()

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (!open) return
    setTab('update')
    setDirection('add')
    setReasonKey(REASONS.add[0].key)
    setQuantity('')
    setNote('')
    setError('')
  }, [open])

  if (!product) return null

  const current = product.stock ?? 0
  const amount = /^\d+$/.test(quantity.trim()) ? Number(quantity) : 0
  const change = direction === 'add' ? amount : -amount
  const after = current + change
  const reason = REASONS[direction].find((option) => option.key === reasonKey)
  const quantityError =
    quantity.trim() && amount < 1
      ? 'Enter a whole number of 1 or more.'
      : after < 0
        ? `You can remove at most ${current} units.`
        : ''
  const canSave = amount >= 1 && after >= 0 && reason && !saving

  const handleDirection = (_event, value) => {
    if (!value) return
    setDirection(value)
    setReasonKey(REASONS[value][0].key)
    setError('')
  }

  const handleSave = async () => {
    if (!canSave) return
    setError('')
    const detail = note.trim()
    try {
      const updated = await adjustStock({
        id: product.id,
        type: reason.type,
        change,
        reason: detail ? `${reason.label}: ${detail}` : reason.label,
      }).unwrap()
      onUpdated?.(updated)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography component="span" variant="h6" fontWeight={800} display="block">
          Inventory
        </Typography>
        <Typography component="span" variant="body2" color="text.secondary">
          {product.name}
          {product.sku ? ` · ${product.sku}` : ''}
        </Typography>
      </DialogTitle>

      <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="update" label="Update stock" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="history" label="History" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      <DialogContent sx={{ pt: 2.5 }}>
        {tab === 'history' ? (
          <StockHistory productId={product.id} />
        ) : (
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1.5} alignItems="center">
              <StockFigure label="Current stock" value={current} />
              <ArrowForwardRoundedIcon sx={{ color: 'text.secondary' }} />
              <StockFigure
                label="After adjustment"
                value={after < 0 ? '—' : after}
                tone={amount < 1 ? undefined : after < 0 ? 'error.main' : direction === 'add' ? 'success.main' : 'warning.main'}
              />
            </Stack>

            <ToggleButtonGroup
              exclusive
              fullWidth
              value={direction}
              onChange={handleDirection}
              aria-label="Adjustment type"
              size="small"
            >
              <ToggleButton value="add" sx={{ textTransform: 'none', fontWeight: 700 }}>
                Add stock
              </ToggleButton>
              <ToggleButton value="remove" sx={{ textTransform: 'none', fontWeight: 700 }}>
                Remove stock
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Quantity"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="numeric"
                error={Boolean(quantityError)}
                helperText={quantityError || ' '}
                sx={{ flex: 1 }}
                autoFocus
              />
              <TextField
                select
                label="Reason"
                value={reasonKey}
                onChange={(event) => setReasonKey(event.target.value)}
                helperText=" "
                sx={{ flex: 2 }}
              >
                {REASONS[direction].map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Note (optional)"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE))}
              placeholder="e.g. Delivery from supplier, invoice #1234"
              helperText={`${note.length}/${MAX_NOTE}`}
            />

            <Typography variant="caption" color="text.secondary">
              Stock is changed by the quantity above, so units already taken by customer orders are never overwritten.
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {tab === 'history' ? 'Close' : 'Cancel'}
        </Button>
        {tab === 'update' && (
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Update inventory'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
