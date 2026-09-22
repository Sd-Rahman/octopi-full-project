import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUpdateMe } from '../../api/hooks.js';
import MemberLayout from './MemberLayout.jsx';

export default function MemberProfilePage() {
  const { user, token, updateUser } = useAuth();
  const updateMutation = useUpdateMe(token);

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { name };
      if (password) body.password = password;
      const res = await updateMutation.mutateAsync(body);
      if (res?.user && updateUser) {
        updateUser(res.user);
      }
      setPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <MemberLayout>
      <div className="card-header-flex">
        <div>
          <h1>My Profile</h1>
          <p>Update your personal information and account credentials</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <h3>Account Credentials</h3>
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Email Address</label>
          <input
            value={user?.email || ''}
            disabled
            style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
          />

          <label>Role</label>
          <input
            value={user?.role === 'org_admin' ? 'Organization Admin' : 'Team Member'}
            disabled
            style={{ background: '#f1f5f9', cursor: 'not-allowed', textTransform: 'capitalize' }}
          />

          <label>New Password (leave blank to keep current)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />

          {saved && <div className="success-text">Profile changes saved successfully!</div>}
          {error && <div className="error-text">{error}</div>}

          <button type="submit" disabled={updateMutation.isPending} style={{ marginTop: '0.5rem' }}>
            {updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </MemberLayout>
  );
}
