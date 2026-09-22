import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import CheckoutPage from './pages/auth/CheckoutPage.jsx';
import CheckoutConfirmPage from './pages/auth/CheckoutConfirmPage.jsx';
import CheckoutSuccessPage from './pages/auth/CheckoutSuccessPage.jsx';
import UnauthorizedPage from './pages/auth/UnauthorizedPage.jsx';
import NotFoundPage from './pages/auth/NotFoundPage.jsx';

import StatsPage from './pages/admin/StatsPage.jsx';
import OrgsListPage from './pages/admin/OrgsListPage.jsx';
import OrgDetailPage from './pages/admin/OrgDetailPage.jsx';
import PlansPage from './pages/admin/PlansPage.jsx';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage.jsx';

import OrgProfilePage from './pages/org/OrgProfilePage.jsx';
import MembersPage from './pages/org/MembersPage.jsx';
import SubscriptionPage from './pages/org/SubscriptionPage.jsx';
import BillingPage from './pages/org/BillingPage.jsx';
import OrgTransactionsPage from './pages/org/OrgTransactionsPage.jsx';

import MemberProfilePage from './pages/member/MemberProfilePage.jsx';
import OrgInfoPage from './pages/member/OrgInfoPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/checkout/:orgId" element={<CheckoutPage />} />
          <Route path="/checkout/confirm" element={<CheckoutConfirmPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Platform Admin panel — every route also re-checked server-side */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['platform_admin']}><StatsPage /></ProtectedRoute>} />
          <Route path="/admin/orgs" element={<ProtectedRoute allowedRoles={['platform_admin']}><OrgsListPage /></ProtectedRoute>} />
          <Route path="/admin/orgs/:id" element={<ProtectedRoute allowedRoles={['platform_admin']}><OrgDetailPage /></ProtectedRoute>} />
          <Route path="/admin/plans" element={<ProtectedRoute allowedRoles={['platform_admin']}><PlansPage /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={['platform_admin']}><AdminTransactionsPage /></ProtectedRoute>} />

          {/* Organization Admin panel */}
          <Route path="/org" element={<ProtectedRoute allowedRoles={['org_admin']}><OrgProfilePage /></ProtectedRoute>} />
          <Route path="/org/members" element={<ProtectedRoute allowedRoles={['org_admin']}><MembersPage /></ProtectedRoute>} />
          <Route path="/org/subscription" element={<ProtectedRoute allowedRoles={['org_admin']}><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/org/billing" element={<ProtectedRoute allowedRoles={['org_admin']}><BillingPage /></ProtectedRoute>} />
          <Route path="/org/transactions" element={<ProtectedRoute allowedRoles={['org_admin']}><OrgTransactionsPage /></ProtectedRoute>} />

          {/* Organization Member panel */}
          <Route path="/member" element={<ProtectedRoute allowedRoles={['org_member', 'org_admin']}><MemberProfilePage /></ProtectedRoute>} />
          <Route path="/member/org" element={<ProtectedRoute allowedRoles={['org_member', 'org_admin']}><OrgInfoPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
