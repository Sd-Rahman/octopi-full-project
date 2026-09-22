import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgPayments } from '../../api/hooks.js';
import { apiRequest } from '../../api/client.js';
import OrgLayout from './OrgLayout.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const BASE_URL = 'http://localhost:5000/api';

export default function BillingPage() {
  const { token } = useAuth();
  const { data: payments = [], isLoading, isError, error } = useOrgPayments(token);
  const [portalLoading, setPortalLoading] = useState(false);

  const openInvoice = (paymentId) => {
    fetch(`${BASE_URL}/org/payments/${paymentId}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.text())
      .then((html) => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const data = await apiRequest('/billing/portal', { method: 'POST', token });
      if (data.dev) {
        alert(data.message);
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <OrgLayout>
      <div className="card-header-flex">
        <div>
          <h1>Billing &amp; Payments</h1>
          <p>Payment receipts and subscription charge history</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={openPortal}
          disabled={portalLoading}
        >
          {portalLoading ? 'Opening...' : '💳 Manage Payment Methods'}
        </button>
      </div>

      <div className="card">
        <h3>Payment Receipts</h3>
        {isLoading ? (
          <div className="page-center" style={{ minHeight: '150px' }}>Loading payment records...</div>
        ) : isError ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load payments"
            description={error?.message || 'There was a problem fetching payment records.'}
          />
        ) : payments.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No payments on record"
            description="When your organization is billed for its subscription, receipts will appear here."
          />
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      ${(p.amount / 100).toFixed(2)}
                    </td>
                    <td style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {p.currency || 'usd'}
                    </td>
                    <td><Badge status={p.status} /></td>
                    <td>{new Date(p.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => openInvoice(p._id)}
                      >
                        📄 Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          ℹ️ <strong>Tip:</strong> Click "Download" to open your invoice receipt. Use your browser's <strong>Print → Save as PDF</strong> to export it as a PDF document.
        </div>
      </div>
    </OrgLayout>
  );
}
