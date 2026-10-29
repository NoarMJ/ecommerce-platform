
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useRegisterMutation } from '../services/api'

export default function RegisterPage() {
  const [register, { isLoading }] = useRegisterMutation()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
  })

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setErrorMessage('Please complete all required fields.')
      return
    }

    if (form.password.length < 8) {
      setErrorMessage('Your password must be at least 8 characters.')
      return
    }

    try {
      await register({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
      }).unwrap()

      setSuccessMessage(
        'Your account has been created. You can now sign in.',
      )

      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
      })
    } catch (error) {
      setErrorMessage(
        error?.data?.message ||
          error?.data?.error?.message ||
          'Unable to create your account. Please try again.',
      )
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              Create your account
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Join 2 Valid to get started.
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" role="alert">
              {errorMessage}
            </Alert>
          )}

          {successMessage && (
            <Alert
              severity="success"
              role="status"
              action={
                <Button
                  component={RouterLink}
                  to="/login"
                  color="inherit"
                  size="small"
                >
                  Sign in
                </Button>
              }
            >
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="First name"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                required
                fullWidth
              />

              <TextField
                label="Last name"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                required
                fullWidth
              />

              <TextField
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                fullWidth
              />

              <TextField
                label="Phone number (optional)"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                fullWidth
              />

              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                helperText="Use at least 8 characters."
                required
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Typography textAlign="center" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}
