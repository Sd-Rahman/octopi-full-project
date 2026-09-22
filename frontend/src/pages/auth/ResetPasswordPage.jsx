import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const roleHome = {
    platform_admin: '/admin',
    org_admin: '/org',
    org_member: '/member',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: { password },
      });

      if (data.token && data.user) {
        // Log in immediately as the invited member and route straight to their dashboard
        login(data.user, data.token);
        navigate(roleHome[data.user.role] || '/member', { replace: true });
      } else {
        logout();
        navigate('/login', { replace: true });
      }
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
          <div className="logo-icon">🔑</div>
          <h1>Set Your Password</h1>
          <p>Create a password to activate and access your account</p>
        </div>

        {error && <div className="error-text">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>New Password (min 6 characters)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Activating account...' : 'Set Password & Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
