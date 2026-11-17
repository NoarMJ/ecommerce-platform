import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import PageSpinner from '../../components/seller/PageSpinner';

const LIMIT = 10;

// Expects GET /api/admin/customers?search&page&limit ->
// { customers: [{ id, firstName, lastName, email, phoneNumber, isActive, createdAt }], page, limit, total, totalPages }
export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useGetAdminCustomersQuery({
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Customers</Typography>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        sx={{ display: 'flex', gap: 1 }}
      >
        <TextField
          size="small"
          label="Search name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 280 }}
        />
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
                <TableCell>Status</TableCell>
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
                  <TableCell>
                    <Chip size="small" color={c.isActive ? 'success' : 'default'} label={c.isActive ? 'Active' : 'Inactive'} />
                  </TableCell>
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
