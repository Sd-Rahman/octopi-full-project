import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret';

import { startTestDB, stopTestDB, clearTestDB } from './setup.js';

before(startTestDB);
after(stopTestDB);
beforeEach(clearTestDB);

// ── Payment flow test ──
// Simulates the dev-mode checkout completion and verifies that
// the organization, subscription, payment, and transaction are
// all created/updated correctly in a single atomic operation.

test('confirm-checkout activates org, creates subscription, payment, and transaction', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const Plan = (await import('../models/Plan.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const Subscription = (await import('../models/Subscription.model.js')).default;
  const Payment = (await import('../models/Payment.model.js')).default;
  const Transaction = (await import('../models/Transaction.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const plan = await Plan.create({ name: 'Starter', price: 999, billingInterval: 'monthly', features: [] });
  const org = await Organization.create({ name: 'Test Corp', billingEmail: 'test@corp.com', status: 'pending', currentPlan: plan._id });
  const admin = await User.create({ name: 'Admin', email: 'admin@corp.com', password: 'test123', role: 'org_admin', orgId: org._id });
  const token = generateToken(admin._id);

  // Import and call confirm-checkout the same way the controller does
  const request = (await import('supertest')).default;
  const app = (await import('../app.js')).default;

  const res = await request(app)
    .post('/api/billing/confirm-checkout')
    .set('Authorization', `Bearer ${token}`)
    .send({ orgId: org._id.toString(), planId: plan._id.toString() });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // Verify org is now active
  const updatedOrg = await Organization.findById(org._id);
  assert.equal(updatedOrg.status, 'active');

  // Verify subscription was created as ACTIVE
  const sub = await Subscription.findOne({ orgId: org._id });
  assert.ok(sub);
  assert.equal(sub.status, 'ACTIVE');
  assert.equal(sub.planId.toString(), plan._id.toString());

  // Verify payment was recorded
  const payment = await Payment.findOne({ orgId: org._id });
  assert.ok(payment);
  assert.equal(payment.status, 'SUCCESS');
  assert.equal(payment.amount, 999);

  // Verify transaction was logged
  const transaction = await Transaction.findOne({ orgId: org._id });
  assert.ok(transaction);
  assert.equal(transaction.status, 'SUCCESS');
  assert.equal(transaction.type, 'subscription_payment');
});

// ── Duplicate payment prevention ──
// Running confirm-checkout twice for the same org+plan should not
// create duplicate records if the subscription is already active.

test('duplicate checkout for same active plan is rejected', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const Plan = (await import('../models/Plan.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const Subscription = (await import('../models/Subscription.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const plan = await Plan.create({ name: 'Starter', price: 999, billingInterval: 'monthly', features: [] });
  const org = await Organization.create({ name: 'Test Corp', billingEmail: 'test@corp.com', status: 'active', currentPlan: plan._id });
  const admin = await User.create({ name: 'Admin', email: 'admin@corp.com', password: 'test123', role: 'org_admin', orgId: org._id });

  // Create an existing active subscription
  await Subscription.create({ orgId: org._id, planId: plan._id, status: 'ACTIVE' });

  const token = generateToken(admin._id);
  const request = (await import('supertest')).default;
  const app = (await import('../app.js')).default;

  // Trying to checkout the same plan they're already on should fail
  const res = await request(app)
    .post(`/api/billing/checkout/${org._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ planId: plan._id.toString() });

  assert.equal(res.status, 400);
  assert.ok(res.body.error.includes('already'));
});
