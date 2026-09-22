import { useAuth } from '../../context/AuthContext.jsx';
import { useOrgInfo } from '../../api/hooks.js';
import MemberLayout from './MemberLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function OrgInfoPage() {
  const { token } = useAuth();
  const { data: info, isLoading, isError, error } = useOrgInfo(token);

  if (isLoading) {
    return (
      <MemberLayout>
        <div className="page-center">Loading organization info...</div>
      </MemberLayout>
    );
  }

  if (isError) {
    return (
      <MemberLayout>
        <EmptyState
          icon="⚠️"
          title="Could not load organization info"
          description={error?.message || 'There was a problem fetching organization details.'}
        />
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="card-header-flex">
        <div>
          <h1>My Organization</h1>
          <p>Organization profile and active subscription tier details</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <h3>Organization Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Organization Name
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {info?.name || '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Subscription Tier
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {info?.plan || 'Standard Tier'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          🔒 <strong>Tenant Privacy:</strong> As a team member, billing records and sensitive financial credentials are restricted to organization administrators.
        </div>
      </div>
    </MemberLayout>
  );
}
