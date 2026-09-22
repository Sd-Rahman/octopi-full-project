import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminOrgs, useDeleteOrg } from '../../api/hooks.js';
import AdminLayout from './AdminLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function OrgsListPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const { data: orgs = [], isLoading, isError, error } = useAdminOrgs(token, appliedFilters);
  const deleteOrgMutation = useDeleteOrg(token);

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${name}"?\n\nThis will remove the organization, all its members, subscriptions, payments, and transaction history. This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteOrgMutation.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    setAppliedFilters({ ...(search && { search }), ...(status && { status }) });
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setAppliedFilters({});
  };

  return (
    <AdminLayout>
      <div className="card-header-flex">
        <div>
          <h1>Organizations</h1>
          <p>Directory of all client organizations and their subscription status</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <form
          className="toolbar"
          onSubmit={applyFilters}
          style={{ marginBottom: 0 }}
        >
          <input
            placeholder="Search by organization name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 0, maxWidth: 280 }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ marginBottom: 0, maxWidth: 180 }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit">Filter</button>
          {(search || status) && (
            <button type="button" className="secondary" onClick={resetFilters}>
              Reset
            </button>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="page-center" style={{ minHeight: '200px' }}>Loading organizations...</div>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load organizations"
          description={error?.message || 'There was a problem fetching organizations.'}
        />
      ) : orgs.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No organizations found"
          description={
            appliedFilters.search || appliedFilters.status
              ? 'No organizations match your current search and filter criteria.'
              : 'No organizations have been registered in the system yet.'
          }
          actionText={appliedFilters.search || appliedFilters.status ? 'Clear filters' : undefined}
          onAction={appliedFilters.search || appliedFilters.status ? resetFilters : undefined}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Current Plan</th>
                <th>Status</th>
                <th>Members</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o._id}>
                  <td style={{ fontWeight: 600 }}>{o.name}</td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--primary)' }}>
                      {o.currentPlan?.name || '—'}
                    </span>
                  </td>
                  <td><Badge status={o.status} /></td>
                  <td>{o.memberCount || 0}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <Link to={`/admin/orgs/${o._id}`}>
                        <button type="button" className="secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                          View
                        </button>
                      </Link>
                      <button
                        type="button"
                        className="danger"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(o._id, o.name)}
                        disabled={deleteOrgMutation.isPending}
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
    </AdminLayout>
  );
}
