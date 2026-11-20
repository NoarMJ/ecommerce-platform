import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
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
import { useGetSellerProductsQuery, useSetSellerProductActiveMutation } from '../../services/sellerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { formatMinor } from '../../utils/money';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const LIMIT = 10;

export default function SellerProducts() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');

  const { data, isLoading, isError, error } = useGetSellerProductsQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    isActive: isActive || undefined,
  });
  const [setActive, { isLoading: toggling, error: toggleError }] = useSetSellerProductActiveMutation();

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box component="form" onSubmit={applySearch} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search name or SKU"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={isActive}
            onChange={(e) => {
              setPage(1);
              setIsActive(e.target.value);
            }}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <Button type="submit" variant="outlined">
            Search
          </Button>
        </Box>
        <Button component={RouterLink} to="/seller/products/new" variant="contained">
          Add product
        </Button>
      </Stack>

      {toggleError && <Alert severity="error">{apiErrorMessage(toggleError)}</Alert>}
      {isError && <Alert severity="error">{apiErrorMessage(error)}</Alert>}
      {isLoading && <PageSpinner />}

      {data && data.products.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography gutterBottom>No products found.</Typography>
          <Button component={RouterLink} to="/seller/products/new" variant="contained">
            Add your first product
          </Button>
        </Paper>
      )}

      {data && data.products.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell align="right">{formatMinor(product.priceMinor)}</TableCell>
                  <TableCell align="right">{product.stock}</TableCell>
                  <TableCell>
                    <SellerStatusChip status={product.isActive ? 'approved' : 'cancelled'} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" component={RouterLink} to={`/seller/products/${product.id}/edit`}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color={product.isActive ? 'warning' : 'success'}
                      disabled={toggling}
                      onClick={() => setActive({ id: product.id, active: !product.isActive })}
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

      {data && data.totalPages > 1 && (
        <Pagination count={data.totalPages} page={page} onChange={(e, value) => setPage(value)} />
      )}
    </Stack>
  );
}
