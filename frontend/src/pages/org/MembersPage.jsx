import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgMembers, useInviteMember, useChangeMemberRole, useRemoveMember } from '../../api/hooks.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function MembersPage() {
  const { token } = useAuth();
  const { data: members = [], isLoading, isError, error: fetchError } = useOrgMembers(token);
  const inviteMutation = useInviteMember(token);
  const changeRoleMutation = useChangeMemberRole(token);
  const removeMutation = useRemoveMember(token);

  const [form, setForm] = useState({ name: '', email: '', role: 'org_member' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
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

  const changeRole = (id, role) => {
    changeRoleMutation.mutate({ id, role });
  };

  const remove = (id) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    removeMutation.mutate(id);
  };

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Team Members</h1>
          <p>Manage members, assign administrator privileges, and invite colleagues</p>
        </div>
      </div>

      <div className="card">
        <h3>Invite a New Member</h3>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Full Name</label>
              <input
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                required
              />
            </div>
            <div>
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="org_member">Member (Read-only)</option>
                <option value="org_admin">Admin (Full Access)</option>
              </select>
            </div>
          </div>

          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <button type="submit" disabled={inviteMutation.isPending} style={{ marginTop: '0.25rem' }}>
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
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
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
