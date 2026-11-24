import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

import {
  useGetMySellerQuery,
  useUpdateMySellerMutation,
} from '../../services/sellerApi'
import { apiErrorMessage, apiFieldErrors } from '../../utils/apiError'
import PageSpinner from '../../components/seller/PageSpinner'

// Text, borders and surfaces follow light/dark mode.
const INK = 'text.primary'
const MUTED = 'text.secondary'
const BORDER = 'divider'
const MINT = '#279A82'

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.2}
    >
      <Box>
        {eyebrow && (
          <Typography
            sx={{
              color: MINT,
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography sx={{ mt: 0.35, color: INK, fontSize: '0.98rem', fontWeight: 800 }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.35, color: MUTED, fontSize: '0.75rem' }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  )
}

function InfoTile({ icon, label, value, helper }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.8,
        height: '100%',
        borderColor: BORDER,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Avatar
          variant="rounded"
          sx={{
            width: 34,
            height: 34,
            bgcolor: '#EAF8F4',
            color: MINT,
            borderRadius: 1.5,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: MUTED, fontSize: '0.67rem', fontWeight: 650 }}>
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 0.35,
              color: INK,
              fontSize: '0.82rem',
              fontWeight: 750,
              textTransform: label === 'Account type' ? 'capitalize' : 'none',
              overflowWrap: 'anywhere',
            }}
          >
            {value || 'Not provided'}
          </Typography>
          {helper && (
            <Typography sx={{ mt: 0.3, color: MUTED, fontSize: '0.66rem' }}>
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}

function getStatusColor(status) {
  if (status === 'approved') return 'success'
  if (status === 'suspended' || status === 'rejected') return 'error'
  if (status === 'pending') return 'warning'
  return 'default'
}

function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function SellerProfile() {
  const {
    data: seller,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMySellerQuery()

  const [updateMySeller, { isLoading: saving }] = useUpdateMySellerMutation()

  const [form, setForm] = useState({
    county: '',
    town: '',
    description: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (seller) {
      setForm({
        county: seller.county || '',
        town: seller.town || '',
        description: seller.description || '',
      })
      setErrors({})
    }
  }, [seller])

  if (isLoading) return <PageSpinner />

  if (isError || !seller) {
    return (
      <Alert
        severity="error"
        sx={{ borderRadius: 2 }}
        action={
          <Button color="inherit" size="small" onClick={refetch} startIcon={<RefreshRoundedIcon />}>
            Retry
          </Button>
        }
      >
        {isError ? apiErrorMessage(error) : 'Your seller profile could not be loaded.'}
      </Alert>
    )
  }

  const editable = seller.status === 'approved'

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setMessage(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    setMessage(null)
    setErrors({})

    try {
      await updateMySeller({
        county: form.county.trim(),
        town: form.town.trim(),
        description: form.description.trim(),
      }).unwrap()

      setMessage({ severity: 'success', text: 'Your shop profile has been updated.' })
    } catch (requestError) {
      setErrors(apiFieldErrors(requestError))
      setMessage({
        severity: 'error',
        text: apiErrorMessage(requestError),
      })
    }
  }

  const shopName = seller.shopName || seller.companyName || 'Your shop'
  const initials = shopName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.8,
      bgcolor: 'background.paper',
    },
    '& .MuiInputLabel-root': { fontSize: '0.84rem' },
    '& .MuiFormHelperText-root': { mx: 0.2 },
  }

  return (
    <Stack spacing={{ xs: 2.2, md: 2.8 }}>
      {/* Page heading */}
      <Box>
        <Typography
          component="h1"
          sx={{
            color: INK,
            fontSize: { xs: '1.55rem', md: '1.85rem' },
            lineHeight: 1.2,
            fontWeight: 850,
            letterSpacing: '-0.045em',
          }}
        >
          Shop profile
        </Typography>
        <Typography sx={{ mt: 0.55, color: MUTED, fontSize: '0.84rem' }}>
          Manage your shop information and the details customers use to learn about your business.
        </Typography>
      </Box>

      {/* Shop identity header */}
      <Paper
        variant="outlined"
        sx={{
          overflow: 'hidden',
          borderColor: BORDER,
          borderRadius: 2.5,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            height: 7,
            background: 'linear-gradient(90deg, #279A82 0%, #8AD9C4 55%, #DDF4EC 100%)',
          }}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ p: { xs: 2, sm: 2.6 } }}
        >
          <Avatar
            variant="rounded"
            sx={{
              width: 64,
              height: 64,
              bgcolor: '#EAF8F4',
              color: MINT,
              border: '1px solid #D8F0E8',
              borderRadius: 2,
              fontSize: '1.25rem',
              fontWeight: 850,
            }}
          >
            {initials || <StorefrontOutlinedIcon />}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: INK, fontSize: '1.08rem', fontWeight: 850 }}>
              {shopName}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.7} sx={{ mt: 0.55 }} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                color={getStatusColor(seller.status)}
                label={formatStatus(seller.status)}
                sx={{ height: 23, fontSize: '0.67rem', fontWeight: 750 }}
              />
              {editable && (
                <Stack direction="row" alignItems="center" spacing={0.45}>
                  <VerifiedOutlinedIcon sx={{ color: MINT, fontSize: 15 }} />
                  <Typography sx={{ color: MUTED, fontSize: '0.68rem' }}>
                    Seller account verified
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              px: 1.5,
              py: 1,
              borderRadius: 1.7,
              bgcolor: 'action.hover',
            }}
          >
            <Typography sx={{ color: MUTED, fontSize: '0.63rem', fontWeight: 700 }}>
              ACCOUNT TYPE
            </Typography>
            <Typography sx={{ mt: 0.2, color: INK, fontSize: '0.78rem', fontWeight: 800, textTransform: 'capitalize' }}>
              {seller.accountType || '—'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {message && (
        <Alert severity={message.severity} sx={{ borderRadius: 2 }}>
          {message.text}
        </Alert>
      )}

      {!editable && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Your shop profile is currently read-only because your seller account is not approved. Contact support if you need help with your account status.
        </Alert>
      )}

      {/* Reviewed account information */}
      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, sm: 2.5 }, borderColor: BORDER, borderRadius: 2.5 }}
      >
        <SectionHeading
          eyebrow="Account information"
          title="Business details"
          description="These details were submitted during seller registration and reviewed by our team."
        />
        <Grid container spacing={1.5} sx={{ mt: 0.7 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoTile
              icon={<StorefrontOutlinedIcon fontSize="small" />}
              label="Shop name"
              value={seller.shopName}
              helper="Contact support to request a change."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoTile
              icon={<BadgeOutlinedIcon fontSize="small" />}
              label="Account type"
              value={seller.accountType}
            />
          </Grid>
          {seller.companyName && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoTile
                icon={<BusinessOutlinedIcon fontSize="small" />}
                label="Registered company"
                value={seller.companyName}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Editable shop details */}
      <Paper
        component="form"
        onSubmit={submit}
        noValidate
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderColor: BORDER,
          borderRadius: 2.5,
        }}
      >
        <Stack spacing={2.2}>
          <SectionHeading
            eyebrow="Public shop details"
            title="Location and description"
            description="Keep these details accurate so customers know where your business operates and what you sell."
            action={
              <Chip
                size="small"
                icon={<EditOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                label={editable ? 'Editable' : 'Read-only'}
                variant="outlined"
                color={editable ? 'success' : 'default'}
                sx={{ fontSize: '0.67rem', fontWeight: 700 }}
              />
            }
          />

          <Divider sx={{ borderColor: BORDER }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="county"
                label="County"
                placeholder="e.g. Nairobi"
                value={form.county}
                onChange={handleFieldChange}
                error={Boolean(errors.county)}
                helperText={errors.county}
                disabled={!editable || saving}
                fullWidth
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="town"
                label="Town"
                placeholder="e.g. Roysambu"
                value={form.town}
                onChange={handleFieldChange}
                error={Boolean(errors.town)}
                helperText={errors.town}
                disabled={!editable || saving}
                fullWidth
                sx={fieldSx}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="description"
                label="About your shop"
                placeholder="Tell customers what your shop offers and what makes it useful to them."
                value={form.description}
                onChange={handleFieldChange}
                error={Boolean(errors.description)}
                helperText={errors.description || 'A short, clear description works best.'}
                disabled={!editable || saving}
                fullWidth
                multiline
                minRows={4}
                inputProps={{ maxLength: 1000 }}
                sx={fieldSx}
              />
              <Typography sx={{ mt: 0.55, textAlign: 'right', color: MUTED, fontSize: '0.66rem' }}>
                {form.description.length}/1000
              </Typography>
            </Grid>
          </Grid>

          {editable && (
            <Stack
              direction={{ xs: 'column-reverse', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.2}
              sx={{ pt: 0.5 }}
            >
              <Typography sx={{ color: MUTED, fontSize: '0.68rem' }}>
                Only your location and shop description can be edited here.
              </Typography>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={<SaveOutlinedIcon />}
                sx={{
                  px: 2.4,
                  py: 1.05,
                  borderRadius: 1.8,
                  bgcolor: '#279A82',
                  boxShadow: 'none',
                  textTransform: 'none',
                  fontWeight: 750,
                  '&:hover': { bgcolor: '#21866F', boxShadow: 'none' },
                }}
              >
                {saving ? 'Saving changes…' : 'Save changes'}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
