import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest(`/auth/reset-password/${token}`, { method: 'POST', body: { password } });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-card">
      <h1>Set a new password</h1>
      <form onSubmit={handleSubmit}>
        <label>New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <div className="error-text">{error}</div>}
        <button type="submit">Reset password</button>
      </form>
    </div>
  );
}
