import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="logo-icon" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link to="/" style={{ display: 'inline-block', marginTop: '1rem' }}>
          <button type="button">Go to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}

