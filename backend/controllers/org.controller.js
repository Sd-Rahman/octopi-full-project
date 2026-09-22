import mongoose from 'mongoose';
import Organization from '../models/Organization.model.js';
import User from '../models/User.model.js';
import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import Transaction from '../models/Transaction.model.js';
import Plan from '../models/Plan.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/sendEmail.js';

// Every query below filters by req.user.orgId. This is the actual
// tenant-isolation enforcement — not a special framework feature, just
// discipline: never run one of these queries without that filter.

// GET /api/org/profile
export const getOrgProfile = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.orgId).populate('currentPlan');
  res.json(org);
});

// PATCH /api/org/profile — org_admin only
export const updateOrgProfile = asyncHandler(async (req, res) => {
  const { name, contactEmail, billingEmail } = req.body;
  const org = await Organization.findByIdAndUpdate(
    req.user.orgId,
    { ...(name && { name }), ...(contactEmail && { contactEmail }), ...(billingEmail && { billingEmail }) },
    { new: true }
  );
  res.json(org);
});

// GET /api/org/info — read-only, safe for org_member (no billing data)
export const getOrgInfo = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.orgId).populate('currentPlan', 'name');
  res.json({ name: org.name, plan: org.currentPlan?.name || null });
});

// ── Members ──

// GET /api/org/members — org_admin only
export const listMembers = asyncHandler(async (req, res) => {
  const members = await User.find({ orgId: req.user.orgId, status: { $ne: 'removed' } }).select('-password');
  res.json(members);
});

// POST /api/org/members/invite — org_admin only
export const inviteMember = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;
  if (!['org_admin', 'org_member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role for an org member' });
  }

  const existing = await User.findOne({ email: (email || '').toLowerCase() });
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  // Temp random password the invitee never sees directly — they set
  // their own via the same forgot-password flow, right after invite.
  const tempPassword = Math.random().toString(36).slice(-10);
  const user = await User.create({ name, email, password: tempPassword, role, orgId: req.user.orgId, status: 'invited' });

  await sendEmail({
    to: email,
    subject: `You've been invited to join an organization`,
    text: `You've been invited as a ${role}. Use "Forgot password" on the login page with this email to set your password.`,
  });

  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, status: user.status });
});

// PATCH /api/org/members/:id/role — org_admin only
export const changeMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['org_admin', 'org_member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // orgId filter here is what stops an org_admin from editing a user
  // in a DIFFERENT organization even if they somehow guess a valid user id.
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    { role },
    { new: true }
  ).select('-password');

  if (!user) return res.status(404).json({ error: 'Member not found in your organization' });
  res.json(user);
});

// DELETE /api/org/members/:id — org_admin only, soft delete
export const removeMember = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    { status: 'removed' },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'Member not found in your organization' });
  res.json({ message: 'Member removed' });
});

// ── Subscription ──

// GET /api/org/subscription
export const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ orgId: req.user.orgId }).populate('planId').sort({ createdAt: -1 });
  res.json(subscription);
});

