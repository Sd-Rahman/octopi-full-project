import mongoose from 'mongoose';

// This is the entire idempotency mechanism for Stripe webhooks.
// Stripe WILL occasionally deliver the same event twice (retries,
// network blips). Before doing any business logic, we try to insert
// the event's unique Stripe ID here. If it's already there, we know
// we've processed it and skip straight to a 200 response.
const webhookEventSchema = new mongoose.Schema(
  {
    stripeEventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('WebhookEvent', webhookEventSchema);
