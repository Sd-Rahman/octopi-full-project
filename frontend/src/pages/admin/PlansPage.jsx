import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminPlans, useCreatePlan, useUpdatePlan, useTogglePlan, useDeletePlan } from '../../api/hooks.js';
import AdminLayout from './AdminLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function PlansPage() {
  const { token } = useAuth();
  const { data: plans = [], isLoading, isError, error: fetchError } = useAdminPlans(token);
  const createMutation = useCreatePlan(token);
  const updateMutation = useUpdatePlan(token);
  const toggleMutation = useTogglePlan(token);
  const deleteMutation = useDeletePlan(token);

  const [form, setForm] = useState({ name: '', price: '', billingInterval: 'monthly', features: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const buildPayload = () => ({
    name: form.name,
    price: Math.round(Number(form.price) * 100),
    billingInterval: form.billingInterval,
    features: typeof form.features === 'string'
      ? form.features.split(',').map((f) => f.trim()).filter(Boolean)
      : form.features,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...buildPayload() });
        setSuccess(`Plan "${form.name}" updated successfully.`);
        setEditingId(null);
      } else {
        await createMutation.mutateAsync(buildPayload());
        setSuccess(`Plan "${form.name}" created successfully.`);
      }
      setForm({ name: '', price: '', billingInterval: 'monthly', features: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      price: (p.price / 100).toFixed(2),
      billingInterval: p.billingInterval,
      features: (p.features || []).join(', '),
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', price: '', billingInterval: 'monthly', features: '' });
    setError('');
  };

  const toggle = async (id, name, action) => {
    setError('');
    setSuccess('');
    try {
      await toggleMutation.mutateAsync({ id, action });
      setSuccess(action === 'disable' ? `Plan "${name}" disabled.` : `Plan "${name}" re-enabled and active.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteMutation.mutateAsync(id);
      setSuccess(`Plan "${name}" deleted.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="card-header-flex">
        <div>
          <h1>Subscription Plans</h1>
          <p>Define pricing tiers, intervals, and active status for tenant organizations</p>
        </div>
      </div>

      {success && <div className="success-text">{success}</div>}
      {error && <div className="error-text">{error}</div>}
      {fetchError && <div className="error-text">{fetchError.message}</div>}

      <div className="card">
        <div className="card-header-flex">
          <h3>{editingId ? 'Edit Plan' : 'Create New Subscription Plan'}</h3>
          {editingId && (
            <button type="button" className="secondary" onClick={cancelEdit} style={{ fontSize: '0.8rem' }}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Plan Name</label>
              <input
                placeholder="Enterprise"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="49.99"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Billing Interval</label>
              <select
                value={form.billingInterval}
                onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label>Features (comma-separated)</label>
            <input
              placeholder="e.g. Unlimited users, Dedicated support, Custom domain"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={isPending}>
              {isPending
                ? (editingId ? 'Saving changes...' : 'Creating plan...')
                : (editingId ? 'Save Changes' : 'Create Plan')}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Available Subscription Plans</h3>
        {isLoading ? (
          <div className="page-center" style={{ minHeight: '120px' }}>Loading plans...</div>
        ) : isError ? (
          <EmptyState icon="⚠️" title="Failed to load plans" description={fetchError?.message} />
        ) : plans.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No subscription plans yet"
            description="Create your first subscription plan above to allow tenants to subscribe."
          />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Price</th>
                  <th>Interval</th>
                  <th>Features</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td style={{ fontWeight: 600 }}>${(p.price / 100).toFixed(2)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.billingInterval}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {p.features && p.features.length > 0 ? p.features.join(' · ') : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge-active' : 'badge-suspended'}`}>
                        <span className="badge-dot" />
                        {p.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                        {p.isActive ? (
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                            onClick={() => toggle(p._id, p.name, 'disable')}
                            disabled={toggleMutation.isPending}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#059669' }}
                            onClick={() => toggle(p._id, p.name, 'enable')}
                            disabled={toggleMutation.isPending}
                          >
                            Enable
                          </button>
                        )}
                        <button
                          type="button"
                          className="danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(p._id, p.name)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
