import Layout from '../../components/Layout.jsx';

const navItems = [
  { to: '/member', label: 'My profile' },
  { to: '/member/org', label: 'Organization' },
];

export default function MemberLayout({ children }) {
  return <Layout title="Member" navItems={navItems}>{children}</Layout>;
}
