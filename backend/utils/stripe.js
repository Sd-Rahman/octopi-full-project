import Stripe from 'stripe';

// A single shared Stripe client, configured from the secret key.
// If STRIPE_SECRET_KEY is missing, we don't crash the whole server —
// payment routes will just fail clearly when actually used, which is
// easier to debug than an opaque startup crash.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

export default stripe;
