import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';

import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import app from '../app.js';

before(startTestDB);
after(stopTestDB);
beforeEach(clearTestDB);

test('login rejects a non-existent user with a generic error', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'whatever' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Invalid email or password');
});

test('protected route rejects requests with no token', async () => {
  const res = await request(app).get('/api/me');
  assert.equal(res.status, 401);
});

test('login succeeds with correct credentials after a user exists, and returns a usable token', async () => {
  // Create a user the same way the app does: via the model, so the
  // password hook actually runs (bcrypt hash), matching real behavior.
  const User = (await import('../models/User.model.js')).default;
  await User.create({ name: 'Alice', email: 'alice@acme.com', password: 'temp123', role: 'org_admin' });

  const loginRes = await request(app).post('/api/auth/login').send({ email: 'alice@acme.com', password: 'temp123' });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);

  const meRes = await request(app).get('/api/me').set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, 'alice@acme.com');
});

test('login rejects a correct email with the wrong password', async () => {
  const User = (await import('../models/User.model.js')).default;
  await User.create({ name: 'Alice', email: 'alice@acme.com', password: 'temp123', role: 'org_admin' });

  const res = await request(app).post('/api/auth/login').send({ email: 'alice@acme.com', password: 'wrong' });
  assert.equal(res.status, 401);
});
