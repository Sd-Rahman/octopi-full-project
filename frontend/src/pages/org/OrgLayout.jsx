import Layout from '../../components/Layout.jsx';

const navItems = [
  { to: '/org', label: 'Profile' },
  { to: '/org/members', label: 'Members' },
  { to: '/org/subscription', label: 'Subscription' },
  { to: '/org/billing', label: 'Billing' },
  { to: '/org/transactions', label: 'Transactions' },
];

export default function OrgLayout({ children }) {
  return <Layout title="Organization Admin" navItems={navItems}>{children}</Layout>;
}
