import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './client.js';

// ── Query Key Factories ──
// Centralized key definitions prevent stale-cache bugs (typos, inconsistent
// keys across pages). Every component that reads the same data should use
// the same key factory, so invalidation after a mutation automatically
// refreshes all consumers.
export const queryKeys = {
  // Public
  plans: ['plans'],

  // Auth / Me
  me: ['me'],

  // Platform Admin
  adminOrgs: (filters) => ['admin', 'orgs', filters],
  adminOrgDetail: (id) => ['admin', 'orgs', id],
  adminPlans: ['admin', 'plans'],
  adminTransactions: (filters) => ['admin', 'transactions', filters],
  adminStats: ['admin', 'stats'],

  // Org-scoped
  orgProfile: ['org', 'profile'],
  orgInfo: ['org', 'info'],
  orgMembers: ['org', 'members'],
  orgSubscription: ['org', 'subscription'],
  orgPayments: ['org', 'payments'],
  orgTransactions: (filters) => ['org', 'transactions', filters],
};

// ── Helper: build token header ──
const withToken = (token) => ({ token });

// ═══════════════════════════════════════════════
// PUBLIC QUERIES
// ═══════════════════════════════════════════════

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => apiRequest('/plans'),
  });
}

// ═══════════════════════════════════════════════
// PLATFORM ADMIN QUERIES
// ═══════════════════════════════════════════════

export function useAdminOrgs(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.adminOrgs(filters),
    queryFn: () => apiRequest(`/admin/orgs${qs ? `?${qs}` : ''}`, withToken(token)),
    enabled: !!token,
  });
}

export function useAdminOrgDetail(token, id) {
  return useQuery({
    queryKey: queryKeys.adminOrgDetail(id),
    queryFn: () => apiRequest(`/admin/orgs/${id}`, withToken(token)),
    enabled: !!token && !!id,
  });
}

export function useAdminPlans(token) {
  return useQuery({
    queryKey: queryKeys.adminPlans,
    queryFn: () => apiRequest('/admin/plans', withToken(token)),
    enabled: !!token,
  });
}

export function useAdminTransactions(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.orgId) params.set('orgId', filters.orgId);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.adminTransactions(filters),
    queryFn: () => apiRequest(`/admin/transactions${qs ? `?${qs}` : ''}`, withToken(token)),
    enabled: !!token,
  });
}

export function useAdminStats(token) {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => apiRequest('/admin/stats', withToken(token)),
    enabled: !!token,
  });
}

// ═══════════════════════════════════════════════
// ORG-SCOPED QUERIES
// ═══════════════════════════════════════════════

export function useOrgProfile(token) {
  return useQuery({
    queryKey: queryKeys.orgProfile,
    queryFn: () => apiRequest('/org/profile', withToken(token)),
    enabled: !!token,
  });
}

export function useOrgInfo(token) {
  return useQuery({
    queryKey: queryKeys.orgInfo,
    queryFn: () => apiRequest('/org/info', withToken(token)),
    enabled: !!token,
  });
}

export function useOrgMembers(token) {
  return useQuery({
    queryKey: queryKeys.orgMembers,
    queryFn: () => apiRequest('/org/members', withToken(token)),
    enabled: !!token,
  });
}

export function useOrgSubscription(token) {
  return useQuery({
    queryKey: queryKeys.orgSubscription,
    queryFn: () => apiRequest('/org/subscription', withToken(token)),
    enabled: !!token,
  });
}

export function useOrgPayments(token) {
  return useQuery({
    queryKey: queryKeys.orgPayments,
    queryFn: () => apiRequest('/org/payments', withToken(token)),
    enabled: !!token,
  });
}

export function useOrgTransactions(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.orgTransactions(filters),
    queryFn: () => apiRequest(`/org/transactions${qs ? `?${qs}` : ''}`, withToken(token)),
    enabled: !!token,
  });
}

// ═══════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════

// Admin mutations
export function useSuspendOrg(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      apiRequest(`/admin/orgs/${id}/suspend`, { method: 'POST', token, body: { reason } }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      qc.invalidateQueries({ queryKey: queryKeys.adminOrgDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminStats });
    },
  });
}

export function useReactivateOrg(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest(`/admin/orgs/${id}/reactivate`, { method: 'POST', token }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      qc.invalidateQueries({ queryKey: queryKeys.adminOrgDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminStats });
    },
  });
}

export function useCreatePlan(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan) => apiRequest('/admin/plans', { method: 'POST', token, body: plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPlans });
      qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useUpdatePlan(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiRequest(`/admin/plans/${id}`, { method: 'PATCH', token, body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPlans });
      qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useTogglePlan(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => apiRequest(`/admin/plans/${id}/${action}`, { method: 'POST', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPlans });
      qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useDeletePlan(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/admin/plans/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminPlans });
      qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

// Org mutations
export function useUpdateOrgProfile(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/org/profile', { method: 'PATCH', token, body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgProfile });
      qc.invalidateQueries({ queryKey: queryKeys.orgInfo });
    },
  });
}

export function useInviteMember(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/org/members/invite', { method: 'POST', token, body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orgMembers }),
  });
}

export function useChangeMemberRole(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) => apiRequest(`/org/members/${id}/role`, { method: 'PATCH', token, body: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orgMembers }),
  });
}

export function useRemoveMember(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/org/members/${id}`, { method: 'DELETE', token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orgMembers }),
  });
}

export function useCancelSubscription(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/org/subscription/cancel', { method: 'POST', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgSubscription });
      qc.invalidateQueries({ queryKey: queryKeys.orgProfile });
      qc.invalidateQueries({ queryKey: ['org', 'transactions'] });
    },
  });
}

export function useChangeSubscriptionPlan(token) {
  return useMutation({
    mutationFn: (newPlanId) =>
      apiRequest('/org/subscription/change', { method: 'POST', token, body: { newPlanId } }),
  });
}

// Me mutations
export function useUpdateMe(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/me', { method: 'PATCH', token, body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
