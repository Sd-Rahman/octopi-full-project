import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Public org signup. Creates a PENDING org + admin user, then sends the
// browser to Stripe Checkout. Nothing here activates anything — only
// the backend webhook does that once Stripe confirms payment.
export default function RegisterPage() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ orgName: '', adminName: '', adminEmail: '', adminPassword: '', planId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/plans').then(setPlans).catch(() => setError('Could not load plans'));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/register', { method: 'POST', body: form });
      login(data.user, data.token);
      window.location.href = data.checkoutUrl; // full redirect to Stripe's hosted page
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-brand">
          <div className="logo-icon">🐙</div>
          <h1>Register your organization</h1>
          <p>Get started with a multi-tenant subscription</p>
        </div>

        {error && <div className="error-text">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Organization name</label>
          <input
            name="orgName"
            placeholder="Acme Corp"
            value={form.orgName}
            onChange={handleChange}
            required
          />

          <label>Your full name</label>
          <input
            name="adminName"
            placeholder="Sarah Connor"
            value={form.adminName}
            onChange={handleChange}
            required
          />

          <label>Your work email</label>
          <input
            type="email"
            name="adminEmail"
            placeholder="sarah@acme.com"
            value={form.adminEmail}
            onChange={handleChange}
            required
          />

          <label>Admin password</label>
          <input
            type="password"
            name="adminPassword"
            placeholder="At least 6 characters"
            value={form.adminPassword}
            onChange={handleChange}
            required
            minLength={6}
          />

          <label>Select Plan</label>
          <select name="planId" value={form.planId} onChange={handleChange} required>
            <option value="" disabled>Select a subscription plan</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} — ${(p.price / 100).toFixed(2)}/{p.billingInterval === 'monthly' ? 'mo' : 'yr'}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Creating...' : 'Continue to payment'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', marginBottom: 0, textAlign: 'center', fontSize: '0.88rem' }}>
          Already have an account? <a href="/login">Log in here</a>
        </p>
      </div>
    </div>
  );
}
