import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';

import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import app from '../app.js';

before(startTestDB);
after(stopTestDB);
beforeEach(clearTestDB);

// ── Role authorization tests ──
// These prove that the role middleware (authorize) actually blocks
// unauthorized access, not just the frontend hiding buttons.

test('org_member cannot access org admin endpoints (members list)', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const member = await User.create({ name: 'Member', email: 'member@test.com', password: 'test123', role: 'org_member', orgId: org._id });
  const token = generateToken(member._id);

  // org_member should NOT be able to list members (org_admin only)
  const res = await request(app).get('/api/org/members').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Forbidden: insufficient permissions');
});

test('org_member cannot invite new members', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const member = await User.create({ name: 'Member', email: 'member@test.com', password: 'test123', role: 'org_member', orgId: org._id });
  const token = generateToken(member._id);

  const res = await request(app)
    .post('/api/org/members/invite')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Hacker', email: 'hacker@evil.com', role: 'org_admin' });

  assert.equal(res.status, 403);
});

test('org_member cannot cancel subscription', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const member = await User.create({ name: 'Member', email: 'member@test.com', password: 'test123', role: 'org_member', orgId: org._id });
  const token = generateToken(member._id);

  const res = await request(app)
    .post('/api/org/subscription/cancel')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 403);
});

test('org_admin cannot access platform admin endpoints', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'test123', role: 'org_admin', orgId: org._id });
  const token = generateToken(admin._id);

  // org_admin should NOT be able to access platform admin stats
  const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
});

test('org_admin cannot suspend organizations', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'test123', role: 'org_admin', orgId: org._id });
  const token = generateToken(admin._id);

  const res = await request(app)
    .post(`/api/admin/orgs/${org._id}/suspend`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'test' });

  assert.equal(res.status, 403);
});

test('org_member CAN access read-only org info', async () => {
  const Organization = (await import('../models/Organization.model.js')).default;
  const User = (await import('../models/User.model.js')).default;
  const generateToken = (await import('../utils/generateToken.js')).default;

  const org = await Organization.create({ name: 'Test Org', billingEmail: 'test@test.com', status: 'active' });
  const member = await User.create({ name: 'Member', email: 'member@test.com', password: 'test123', role: 'org_member', orgId: org._id });
  const token = generateToken(member._id);

  // org_member SHOULD be able to see basic org info (name, plan)
  const res = await request(app).get('/api/org/info').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Test Org');
});
