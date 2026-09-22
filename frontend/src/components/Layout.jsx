import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ title, navItems, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    if (role === 'platform_admin') return 'Platform Admin';
    if (role === 'org_admin') return 'Org Admin';
    if (role === 'org_member') return 'Team Member';
    return role || 'User';
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-logo">🐙</div>
          <div className="brand-meta">
            <span className="brand-name">Octopi Digital</span>
            <span className="brand-badge">{title}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigation</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/org' || item.to === '/member'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-bullet" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name || 'Account'}</div>
              <div className="user-role-tag">{getRoleLabel(user?.role)}</div>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout} title="Log out">
            <span>Log out</span>
            <span className="logout-icon">→</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}

