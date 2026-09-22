import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminOrgDetail, useSuspendOrg, useReactivateOrg } from '../../api/hooks.js';
import AdminLayout from './AdminLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function OrgDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data, isLoading, isError, error: fetchError } = useAdminOrgDetail(token, id);
  const suspendMutation = useSuspendOrg(token);
  const reactivateMutation = useReactivateOrg(token);

  const suspend = () => suspendMutation.mutate({ id, reason: '' });
  const reactivate = () => reactivateMutation.mutate(id);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="page-center">Loading organization details...</div>
      </AdminLayout>
    );
  }

  if (isError || !data || !data.org) {
    return (
      <AdminLayout>
        <EmptyState
          icon="⚠️"
          title="Organization not found"
          description={fetchError?.message || 'The requested organization could not be found or has been removed.'}
          actionText="Back to Organizations"
          onAction={() => window.history.back()}
        />
      </AdminLayout>
    );
  }

  const { org, members, payments, transactions } = data;

  return (
    <AdminLayout>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/orgs" style={{ fontSize: '0.88rem' }}>← Back to Organizations</Link>
      </div>

      <div className="card-header-flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>{org.name}</h1>
          <Badge status={org.status} />
        </div>
        <div>
          {org.status === 'suspended' ? (
            <button type="button" onClick={reactivate} disabled={reactivateMutation.isPending}>
              {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Organization'}
            </button>
          ) : (
            <button type="button" className="danger" onClick={suspend} disabled={suspendMutation.isPending}>
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend Organization'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Organization Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Billing Email
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500, marginTop: '0.25rem' }}>
              {org.billingEmail}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Contact Email
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500, marginTop: '0.25rem' }}>
              {org.contactEmail || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Subscription Tier
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {org.currentPlan?.name || 'No active plan'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Member Count
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500, marginTop: '0.25rem' }}>
              {members?.length || 0} active members
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Team Members ({members?.length || 0})</h3>
        {!members || members.length === 0 ? (
          <EmptyState icon="👥" title="No members found" description="No users belong to this organization yet." />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.email}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                        {(m.role || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td><Badge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Transactions History</h3>
        {!transactions || transactions.length === 0 ? (
          <EmptyState icon="💳" title="No transactions" description="No transactions recorded for this organization yet." />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td style={{ textTransform: 'capitalize' }}>{(t.type || '').replace(/_/g, ' ')}</td>
                    <td style={{ fontWeight: 600 }}>${(t.amount / 100).toFixed(2)}</td>
                    <td><Badge status={t.status} /></td>
                    <td>{new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
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
