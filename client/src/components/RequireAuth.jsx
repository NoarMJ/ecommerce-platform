
import { Box, CircularProgress } from '@mui/material'
import { Navigate, useLocation } from 'react-router-dom'
import { useGetMeQuery } from '../services/api'

export default function RequireAuth({ children }) {
  const location = useLocation()
  const { data: user, isLoading } = useGetMeQuery()

  // Wait until we know whether the user is signed in.
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Send signed-out users to login.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  // Allow signed-in users to view the protected page.
  return children
}
