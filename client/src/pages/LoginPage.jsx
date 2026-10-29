
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
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
import { useLoginMutation } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [login, { isLoading }] = useLoginMutation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.')
      return
    }

    try {
      await login({
        email: email.trim(),
        password,
      }).unwrap()

      // Return to the page the user originally wanted to visit.
      const destination = location.state?.from?.pathname || '/'

      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(
        error?.data?.message ||
          error?.data?.error?.message ||
          'Sign in failed. Please check your details and try again.',
      )
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
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
              Welcome back
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Sign in to your 2 Valid account.
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" role="alert">
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography textAlign="center" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Create an account
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}