// POST /api/org/subscription/change — org_admin only
// Plan changes go through a Stripe Checkout session so the org pays for
// the new plan. On cancelled/expired subscriptions, they resubscribe
// via a fresh checkout instead.
export const changeSubscriptionPlan = asyncHandler(async (req, res) => {
  const { newPlanId } = req.body;
  const plan = await Plan.findById(newPlanId);
  if (!plan || !plan.isActive) return res.status(400).json({ error: 'Plan not available' });

  const org = await Organization.findById(req.user.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const subscription = await Subscription.findOne({ orgId: req.user.orgId });

  // If subscription is cancelled/expired, they need to resubscribe
  if (subscription && (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED')) {
    // Allow resubscription — initiate checkout for the selected plan
  } else if (
    subscription &&
    subscription.status === 'ACTIVE' &&
    subscription.planId.toString() === plan._id.toString()
  ) {
    return res.status(400).json({ error: 'You are already subscribed to this plan' });
  }

  // Create a checkout session for the new plan — payment is required for
  // every plan change. The webhook (handleCheckoutCompleted) will update
  // the subscription's planId and notify the org via email.
  const { createCheckoutSession } = await import('./billing.controller.js');
  const session = await createCheckoutSession(org, plan);

  // Record the intent in the transaction log
  const oldPlanName = subscription?.planId
    ? (await Plan.findById(subscription.planId))?.name || 'Unknown'
    : 'None';

  await Transaction.create({
    orgId: org._id,
    type: 'plan_change',
    amount: plan.price,
    status: 'PENDING',
    meta: { fromPlan: oldPlanName, toPlan: plan.name },
  });

  res.json({ checkoutUrl: session.url });
});

// POST /api/org/subscription/cancel — org_admin only
export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOneAndUpdate(
    { orgId: req.user.orgId },
    { status: 'CANCELLED', cancelledAt: new Date() },
    { new: true }
  );
  if (!subscription) return res.status(404).json({ error: 'No subscription found' });

  // Update Organization status to cancelled as well
  await Organization.findByIdAndUpdate(req.user.orgId, { status: 'cancelled' });

  await Transaction.create({ orgId: req.user.orgId, type: 'cancellation', status: 'SUCCESS' });

  const org = await Organization.findById(req.user.orgId);
  await sendEmail({ to: org.billingEmail, subject: 'Subscription cancelled', text: 'Your subscription has been cancelled.' });

  res.json(subscription);
});

// GET /api/org/payments
export const listOrgPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ orgId: req.user.orgId }).sort({ createdAt: -1 });
  res.json(payments);
});

// GET /api/org/transactions?status=
export const listOrgTransactions = asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  if (req.query.status) filter.status = req.query.status;
  const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
  res.json(transactions);
});

// GET /api/org/payments/:id/invoice — org_admin only
// Returns a printable HTML receipt for a specific payment.
// Uses a compound filter { _id, orgId } so an admin from another org
// cannot guess a payment ID and download another org's invoice —
// the orgId check is the security boundary, not a UI guard.
export const downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, orgId: req.user.orgId });
  if (!payment) return res.status(404).json({ error: 'Invoice not found' });

  const org = await Organization.findById(req.user.orgId).populate('currentPlan');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice — ${org?.name || 'Organization'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 48px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #6366f1; }
    .logo { font-size: 1.5rem; font-weight: 800; color: #6366f1; }
    .invoice-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
    .invoice-num { font-size: 1.2rem; font-weight: 700; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 8px; }
    .org-name { font-size: 1.2rem; font-weight: 700; }
    .detail { font-size: 0.9rem; color: #475569; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 0.78rem; color: #64748b; text-transform: uppercase; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }
    .amount { font-size: 1.1rem; font-weight: 700; color: #059669; }
    .total-row { background: #f8fafc; font-weight: 700; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.78rem; font-weight: 600; background: #d1fae5; color: #065f46; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.82rem; color: #94a3b8; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Octopi Digital</div>
      <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">SaaS Subscription Platform</div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-label">Invoice</div>
      <div class="invoice-num">#${payment._id.toString().slice(-8).toUpperCase()}</div>
      <div style="font-size: 0.82rem; color: #64748b; margin-top: 4px;">
        ${new Date(payment.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px;">
    <div class="section">
      <div class="section-title">Bill To</div>
      <div class="org-name">${org?.name || 'Organization'}</div>
      <div class="detail">${org?.billingEmail || ''}</div>
    </div>
    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="detail">Status: <span class="status-badge">${payment.status}</span></div>
      ${payment.stripePaymentIntentId ? `<div class="detail" style="margin-top:6px;">Ref: ${payment.stripePaymentIntentId}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${org?.currentPlan?.name || 'Subscription'} — ${org?.currentPlan?.billingInterval || 'monthly'} plan</td>
        <td class="amount">$${(payment.amount / 100).toFixed(2)} <span style="font-size:0.78rem;color:#64748b;font-weight:400;">${(payment.currency || 'usd').toUpperCase()}</span></td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td class="amount">$${(payment.amount / 100).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Thank you for your business! This receipt was automatically generated by Octopi Digital.</p>
    <p style="margin-top: 6px;">Questions? Contact us at billing@octopi.digital</p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${payment._id.toString().slice(-8).toUpperCase()}.html"`);
  res.send(html);
});

