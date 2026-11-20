import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAdvanceSellerOrderItemMutation, useGetSellerOrdersQuery, useRequestSellerItemCancellationMutation } from '../../services/sellerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { formatMinor } from '../../utils/money';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const LIMIT = 10;
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderCard({ order, advanceItem, busy }) {
  const { shipping } = order;
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <Typography fontWeight={600}>{order.orderNumber}</Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(order.createdAt).toLocaleDateString()}
          </Typography>
          <SellerStatusChip status={order.orderStatus} />
          <SellerStatusChip status={order.paymentStatus} />
          <Chip
            size="small"
            variant="outlined"
            color={order.readyToFulfil ? 'success' : 'default'}
            label={order.readyToFulfil ? 'Ready to fulfil' : 'Not ready'}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Typography fontWeight={600}>{formatMinor(order.sellerSubtotalMinor)}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box>
            {shipping ? <>
              <Typography variant="subtitle2">Deliver to</Typography>
              <Typography>{shipping.fullName} - {shipping.phone}</Typography>
              <Typography color="text.secondary">{[shipping.addressLine1, shipping.addressLine2, shipping.city, shipping.county, shipping.postalCode].filter(Boolean).join(', ')}</Typography>
            </> : <Alert severity="info">Delivery details are hidden until payment is confirmed or a COD order is released by the admin.</Alert>}
            {order.customerNote && (
              <Typography sx={{ mt: 1 }}>
                <strong>Note:</strong> {order.customerNote}
              </Typography>
            )}
          </Box>

          {!order.readyToFulfil && (
            <Alert severity="info">
              This order is not ready to fulfil yet. Wait until payment is confirmed (or it is not cancelled).
            </Alert>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit price</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Fulfilment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sku || '-'}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatMinor(item.unitPriceMinor)}</TableCell>
                  <TableCell align="right">{formatMinor(item.lineTotalMinor)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SellerStatusChip status={item.fulfilmentStatus} />
                      {item.fulfilmentStatus === 'awaiting_payment' && (order.paymentStatus === 'paid' || (order.paymentMethod === 'cash_on_delivery' && order.orderStatus !== 'pending')) && <Button size="small" disabled={busy} onClick={() => advanceItem(item.id, 'approve')}>Approve</Button>}
                      {item.fulfilmentStatus === 'approved' && <Button size="small" disabled={busy} onClick={() => advanceItem(item.id, 'process')}>Mark processed</Button>}
                      {item.fulfilmentStatus === 'processed' && <Button size="small" disabled={busy} onClick={() => advanceItem(item.id, 'dispatch')}>Dispatch</Button>}
                      {item.fulfilmentStatus === 'dispatched' && <Button size="small" disabled={busy} onClick={() => advanceItem(item.id, 'deliver')}>Mark delivered</Button>}
                      {['awaiting_payment', 'approved', 'processed'].includes(item.fulfilmentStatus) && <Button size="small" color="warning" disabled={busy} onClick={() => {
                        const reason = window.prompt('Why should the admin cancel this item?');
                        if (reason?.trim()) advanceItem(item.id, 'cancel-request', reason.trim());
                      }}>Request cancellation</Button>}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export default function SellerOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [advanceItem, { isLoading: advancing }] = useAdvanceSellerOrderItemMutation();
  const [requestCancellation] = useRequestSellerItemCancellationMutation();
  const { data, isLoading, isError, error } = useGetSellerOrdersQuery({
    page,
    limit: LIMIT,
    status: status || undefined,
  });

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        select
        label="Order status"
        value={status}
        onChange={(e) => {
          setPage(1);
          setStatus(e.target.value);
        }}
        sx={{ width: 200 }}
      >
        <MenuItem value="">All</MenuItem>
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      {isError && <Alert severity="error">{apiErrorMessage(error)}</Alert>}
      {isLoading && <PageSpinner />}

      {data && data.orders.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No orders yet.</Typography>
        </Paper>
      )}

      {data?.orders.map((order) => (
        <OrderCard key={order.id} order={order} busy={advancing} advanceItem={(itemId, action, reason) => action === 'cancel-request' ? requestCancellation({ itemId, reason }) : advanceItem({ itemId, action })} />
      ))}

      {data && data.totalPages > 1 && (
        <Pagination count={data.totalPages} page={page} onChange={(e, value) => setPage(value)} />
      )}
    </Stack>
  );
}
