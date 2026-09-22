import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgProfile, useUpdateOrgProfile } from '../../api/hooks.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';

export default function OrgProfilePage() {
  const { token } = useAuth();
  const { data: org, isLoading } = useOrgProfile(token);
  const updateMutation = useUpdateOrgProfile(token);

  const [form, setForm] = useState({ name: '', billingEmail: '', contactEmail: '' });
  const [saved, setSaved] = useState(false);

  // Sync form state when org data loads
  useEffect(() => {
    if (org) {
      setForm({ name: org.name, billingEmail: org.billingEmail, contactEmail: org.contactEmail || '' });
    }
  }, [org]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  if (isLoading) {
    return (
      <OrgLayout>
        <div className="page-center">Loading organization settings...</div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Organization Settings</h1>
          <p>Manage your company profile and communication emails</p>
        </div>
        {org && <Badge status={org.status} />}
      </div>

      <div className="card">
        <h3>General Information</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Organization Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Billing Email</label>
              <input
                type="email"
                value={form.billingEmail}
                onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Contact Email (Optional)</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>

          {saved && <div className="success-text">Profile changes saved successfully!</div>}
          {updateMutation.isError && <div className="error-text">{updateMutation.error?.message || 'Failed to save changes'}</div>}

          <button type="submit" disabled={updateMutation.isPending} style={{ marginTop: '0.5rem' }}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {org && (
        <div className="card">
          <h3>Subscription Status</h3>
          {org.status === 'active' && org.currentPlan ? (
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Active Plan: Currently subscribed to <strong style={{ color: 'var(--primary)' }}>{org.currentPlan.name}</strong> plan.
              </p>
            </div>
          ) : org.status === 'cancelled' ? (
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#dc2626', fontWeight: 600 }}>
                Subscription Cancelled
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your organization does not have an active plan. Team features (like inviting members) are paused until you reactivate.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/org/subscription">
                  <button type="button" className="secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                    ⚡ Choose a Package &amp; Reactivate
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#d97706', fontWeight: 600 }}>
                Subscription Inactive / Pending
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your organization does not have an active recurring subscription. Choose a package to activate your organization.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/org/subscription">
                  <button type="button" className="secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                    ⚡ Choose a Package
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </OrgLayout>
  );
}
