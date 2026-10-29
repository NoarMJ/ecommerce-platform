import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  useGetCartQuery,
  useGetMeQuery,
  usePlaceOrderMutation,
  usePayOrderWithMpesaMutation,
} from '../services/api'
import { formatPrice } from '../utils/formatPrice'

const PHONE_PATTERN = /^(?:\+?254|0)[17]\d{8}$/

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { data: user } = useGetMeQuery()
  const { data: cart, isLoading, isError } = useGetCartQuery()
  const [placeOrder, { isLoading: isPlacing }] = usePlaceOrderMutation()

  // One key per visit to this page. A retry or double-click reuses it,
  // so the backend returns the same order instead of creating another.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const [form, setForm] = useState({
    fullName: user?.name ?? '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postalCode: '',
    customerNote: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')

  const [payOrderWithMpesa] = usePayOrderWithMpesaMutation()
    const [mpesaPhone, setMpesaPhone] = useState('')


  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  const items = cart?.items ?? cart?.data?.items ?? []
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product?.priceMinor ?? 0) * item.quantity,
    0
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validate = () => {
    const errors = {}
    if (!form.fullName.trim()) errors.fullName = 'Full name is required'
    if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, '')))
      errors.phone = 'Enter a valid Kenyan number, e.g. 0712345678'
    if (!form.addressLine1.trim()) errors.addressLine1 = 'Address is required'
    if (!form.city.trim()) errors.city = 'City is required'
    if (!form.county.trim()) errors.county = 'County is required'
    if (
        paymentMethod === 'mpesa' &&
        mpesaPhone.trim() &&
        !PHONE_PATTERN.test(mpesaPhone.replace(/[\s-]/g, ''))
        ) {
        errors.mpesaPhone = 'Enter a valid Safaricom number, e.g. 0712345678'
        }
    return errors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      const order = await placeOrder({
        idempotencyKey,
        shippingAddress: {
          fullName: form.fullName,
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          county: form.county,
          postalCode: form.postalCode,
        },
        paymentMethod,
        customerNote: form.customerNote,
      }).unwrap()

        if (paymentMethod === 'mpesa') {
        // Send the prompt. If it fails, the payment page offers a retry.
        let promptError = ''
        try {
            await payOrderWithMpesa({
            orderId: order._id,
            phone: mpesaPhone.trim() || form.phone,
            }).unwrap()
        } catch (error) {
            promptError =
            error?.data?.message ?? 'We could not send the M-Pesa prompt. Please try again.'
        }

        navigate(`/orders/${order._id}/payment`, {
            replace: true,
            state: { promptError, phone: mpesaPhone.trim() || form.phone },
        })
        return
        }

navigate(`/orders/${order._id}/confirmation`, { replace: true })    } catch (error) {
      setSubmitError(
        error?.data?.message ?? 'We could not place your order. Please try again.'
      )
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error">We couldn’t load your cart. Please refresh.</Alert>
      </Container>
    )
  }

  // Nothing to check out.
  if (items.length === 0) {
    return <Navigate to="/cart" replace />
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Checkout
      </Typography>

      <Grid container spacing={3}>
        {/* Delivery + payment form */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Box component="form" onSubmit={handleSubmit} noValidate id="checkout-form">
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Delivery details
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    label="Full name"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    error={!!fieldErrors.fullName}
                    helperText={fieldErrors.fullName ?? 'Who will receive the order'}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Phone number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    error={!!fieldErrors.phone}
                    helperText={fieldErrors.phone ?? 'The courier will call this number'}
                    placeholder="0712345678"
                    required
                    fullWidth
                  />
                  <TextField
                    label="Address"
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={handleChange}
                    error={!!fieldErrors.addressLine1}
                    helperText={fieldErrors.addressLine1 ?? 'House number, street or building'}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Apartment or directions (optional)"
                    name="addressLine2"
                    value={form.addressLine2}
                    onChange={handleChange}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="City"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      error={!!fieldErrors.city}
                      helperText={fieldErrors.city}
                      required
                      fullWidth
                    />
                    <TextField
                      label="County"
                      name="county"
                      value={form.county}
                      onChange={handleChange}
                      error={!!fieldErrors.county}
                      helperText={fieldErrors.county}
                      required
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Postal code (optional)"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                    label="Delivery note (optional)"
                    name="customerNote"
                    value={form.customerNote}
                    onChange={handleChange}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Payment method
                </Typography>

                <RadioGroup
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                >
                    <FormControlLabel
                    value="mpesa"
                    control={<Radio />}
                    label="M-Pesa (pay now on your phone)"
                    />
                    <FormControlLabel
                    value="cash_on_delivery"
                    control={<Radio />}
                    label="Cash on delivery"
                    />
                </RadioGroup>

                {paymentMethod === 'mpesa' ? (
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <TextField
                        label="M-Pesa phone number"
                        value={mpesaPhone}
                        onChange={(event) => {
                        setMpesaPhone(event.target.value)
                        setFieldErrors((prev) => ({ ...prev, mpesaPhone: undefined }))
                        }}
                        error={!!fieldErrors.mpesaPhone}
                        helperText={
                        fieldErrors.mpesaPhone ??
                        'Leave empty to use the delivery phone number. A payment prompt will be sent to this number.'
                        }
                        placeholder="0712345678"
                        fullWidth
                    />
                    </Stack>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                    You pay when your order arrives.
                    </Typography>
                )}
                </Paper>

            </Stack>
          </Box>
        </Grid>

        {/* Order summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: 24 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Order summary
            </Typography>

            <Stack spacing={1.5}>
              {items.map((item) => (
                <Stack
                  key={item.product?._id}
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography variant="body2" sx={{ minWidth: 0 }}>
                    {item.product?.name} × {item.quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatPrice((item.product?.priceMinor ?? 0) * item.quantity)}
                  </Typography>
                </Stack>
              ))}

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>{formatPrice(subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Delivery</Typography>
                <Typography>Calculated at order</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {formatPrice(subtotal)}
                </Typography>
              </Stack>

              {submitError && <Alert severity="error">{submitError}</Alert>}

              <Button
                type="submit"
                form="checkout-form"
                variant="contained"
                size="large"
                fullWidth
                disabled={isPlacing}
              >
                {isPlacing ? 'Placing order…' : 'Place order'}
              </Button>
              <Button component={Link} to="/cart" fullWidth>
                Back to cart
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}