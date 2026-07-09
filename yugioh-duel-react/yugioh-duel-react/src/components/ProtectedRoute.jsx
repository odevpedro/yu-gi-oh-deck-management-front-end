import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-shell"><div className="auth-panel"><LoadingSpinner message="AUTENTICANDO..." /></div></div>
  }

  if (requireAuth && !user) {
    return <Navigate to="/" replace />
  }

  if (!requireAuth && user) {
    return <Navigate to="/lobby" replace />
  }

  return children
}
