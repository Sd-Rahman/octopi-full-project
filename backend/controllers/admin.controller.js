import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';
import Plan from '../models/Plan.model.js';
import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import Transaction from '../models/Transaction.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// All handlers here are platform-admin only (enforced by route-level
// authorize('platform_admin')) — they deliberately query ACROSS all
// organizations, which is the one place in the whole app that's allowed.

// GET /api/admin/orgs?search=&status=
export const listOrganizations = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const orgs = await Organization.find(filter).populate('currentPlan').sort({ createdAt: -1 });

  // memberCount per org — a small N+1 here is fine at this scale;
  // an aggregation pipeline would be the next optimization with more time.
  const withCounts = await Promise.all(
    orgs.map(async (org) => {
      const memberCount = await User.countDocuments({ orgId: org._id, status: { $ne: 'removed' } });
      return { ...org.toObject(), memberCount };
    })
  );

  res.json(withCounts);
});

// GET /api/admin/orgs/:id
export const getOrganizationDetail = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).populate('currentPlan');
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const [members, subscriptions, payments, transactions] = await Promise.all([
    User.find({ orgId: org._id }).select('-password'),
    Subscription.find({ orgId: org._id }).populate('planId').sort({ createdAt: -1 }),
    Payment.find({ orgId: org._id }).sort({ createdAt: -1 }),
    Transaction.find({ orgId: org._id }).sort({ createdAt: -1 }),
  ]);

  res.json({ org, members, subscriptions, payments, transactions });
});

// POST /api/admin/orgs/:id/suspend
export const suspendOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { status: 'suspended', suspendedAt: new Date(), suspendedReason: req.body.reason || null },
    { new: true }
  );
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

// POST /api/admin/orgs/:id/reactivate
export const reactivateOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { status: 'active', suspendedAt: null, suspendedReason: null },
    { new: true }
  );
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

// ── Plans management ──
export const createPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
});

export const listPlans = asyncHandler(async (req, res) => {
  res.json(await Plan.find().sort({ price: 1 }));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

export const disablePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

export const enablePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

export const deletePlan = asyncHandler(async (req, res) => {
  const orgCount = await Organization.countDocuments({ currentPlan: req.params.id });
  if (orgCount > 0) {
    return res.status(400).json({
      error: `Cannot delete plan: ${orgCount} organization(s) are currently assigned to it. Disable the plan instead to grandfather existing tenants.`,
    });
  }

  const subCount = await Subscription.countDocuments({ planId: req.params.id, status: 'ACTIVE' });
  if (subCount > 0) {
    return res.status(400).json({
      error: `Cannot delete plan: ${subCount} active subscription(s) rely on it. Disable the plan instead.`,
    });
  }

  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ message: 'Plan deleted successfully', id: req.params.id });
});

// GET /api/admin/transactions — platform-wide, filterable
export const listAllTransactions = asyncHandler(async (req, res) => {
  const { orgId, status, from, to } = req.query;
  const filter = {};
  if (orgId) filter.orgId = orgId;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter).populate('orgId', 'name').sort({ createdAt: -1 }).limit(500);
  res.json(transactions);
});

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [totalOrgs, totalUsers, activeSubscriptions, failedPayments, recentSignups, revenueAgg] = await Promise.all([
    Organization.countDocuments(),
    User.countDocuments({ status: { $ne: 'removed' } }),
    Subscription.countDocuments({ status: 'ACTIVE' }),
    Payment.countDocuments({ status: 'FAILED' }),
    Organization.find().sort({ createdAt: -1 }).limit(5).select('name status createdAt'),
    Payment.aggregate([{ $match: { status: 'SUCCESS' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  res.json({
    totalOrganizations: totalOrgs,
    totalUsers,
    activeSubscriptions,
    totalRevenue: revenueAgg[0]?.total || 0,
    failedPaymentCount: failedPayments,
    recentSignups,
  });
});
