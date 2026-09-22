import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const roleHome = { platform_admin: '/admin', org_admin: '/org', org_member: '/member' };

  if (user && roleHome[user.role]) {
    return <Navigate to={roleHome[user.role]} replace />;
  }

  const fillDemo = (e, p) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
      login(data.user, data.token);
      navigate(roleHome[data.user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-icon">🐙</div>
          <h1>Welcome to Octopi</h1>
          <p>Multi-Tenant SaaS Subscription Platform</p>
        </div>

        {error && <div className="error-text">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.25rem' }}>
            {loading ? 'Signing in...' : 'Sign in to account'}
          </button>
        </form>

        <div className="demo-credentials-box">
          <div className="demo-credentials-title">Quick Demo Logins</div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('admin@octopi.dev', 'Admin123!')}
            >
              👑 Platform Admin
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('admin@acme.com', 'Password123!')}
            >
              🏢 Org Admin (Acme)
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('bob@acme.com', 'Password123!')}
            >
              👤 Member (Acme)
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => fillDemo('admin@starlight.io', 'Password123!')}
            >
              ⭐ Org Admin (Starlight)
            </button>
          </div>
        </div>

        <p style={{ marginTop: '1.5rem', marginBottom: 0, textAlign: 'center', fontSize: '0.88rem' }}>
          <Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Register organization</Link>
        </p>
      </div>
    </div>
  );
}
