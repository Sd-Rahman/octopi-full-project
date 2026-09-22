import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { startTestDB, stopTestDB, clearTestDB } from './setup.js';

before(startTestDB);
after(stopTestDB);
beforeEach(clearTestDB);

// Tests the idempotency mechanism directly against the model (rather
// than through a real signed Stripe request, which needs a real Stripe
// secret) — this is the actual guarantee that matters: the SAME event
// ID can only be recorded once, full stop.
test('the same Stripe event ID cannot be recorded twice (idempotency guard)', async () => {
  const WebhookEvent = (await import('../models/WebhookEvent.model.js')).default;

  await WebhookEvent.create({ stripeEventId: 'evt_test_123', type: 'checkout.session.completed' });

  await assert.rejects(
    () => WebhookEvent.create({ stripeEventId: 'evt_test_123', type: 'checkout.session.completed' }),
    (err) => err.code === 11000 // MongoDB duplicate-key error — exactly what billing.controller.js catches
  );

  const count = await WebhookEvent.countDocuments({ stripeEventId: 'evt_test_123' });
  assert.equal(count, 1);
});
