import Organization from '../models/Organization.model.js';
import Plan from '../models/Plan.model.js';
import User from '../models/User.model.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createCheckoutSession } from './billing.controller.js';

// POST /api/register
// This is the PAID signup flow the assessment requires: org + admin
// account are created immediately as PENDING (so we have somewhere to
// send the admin back to if they abandon checkout), but the org is
// NOT usable until the Stripe webhook confirms payment.
export const registerOrganization = asyncHandler(async (req, res) => {
  const { orgName, adminName, adminEmail, adminPassword, planId } = req.body;

  if (!orgName || !adminName || !adminEmail || !adminPassword || !planId) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (adminPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    return res.status(400).json({ error: 'Selected plan is not available' });
  }

  const org = await Organization.create({
    name: orgName,
    billingEmail: adminEmail.toLowerCase(),
    status: 'pending',
    currentPlan: plan._id,
  });

  const adminUser = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword, // hashed by the User model's pre-save hook
    role: 'org_admin',
    orgId: org._id,
  });

  const session = await createCheckoutSession(org, plan);

  // We DO issue a token here so the admin can be "logged in" enough to
  // see a checkout/retry screen — but every org-scoped route still checks
  // org.status === 'active' before allowing real access (frontend AND
  // backend), so a PENDING admin can't reach billing/members/etc.
  const token = generateToken(adminUser._id);

  res.status(201).json({
    org: { id: org._id, name: org.name, status: org.status },
    user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role, orgId: org._id },
    token,
    checkoutUrl: session.url,
  });
});
