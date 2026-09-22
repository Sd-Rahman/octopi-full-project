import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';

import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import app from '../app.js';

before(startTestDB);
after(stopTestDB);
beforeEach(clearTestDB);

// This is the single most important test in the whole suite for this
// assessment: proves one org's admin cannot read or modify another
// org's data, even when they know (or guess) that org's real user ID.
test('an org_admin cannot see or remove a member belonging to a different organization', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const orgA = await Organization.create({ name: 'Org A', billingEmail: 'a@a.com', status: 'active' });
  const orgB = await Organization.create({ name: 'Org B', billingEmail: 'b@b.com', status: 'active' });

  const adminA = await User.create({ name: 'Admin A', email: 'admina@a.com', password: 'x', role: 'org_admin', orgId: orgA._id });
  const memberB = await User.create({ name: 'Member B', email: 'memberb@b.com', password: 'x', role: 'org_member', orgId: orgB._id });

  const tokenA = generateToken(adminA._id);

  // Org A's admin lists members — should NEVER include anyone from Org B.
  const listRes = await request(app).get('/api/org/members').set('Authorization', `Bearer ${tokenA}`);
  assert.equal(listRes.status, 200);
  assert.ok(!listRes.body.some((m) => m._id === memberB._id.toString()));

  // Org A's admin tries to remove Org B's member directly by ID — must fail.
  const removeRes = await request(app).delete(`/api/org/members/${memberB._id}`).set('Authorization', `Bearer ${tokenA}`);
  assert.equal(removeRes.status, 404);

  const stillThere = await User.findById(memberB._id);
  assert.equal(stillThere.status, 'active'); // untouched
});

test('platform_admin is blocked from org-scoped routes (must use admin endpoints instead)', async () => {
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const admin = await User.create({ name: 'Platform Admin', email: 'admin@octopi.dev', password: 'x', role: 'platform_admin', orgId: null });
  const token = generateToken(admin._id);

  const res = await request(app).get('/api/org/members').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
});
