import { Link } from 'react-router-dom';

export default function CheckoutSuccessPage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="logo-icon" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1>Payment Initiated</h1>
        <p>
          Your payment is being confirmed via Stripe secure webhook. Once processed, your
          organization and subscription will be fully active.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/login">
            <button type="button" style={{ width: '100%' }}>Continue to Login</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
