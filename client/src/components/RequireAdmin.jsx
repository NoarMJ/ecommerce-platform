
import { Navigate } from 'react-router-dom'
import { useGetMeQuery } from '../services/api'

export default function RequireAdmin({ children }) {
  const { data: user, isLoading } = useGetMeQuery()

  if (isLoading) {
    return null
  }

  // Signed-out users must sign in first.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Signed-in customers cannot access admin pages.
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
