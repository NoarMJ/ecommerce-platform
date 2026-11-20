import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Paper,
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
  Typography,
} from '@mui/material';
import { useGetAdminSellersQuery, useReviewSellerMutation } from '../../services/sellerApi';
import { apiErrorMessage } from '../../utils/apiError';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const LIMIT = 10;
const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Suspended', value: 'suspended' },
];

// Which actions an admin may take for each status (mirrors the server's rules).
const ACTIONS = {
  pending: [
    { action: 'approve', label: 'Approve', color: 'success' },
    { action: 'reject', label: 'Reject', color: 'error' },
  ],
  approved: [{ action: 'suspend', label: 'Suspend', color: 'warning' }],
  suspended: [{ action: 'reactivate', label: 'Reactivate', color: 'success' }],
  rejected: [],
};

function Detail({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ textTransform: label === 'Type' ? 'capitalize' : 'none' }}>{value || '-'}</Typography>
    </Box>
  );
}

function ReviewDialog({ seller, onClose }) {
  const [reviewSeller, { isLoading }] = useReviewSellerMutation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const run = async (action) => {
    setError('');
    try {
      await reviewSeller({ id: seller.id, action, reason: reason.trim() }).unwrap();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const { applicant } = seller;

  return (
    <Dialog open onClose={isLoading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {seller.shopName} <SellerStatusChip status={seller.status} />
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Detail label="Applicant" value={applicant && `${applicant.firstName} ${applicant.lastName}`} />
          <Detail label="Email" value={applicant?.email} />
          <Detail label="Phone" value={applicant?.phoneNumber} />
          <Detail label="Type" value={seller.accountType} />
          {seller.companyName && <Detail label="Company" value={seller.companyName} />}
          <Detail label="Date of birth" value={seller.dateOfBirth} />
          <Detail label="Location" value={`${seller.town}, ${seller.county}`} />
          <Detail label="Description" value={seller.description} />
          <Detail label="Submitted" value={new Date(seller.submittedAt).toLocaleString()} />
          {seller.status === 'rejected' && <Detail label="Rejection reason" value={seller.rejectionReason} />}

          {rejecting && (
            <TextField
              label="Reason for rejection (shown to the applicant)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
              helperText="3-500 characters"
              autoFocus
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
        {rejecting ? (
          <>
            <Button onClick={() => setRejecting(false)} disabled={isLoading}>
              Back
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={isLoading || reason.trim().length < 3}
              onClick={() => run('reject')}
            >
              Confirm rejection
            </Button>
          </>
        ) : (
          ACTIONS[seller.status].map(({ action, label, color }) => (
            <Button
              key={action}
              color={color}
              variant="contained"
              disabled={isLoading}
              onClick={() => (action === 'reject' ? setRejecting(true) : run(action))}
            >
              {label}
            </Button>
          ))
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function AdminSellers() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, isError, error } = useGetAdminSellersQuery({
    status: status || undefined,
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  // Read the selected seller from the list so the dialog refreshes after an action.
  const selected = data?.sellers.find((s) => s.id === selectedId);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Sellers</Typography>

      <Tabs
        value={status}
        onChange={(e, value) => {
          setPage(1);
          setStatus(value);
        }}
        variant="scrollable"
      >
        {FILTERS.map((f) => (
          <Tab key={f.value} label={f.label} value={f.value} />
        ))}
      </Tabs>

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
          label="Search shop, company or applicant"
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

      {data && data.sellers.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No sellers found.</Typography>
        </Paper>
      )}

      {data && data.sellers.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Shop</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.sellers.map((seller) => (
                <TableRow key={seller.id} hover>
                  <TableCell>{seller.shopName}</TableCell>
                  <TableCell>
                    {seller.applicant ? `${seller.applicant.firstName} ${seller.applicant.lastName}` : '-'}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {seller.applicant?.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{seller.accountType}</TableCell>
                  <TableCell>{new Date(seller.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <SellerStatusChip status={seller.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setSelectedId(seller.id)}>
                      Review
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

      {selected && <ReviewDialog key={selected.id + selected.status} seller={selected} onClose={() => setSelectedId(null)} />}
    </Stack>
  );
}
