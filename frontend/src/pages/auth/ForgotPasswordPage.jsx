import { useState } from 'react';
import { apiRequest } from '../../api/client.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
    setMessage(data.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-icon">🐙</div>
          <h1>Reset password</h1>
          <p>We will send a reset link to your email</p>
        </div>

        {message && <div className="success-text">{message}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" style={{ width: '100%' }}>Send reset link</button>
        </form>

        <p style={{ marginTop: '1.5rem', marginBottom: 0, textAlign: 'center', fontSize: '0.88rem' }}>
          Remember your password? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
