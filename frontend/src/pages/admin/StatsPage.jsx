import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminStats } from '../../api/hooks.js';
import AdminLayout from './AdminLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function StatsPage() {
  const { token } = useAuth();
  const { data: stats, isLoading, isError, error } = useAdminStats(token);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="page-center">Loading platform metrics...</div>
      </AdminLayout>
    );
  }

  if (isError || !stats) {
    return (
      <AdminLayout>
        <EmptyState
          icon="⚠️"
          title="Could not load platform overview"
          description={error?.message || 'There was a problem fetching the platform metrics from the backend.'}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="card-header-flex">
        <div>
          <h1>Platform Overview</h1>
          <p>Real-time metrics and tenant activity across Octopi SaaS</p>
        </div>
        <Link to="/admin/orgs">
          <button type="button" className="secondary">Manage Organizations →</button>
        </Link>
      </div>

      <div className="card-row">
        <div className="stat-card">
          <div className="label">🏢 Organizations</div>
          <div className="value">{stats.totalOrganizations}</div>
          <div className="hint">Registered tenant accounts</div>
        </div>

        <div className="stat-card">
          <div className="label">👥 Total Users</div>
          <div className="value">{stats.totalUsers}</div>
          <div className="hint">Across all organizations</div>
        </div>

        <div className="stat-card">
          <div className="label">⚡ Active Subscriptions</div>
          <div className="value" style={{ color: '#059669' }}>{stats.activeSubscriptions}</div>
          <div className="hint">Paying tenant accounts</div>
        </div>

        <div className="stat-card">
          <div className="label">💳 Total Revenue</div>
          <div className="value">${(stats.totalRevenue / 100).toFixed(2)}</div>
          <div className="hint">Gross transaction volume</div>
        </div>

        <div className="stat-card">
          <div className="label">⚠️ Failed Payments</div>
          <div className="value" style={{ color: stats.failedPaymentCount > 0 ? '#dc2626' : 'inherit' }}>
            {stats.failedPaymentCount}
          </div>
          <div className="hint">Requires attention</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>Recent Organization Signups</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Latest tenants registered on the platform</p>
          </div>
        </div>

        {!stats.recentSignups || stats.recentSignups.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="No organizations registered yet"
            description="When organizations sign up via the registration flow, they will appear here."
          />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Status</th>
                  <th>Signed Up</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((o) => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td><Badge status={o.status} /></td>
                    <td>{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/admin/orgs/${o._id}`}>
                        <button type="button" className="secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          View Details
                        </button>
                      </Link>
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
