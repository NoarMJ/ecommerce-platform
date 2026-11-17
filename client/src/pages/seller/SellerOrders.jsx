import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
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
import { useGetSellerOrdersQuery } from '../../services/sellerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { formatMinor } from '../../utils/money';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const LIMIT = 10;
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderCard({ order }) {
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
            <Typography variant="subtitle2">Deliver to</Typography>
            <Typography>{shipping.fullName} - {shipping.phone}</Typography>
            <Typography color="text.secondary">
              {[shipping.addressLine1, shipping.addressLine2, shipping.city, shipping.county, shipping.postalCode]
                .filter(Boolean)
                .join(', ')}
            </Typography>
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
        <OrderCard key={order.id} order={order} />
      ))}

      {data && data.totalPages > 1 && (
        <Pagination count={data.totalPages} page={page} onChange={(e, value) => setPage(value)} />
      )}
    </Stack>
  );
}
