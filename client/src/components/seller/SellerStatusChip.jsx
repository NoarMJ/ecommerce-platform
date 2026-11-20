import { Chip } from '@mui/material';

const COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  suspended: 'default',
  // order / payment statuses
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'default',
  paid: 'success',
  failed: 'error',
  refunded: 'default',
};

export default function SellerStatusChip({ status, size = 'small' }) {
  return (
    <Chip
      size={size}
      color={COLORS[status] || 'default'}
      label={status}
      sx={{ textTransform: 'capitalize' }}
    />
  );
}
