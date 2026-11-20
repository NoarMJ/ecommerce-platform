import { useState } from 'react';
import {
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
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useGetAdminCustomersQuery } from '../../services/sellerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { formatMinor } from '../../utils/money';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const LIMIT = 10;

// GET /admin/customers?search&status&seller&page&limit ->
// { customers: [{ id, firstName, lastName, email, phoneNumber, isActive, createdAt,
//                 sellerStatus, orderCount, totalSpentMinor, lastOrderAt }], page, limit, total, totalPages }
export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [seller, setSeller] = useState('');

  const { data, isLoading, isError, error } = useGetAdminCustomersQuery({
    search: search || undefined,
    status: status || undefined,
    seller: seller || undefined,
    page,
    limit: LIMIT,
  });

  const resetPageAnd = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="baseline" spacing={1.5}>
        <Typography variant="h5">Customers</Typography>
        {data && (
          <Typography variant="body2" color="text.secondary">
            {data.total} registered
          </Typography>
        )}
      </Stack>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField
          size="small"
          label="Search name, email or phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField size="small" select label="Account" value={status} onChange={resetPageAnd(setStatus)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        <TextField size="small" select label="Seller" value={seller} onChange={resetPageAnd(setSeller)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="yes">Also a seller</MenuItem>
          <MenuItem value="no">Not a seller</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined">
          Search
        </Button>
      </Box>

      {isError && <Alert severity="error">{apiErrorMessage(error)}</Alert>}
      {isLoading && <PageSpinner />}

      {data && data.customers.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No customers found.</Typography>
        </Paper>
      )}

      {data && data.customers.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Spent (paid)</TableCell>
                <TableCell>Last order</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Seller</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.customers.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    {c.firstName} {c.lastName}
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phoneNumber || '-'}</TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">{c.orderCount}</TableCell>
                  <TableCell align="right">{formatMinor(c.totalSpentMinor)}</TableCell>
                  <TableCell>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" color={c.isActive ? 'success' : 'default'} label={c.isActive ? 'Active' : 'Inactive'} />
                  </TableCell>
                  <TableCell>{c.sellerStatus ? <SellerStatusChip status={c.sellerStatus} /> : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && data.totalPages > 1 && (
        <Pagination count={data.totalPages} page={page} onChange={(e, value) => setPage(value)} />
      )}
    </Stack>
  );
}
