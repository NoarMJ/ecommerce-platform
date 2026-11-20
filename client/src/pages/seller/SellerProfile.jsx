import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useGetMySellerQuery, useUpdateMySellerMutation } from '../../services/sellerApi';
import { apiErrorMessage, apiFieldErrors } from '../../utils/apiError';
import PageSpinner from '../../components/seller/PageSpinner';

function ReadOnly({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ textTransform: label === 'Account type' ? 'capitalize' : 'none' }}>{value}</Typography>
    </Box>
  );
}

export default function SellerProfile() {
  const { data: seller, isLoading } = useGetMySellerQuery();
  const [updateMySeller, { isLoading: saving }] = useUpdateMySellerMutation();

  const [form, setForm] = useState({ county: '', town: '', description: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { severity, text }

  useEffect(() => {
    if (seller) {
      setForm({ county: seller.county, town: seller.town, description: seller.description || '' });
    }
  }, [seller]);

  if (isLoading || !seller) return <PageSpinner />;

  const editable = seller.status === 'approved';
  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    error: Boolean(errors[name]),
    helperText: errors[name],
    disabled: !editable,
    fullWidth: true,
  });

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});
    try {
      await updateMySeller({
        county: form.county.trim(),
        town: form.town.trim(),
        description: form.description.trim(),
      }).unwrap();
      setMessage({ severity: 'success', text: 'Profile updated.' });
    } catch (err) {
      setErrors(apiFieldErrors(err));
      setMessage({ severity: 'error', text: apiErrorMessage(err) });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }} component="form" onSubmit={submit} noValidate>
      <Stack spacing={2.5}>
        <Typography variant="h5">Shop profile</Typography>
        {message && <Alert severity={message.severity}>{message.text}</Alert>}
        {!editable && <Alert severity="info">Your profile cannot be edited while your account is suspended.</Alert>}

        <ReadOnly label="Shop name" value={seller.shopName} />
        <ReadOnly label="Account type" value={seller.accountType} />
        {seller.companyName && <ReadOnly label="Company" value={seller.companyName} />}
        <Typography variant="caption" color="text.secondary">
          Shop name and account type were reviewed by our team. Contact support to change them.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField {...field('county')} label="County" />
          <TextField {...field('town')} label="Town" />
        </Stack>
        <TextField {...field('description')} label="About your shop" multiline minRows={3} />

        {editable && (
          <Box>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
