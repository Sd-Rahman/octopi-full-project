import Layout from '../../components/Layout.jsx';

const navItems = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/orgs', label: 'Organizations' },
  { to: '/admin/plans', label: 'Plans' },
  { to: '/admin/transactions', label: 'Transactions' },
];

export default function AdminLayout({ children }) {
  return <Layout title="Platform Admin" navItems={navItems}>{children}</Layout>;
}
