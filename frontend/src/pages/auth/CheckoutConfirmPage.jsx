import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CheckoutConfirmPage() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId');
  const planId = searchParams.get('planId');
  const { token } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!planId) return;
    apiRequest('/plans')
      .then((plans) => {
        const found = plans.find((p) => p._id === planId);
        setPlan(found || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [planId]);

  const handleConfirmPayment = async () => {
    setError('');
    setProcessing(true);
    try {
      await apiRequest('/billing/confirm-checkout', {
        method: 'POST',
        token,
        body: { orgId, planId },
      });
      navigate('/checkout/success');
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p>Loading checkout session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-brand">
          <div className="logo-icon">💳</div>
          <h1>Checkout &amp; Payment</h1>
          <p>Confirm your plan subscription and complete payment</p>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Selected Plan:</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{plan?.name || 'Subscription'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Billing Cycle:</span>
            <span style={{ textTransform: 'capitalize' }}>{plan?.billingInterval || 'Monthly'}</span>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Total Due Today:</span>
            <span style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--primary)' }}>
              ${plan ? (plan.price / 100).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={processing}
          style={{ width: '100%', padding: '0.85rem' }}
        >
          {processing ? 'Processing Payment...' : `Confirm & Pay $${plan ? (plan.price / 100).toFixed(2) : '0.00'}`}
        </button>

        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <Link to="/org/subscription">Cancel and return to subscription</Link>
        </p>
      </div>
    </div>
  );
}
