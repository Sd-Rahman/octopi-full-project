import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// This is a UX convenience ONLY — it stops a logged-out or wrong-role
// user from seeing a page's UI. It is NOT the security boundary; that's
// enforced server-side (protect + authorize + requireOrgContext in the
// backend). Even if someone bypassed this component entirely, every
// API call underneath would still be rejected by the backend.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
