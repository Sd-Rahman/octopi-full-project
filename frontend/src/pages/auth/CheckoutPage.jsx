import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CheckoutPage() {
  const { orgId } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest(`/billing/checkout/${orgId}`, { method: 'POST', token });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="logo-icon" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💳</div>
        <h1>Activate Organization</h1>
        <p>Your organization account has been created. Complete payment to activate full access.</p>
        {error && <div className="error-text">{error}</div>}
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? 'Redirecting to Stripe...' : 'Pay & Activate Subscription'}
        </button>
        <p style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '0.88rem' }}>
          <Link to="/login">← Return to Login</Link>
        </p>
      </div>
    </div>
  );
}
