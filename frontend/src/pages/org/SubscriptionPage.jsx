import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgSubscription, usePlans, useCancelSubscription, useChangeSubscriptionPlan } from '../../api/hooks.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function SubscriptionPage() {
  const { token } = useAuth();
  const { data: sub, isLoading: subLoading } = useOrgSubscription(token);
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const cancelMutation = useCancelSubscription(token);
  const changePlanMutation = useChangeSubscriptionPlan(token);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loading = subLoading || plansLoading;

  const changePlan = async (planId) => {
    setMessage('');
    setError('');
    try {
      const data = await changePlanMutation.mutateAsync(planId);
      if (data.checkoutUrl) {
        // Redirect to checkout page for payment
        window.location.href = data.checkoutUrl;
      } else {
        setMessage('Subscription plan successfully changed!');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setMessage('');
    setError('');
    try {
      await cancelMutation.mutateAsync();
      setMessage('Subscription has been cancelled.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <OrgLayout>
        <div className="page-center">Loading subscription details...</div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Subscription Management</h1>
          <p>View your active membership tier and manage billing cycle</p>
        </div>
      </div>

      {message && <div className="success-text">{message}</div>}
      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <h3>Current Plan Status</h3>
        {!sub ? (
          <EmptyState
            icon="⚡"
            title="No active subscription found"
            description="Your organization does not currently have an active recurring plan. Choose a plan below to activate your account."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Tier
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {sub.planId?.name || 'Standard'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Status
              </div>
              <div style={{ marginTop: '0.4rem' }}>
                <Badge status={sub.status} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Next Renewal
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem' }}>
                {sub.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })
                  : '—'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {sub.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="danger"
                  onClick={cancel}
                  disabled={cancelMutation.isPending}
                  style={{ fontSize: '0.85rem' }}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Change Subscription Plan</h3>
        <p style={{ fontSize: '0.88rem' }}>Select an alternate tier for your organization:</p>
        {plans.length === 0 ? (
          <EmptyState icon="📋" title="No plans available" description="No subscription plans are currently configured." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {plans.map((p) => {
              const isCurrent = sub?.planId?._id === p._id || sub?.planId === p._id;
              return (
                <div
                  key={p._id}
                  style={{
                    border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: isCurrent ? 'rgba(99, 102, 241, 0.04)' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name}</div>
                    {isCurrent && (
                      <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>Current Plan</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.5rem 0' }}>
                    ${(p.price / 100).toFixed(2)}
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      /{p.billingInterval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {p.features && p.features.length > 0 && (
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.75rem 0 1.25rem 0' }}>
                      {p.features.map((f, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {!isCurrent && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ width: '100%' }}
                      onClick={() => changePlan(p._id)}
                      disabled={changePlanMutation.isPending}
                    >
                      {changePlanMutation.isPending ? 'Processing...' : `Switch to ${p.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OrgLayout>
  );
}
