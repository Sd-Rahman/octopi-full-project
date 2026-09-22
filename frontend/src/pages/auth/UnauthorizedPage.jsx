import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="logo-icon" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
        <h1>Access Denied</h1>
        <p>Your account role does not have permission to access this page.</p>
        <Link to="/login" style={{ display: 'inline-block', marginTop: '1rem' }}>
          <button type="button">Return to Login</button>
        </Link>
      </div>
    </div>
  );
}

