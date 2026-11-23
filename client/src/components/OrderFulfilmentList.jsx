import { Box, Chip, Stack, Typography } from '@mui/material'

// Each seller ships their own items, so a multi-seller order can be part
// shipped. Shows one line per seller. Renders nothing for single-shop orders
// that have no seller fulfilments (e.g. items sold by 2 Valid itself).

const COLORS = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'default',
}

const LABELS = {
  pending: 'Preparing',
  processing: 'Being packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function OrderFulfilmentList({ fulfilments = [], title = 'Shipping by seller', compact = false }) {
  if (!fulfilments.length) return null

  return (
    <Box>
      {!compact && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {title}
        </Typography>
      )}
      <Stack spacing={compact ? 0.5 : 1}>
        {fulfilments.map((fulfilment, index) => (
          <Stack
            key={`${fulfilment.shopName}-${index}`}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {fulfilment.shopName || 'Seller'}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              color={COLORS[fulfilment.status] || 'default'}
              label={LABELS[fulfilment.status] || fulfilment.status}
            />
            {(fulfilment.courier || fulfilment.trackingNumber) && (
              <Typography variant="caption" color="text.secondary">
                {[fulfilment.courier, fulfilment.trackingNumber && `Tracking ${fulfilment.trackingNumber}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
