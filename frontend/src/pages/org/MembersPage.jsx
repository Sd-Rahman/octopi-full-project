import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgMembers, useOrgProfile, useInviteMember, useChangeMemberRole, useRemoveMember } from '../../api/hooks.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function MembersPage() {
  const { token } = useAuth();
  const { data: org } = useOrgProfile(token);
  const { data: members = [], isLoading, isError, error: fetchError } = useOrgMembers(token);
  const inviteMutation = useInviteMember(token);
  const changeRoleMutation = useChangeMemberRole(token);
  const removeMutation = useRemoveMember(token);

  const [form, setForm] = useState({ name: '', email: '', role: 'org_member' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOrgActive = org?.status === 'active';
  const isStarter = org?.currentPlan?.name === 'Starter';
  const isStarterLimitReached = isStarter && members.length >= 5;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!isOrgActive) return;
    setError('');
    setSuccess('');
    try {
      await inviteMutation.mutateAsync(form);
      setForm({ name: '', email: '', role: 'org_member' });
      setSuccess(`Invitation sent to ${form.email}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (id, role) => {
    if (!isOrgActive) return;
    setError('');
    setSuccess('');
    try {
      await changeRoleMutation.mutateAsync({ id, role });
      setSuccess('Member role updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!isOrgActive) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setError('');
    setSuccess('');
    try {
      await removeMutation.mutateAsync(id);
      setSuccess('Member removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Team Members</h1>
          <p>Manage members, assign administrator privileges, and invite colleagues</p>
        </div>
      </div>

      {!isOrgActive && org && (
        <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ color: '#dc2626' }}>Subscription {org.status === 'cancelled' ? 'Cancelled' : 'Inactive'}:</strong>{' '}
            <span style={{ fontSize: '0.88rem', color: '#991b1b' }}>
              Your organization currently has no active subscription. Team invitations and management features are locked.
            </span>
          </div>
          <Link to="/org/subscription">
            <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Reactivate
            </button>
          </Link>
        </div>
      )}

      {isStarter && (
        <div style={{ marginBottom: '1.25rem', padding: '0.65rem 1rem', background: '#f0f9ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd', fontSize: '0.85rem', color: '#0369a1' }}>
          ℹ️ <strong>Starter Plan:</strong> Team member usage is <strong>{members.length} / 5</strong>.{' '}
          {isStarterLimitReached ? (
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Limit reached. Upgrade to Pro for unlimited members.</span>
          ) : (
            <span>You have {5 - members.length} slot(s) remaining.</span>
          )}
        </div>
      )}

      <div className="card" style={{ opacity: isOrgActive && !isStarterLimitReached ? 1 : 0.75 }}>
        <h3>Invite a New Member</h3>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Full Name</label>
              <input
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!isOrgActive || isStarterLimitReached}
                required
              />
            </div>
            <div>
              <label>Work Email</label>
              <input
                type="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!isOrgActive || isStarterLimitReached}
                required
              />
            </div>
            <div>
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={!isOrgActive || isStarterLimitReached}
              >
                <option value="org_member">Member (Read-only)</option>
                <option value="org_admin">Admin (Full Access)</option>
              </select>
            </div>
          </div>

          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <button
            type="submit"
            disabled={!isOrgActive || isStarterLimitReached || inviteMutation.isPending}
            style={{ marginTop: '0.25rem' }}
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Current Team ({members.length})</h3>
        {isLoading ? (
          <div className="page-center" style={{ minHeight: '150px' }}>Loading team members...</div>
        ) : isError ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load team members"
            description={fetchError?.message || 'There was a problem fetching team members.'}
          />
        ) : members.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No members yet"
            description="Invite colleagues to your organization using the form above."
          />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.email}</td>
                    <td>
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m._id, e.target.value)}
                        disabled={!isOrgActive}
                        style={{ marginBottom: 0, maxWidth: 140, padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                      >
                        <option value="org_member">Member</option>
                        <option value="org_admin">Admin</option>
                      </select>
                    </td>
                    <td><Badge status={m.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="danger"
                        disabled={!isOrgActive}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', opacity: isOrgActive ? 1 : 0.5 }}
                        onClick={() => remove(m._id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </OrgLayout>
  );
}
