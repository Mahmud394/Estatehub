import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingSpinner } from './StateViews.jsx';

// Wrap a page: <ProtectedRoute roles={['broker']}><Page /></ProtectedRoute>
// This is a UX convenience. The API rejects unauthorized requests on its own.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
