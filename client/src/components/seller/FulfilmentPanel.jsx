import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'

import { useUpdateSellerFulfilmentMutation } from '../../services/sellerApi'
import { apiErrorMessage } from '../../utils/apiError'
import SellerStatusChip from './SellerStatusChip'

const STEPS = [
  { status: 'pending', label: 'New' },
  { status: 'processing', label: 'Accepted' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
]

const HISTORY_LABEL = {
  pending: 'Order received',
  processing: 'Accepted',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function ShipDialog({ open, onClose, onConfirm, saving, error }) {
  const [courier, setCourier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [note, setNote] = useState('')

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Mark as shipped</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Confirm you've handed your items to a courier. The customer will see the details below.
          </Typography>
          <TextField
            label="Courier (optional)"
            value={courier}
            onChange={(event) => setCourier(event.target.value.slice(0, 80))}
            placeholder="e.g. G4S, Sendy, own rider"
          />
          <TextField
            label="Tracking number (optional)"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value.slice(0, 80))}
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 200))}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => onConfirm({ courier, trackingNumber, note })}
        >
          {saving ? 'Saving...' : 'Confirm shipped'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// order: a seller order view from the API (has fulfilment, nextStatus, readyToFulfil)
export default function FulfilmentPanel({ order }) {
  const fulfilment = order.fulfilment
  const [updateFulfilment, { isLoading: saving }] = useUpdateSellerFulfilmentMutation()
  const [shipOpen, setShipOpen] = useState(false)
  const [error, setError] = useState('')

  if (!fulfilment) return null

  const cancelled = fulfilment.status === 'cancelled'
  const activeStep = STEPS.findIndex((step) => step.status === fulfilment.status)

  const send = async (body) => {
    setError('')
    try {
      await updateFulfilment({ id: order.id, ...body }).unwrap()
      setShipOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 2.5, bgcolor: 'background.paper' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary' }}>
            Your fulfilment
          </Typography>
          <SellerStatusChip status={fulfilment.status} />
        </Stack>

        {order.nextStatus === 'processing' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckCircleOutlineRoundedIcon />}
            disabled={saving}
            onClick={() => send({ status: 'processing' })}
            sx={{ textTransform: 'none', fontWeight: 750 }}
          >
            {saving ? 'Saving...' : 'Accept order'}
          </Button>
        )}
        {order.nextStatus === 'shipped' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<LocalShippingOutlinedIcon />}
            disabled={saving}
            onClick={() => {
              setError('')
              setShipOpen(true)
            }}
            sx={{ textTransform: 'none', fontWeight: 750 }}
          >
            Mark as shipped
          </Button>
        )}
      </Stack>

      {error && !shipOpen && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      {cancelled ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          This order was cancelled. Don't ship these items.
        </Alert>
      ) : (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 2 }}>
          {STEPS.map((step, index) => (
            <Step key={step.status} completed={index < activeStep || fulfilment.status === 'delivered'}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {fulfilment.status === 'shipped' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Delivery is confirmed by 2 Valid once the customer receives the order.
        </Typography>
      )}

      {(fulfilment.courier || fulfilment.trackingNumber) && (
        <Box sx={{ mt: 1.5, p: 1.2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            SHIPPING DETAILS
          </Typography>
          <Typography variant="body2" color="text.primary">
            {[fulfilment.courier, fulfilment.trackingNumber && `Tracking: ${fulfilment.trackingNumber}`]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>
      )}

      {fulfilment.history?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            STATUS HISTORY
          </Typography>
          <Stack spacing={1} sx={{ mt: 1, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
            {fulfilment.history.map((entry, index) => (
              <Box key={`${entry.status}-${entry.changedAt}-${index}`}>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {HISTORY_LABEL[entry.status] || entry.status}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {formatDateTime(entry.changedAt)}
                  </Typography>
                </Typography>
                {entry.note && (
                  <Typography variant="caption" color="text.secondary">
                    {entry.note}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {shipOpen && (
        <ShipDialog
          open={shipOpen}
          onClose={() => setShipOpen(false)}
          onConfirm={(details) => send({ status: 'shipped', ...details })}
          saving={saving}
          error={error}
        />
      )}
    </Paper>
  )
}
