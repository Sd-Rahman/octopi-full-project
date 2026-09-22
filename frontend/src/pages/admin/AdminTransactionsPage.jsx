import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminTransactions } from '../../api/hooks.js';
import AdminLayout from './AdminLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function AdminTransactionsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const { data: transactions = [], isLoading, isError, error } = useAdminTransactions(token, appliedFilters);

  const applyFilter = () => setAppliedFilters(status ? { status } : {});
  const resetFilter = () => {
    setStatus('');
    setAppliedFilters({});
  };

  return (
    <AdminLayout>
      <div className="card-header-flex">
        <div>
          <h1>Platform Transactions</h1>
          <p>Global billing audit ledger and payment event records</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ marginBottom: 0, maxWidth: 200 }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="ROLLED_BACK">Rolled back</option>
          </select>
          <button type="button" onClick={applyFilter}>Filter</button>
          {status && (
            <button type="button" className="secondary" onClick={resetFilter}>
              Reset
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="page-center" style={{ minHeight: '200px' }}>Loading transactions...</div>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load transactions"
          description={error?.message || 'There was a problem fetching transactions.'}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No transactions recorded"
          description={
            appliedFilters.status
              ? `No transactions found with status "${appliedFilters.status}".`
              : 'Payment and subscription transactions will appear here once processed.'
          }
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 600 }}>{t.orgId?.name || '—'}</td>
                  <td>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                      {(t.type || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    ${(t.amount / 100).toFixed(2)}
                  </td>
                  <td><Badge status={t.status} /></td>
                  <td>{new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
