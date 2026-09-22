import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgTransactions } from '../../api/hooks.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function OrgTransactionsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  const { data: transactions = [], isLoading, isError, error } = useOrgTransactions(token, { status: appliedStatus });

  const applyFilter = () => setAppliedStatus(status);
  const resetFilter = () => {
    setStatus('');
    setAppliedStatus('');
  };

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Transaction History</h1>
          <p>Detailed ledger of all billing events, plan changes, and subscription fees</p>
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

      <div className="card">
        {isLoading ? (
          <div className="page-center" style={{ minHeight: '150px' }}>Loading transactions...</div>
        ) : isError ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load transactions"
            description={error?.message || 'There was a problem fetching transactions.'}
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No transactions found"
            description={
              appliedStatus
                ? `No transactions match the status filter "${appliedStatus}".`
                : 'No transactions have been logged for your organization yet.'
            }
          />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
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
      </div>
    </OrgLayout>
  );
}
