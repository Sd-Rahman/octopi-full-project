import mongoose from 'mongoose';
import stripe from '../utils/stripe.js';
import Organization from '../models/Organization.model.js';
import Plan from '../models/Plan.model.js';
import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import Transaction from '../models/Transaction.model.js';
import WebhookEvent from '../models/WebhookEvent.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/sendEmail.js';

// Shared by registration (first payment) and retry-checkout. Creates a
// Stripe Checkout Session for a given org+plan. We NEVER trust anything
// that comes back from the browser after this — only the webhook below
// is allowed to actually activate anything.
// Shared by registration (first payment), retry-checkout, and plan switching/reactivation.
export const createCheckoutSession = async (org, plan) => {
  const isMockStripe = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_...');

  if (isMockStripe) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return {
      id: `cs_dev_${Date.now()}`,
      url: `${frontendUrl}/checkout/confirm?orgId=${org._id}&planId=${plan._id}`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `${plan.name} plan — ${org.name}` },
          unit_amount: plan.price,
        },
        quantity: 1,
      },
    ],
    metadata: { orgId: org._id.toString(), planId: plan._id.toString() },
    success_url: `${process.env.FRONTEND_URL}/checkout/success?org=${org._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout/${org._id}`,
  });

  return session;
};

// POST /api/billing/checkout/:orgId — used for initial registration, retry, plan changes, and resubscriptions
export const startCheckout = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  // Target plan can be specified in request body (e.g. when changing plans or resubscribing)
  const targetPlanId = req.body?.planId || org.currentPlan;
  const plan = await Plan.findById(targetPlanId);
  if (!plan || !plan.isActive) {
    return res.status(400).json({ error: 'Selected plan is not available or inactive' });
  }

  // If already active on this exact plan, disallow duplicate purchase
  const currentSub = await Subscription.findOne({ orgId: org._id });
  if (
    org.status === 'active' &&
    currentSub &&
    currentSub.status === 'ACTIVE' &&
    currentSub.planId.toString() === plan._id.toString()
  ) {
    return res.status(400).json({ error: 'Organization is already actively subscribed to this plan' });
  }

  const session = await createCheckoutSession(org, plan);
  res.json({ checkoutUrl: session.url });
});

// POST /api/billing/confirm-checkout — development confirmation that mirrors checkout.session.completed
export const confirmCheckout = asyncHandler(async (req, res) => {
  const { orgId, planId } = req.body;
  const org = await Organization.findById(orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) return res.status(400).json({ error: 'Plan not available' });

  await handleCheckoutCompleted({
    id: `cs_dev_${Date.now()}`,
    amount_total: plan.price,
    currency: 'usd',
    payment_intent: `pi_dev_${Date.now()}`,
    metadata: { orgId: org._id.toString(), planId: plan._id.toString() },
  });

  res.json({ success: true, message: `Successfully activated subscription for ${plan.name}!` });
});

// POST /api/billing/webhook
// CRITICAL: this route is mounted with express.raw() in server.js, NOT
// express.json() — Stripe's signature check needs the exact raw request
// body bytes, and re-serializing a parsed JSON object would not match
// the signature Stripe computed.
export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // constructEvent verifies the payload was genuinely sent by Stripe
    // (using STRIPE_WEBHOOK_SECRET) and hasn't been tampered with.
    // Without this check, anyone who finds this URL could POST a fake
    // "payment succeeded" event and activate organizations for free.
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Idempotency guard ──
  // Try to insert this event's ID. The unique index on stripeEventId
  // means a second delivery of the SAME event throws a duplicate-key
  // error here, which we catch and treat as "already handled" — we
  // still return 200 so Stripe stops retrying, we just skip re-running
  // the business logic below.
  try {
    await WebhookEvent.create({ stripeEventId: event.id, type: event.type });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    throw err;
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object);
  } else if (event.type === 'checkout.session.expired') {
    await handleCheckoutExpired(event.data.object);
  }
  // Other event types are accepted but ignored — Stripe expects a 200
  // for any event type it sends, not just ones we act on.

  res.status(200).json({ received: true });
});

async function handleCheckoutCompleted(session) {
  const { orgId, planId } = session.metadata;

  // ── Safe multi-document transaction ──
  // Activating a payment touches THREE collections: Payment, Subscription,
  // Organization (plus a Transaction record). If the process crashed
  // between updating Subscription and Organization, we'd end up with an
  // org that's still "pending" but a subscription that says "active" —
  // a corrupted, half-updated state. Wrapping all of it in one Mongo
  // session/transaction means either ALL of these writes commit, or —
  // on any error — NONE of them do. There's no in-between state.
  const dbSession = await mongoose.startSession();
  let previousPlanId = null; // Track for upgrade/downgrade email
  let isNewSubscription = false;
  try {
    dbSession.startTransaction();

    const payment = await Payment.create(
      [
        {
          orgId,
          amount: session.amount_total,
          currency: session.currency,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          status: 'SUCCESS',
        },
      ],
      { session: dbSession }
    );

    let subscription = await Subscription.findOne({ orgId }).session(dbSession);
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (subscription) {
      previousPlanId = subscription.planId?.toString();
      subscription.planId = planId;
      subscription.status = 'ACTIVE';
      subscription.currentPeriodStart = periodStart;
      subscription.currentPeriodEnd = periodEnd;
      subscription.cancelledAt = null;
      await subscription.save({ session: dbSession });
    } else {
      isNewSubscription = true;
      const created = await Subscription.create(
        [{ orgId, planId, status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd }],
        { session: dbSession }
      );
      subscription = created[0];
    }

    await Payment.updateOne(
      { _id: payment[0]._id },
      { $set: { subscriptionId: subscription._id } },
      { session: dbSession }
    );

    await Transaction.create(
      [
        {
          orgId,
          paymentId: payment[0]._id,
          type: 'subscription_payment',
          amount: session.amount_total,
          status: 'SUCCESS',
        },
      ],
      { session: dbSession }
    );

    await Organization.updateOne(
      { _id: orgId },
      { $set: { status: 'active', currentPlan: planId } },
      { session: dbSession }
    );

    await dbSession.commitTransaction();
  } catch (err) {
    await dbSession.abortTransaction();
    console.error(`Failed to activate org ${orgId} after payment: ${err.message}`);
    // Deliberately don't record a Transaction here inside the aborted
    // transaction (it would be rolled back anyway) — log it instead so
    // it's investigable; the org correctly stays PENDING either way.
    return;
  } finally {
    dbSession.endSession();
  }

  // ── Email notification ──
  // Send the right email depending on whether this is a first activation
  // or a plan change (upgrade/downgrade).
  const org = await Organization.findById(orgId);
  if (!org) return;

  const newPlan = await Plan.findById(planId);
  const isPlanChange = previousPlanId && previousPlanId !== planId.toString() && !isNewSubscription;

  if (isPlanChange) {
    const oldPlan = await Plan.findById(previousPlanId);
    const direction = (newPlan?.price || 0) > (oldPlan?.price || 0) ? 'upgraded' : 'downgraded';
    await sendEmail({
      to: org.billingEmail,
      subject: `Subscription ${direction} — ${newPlan?.name || 'New Plan'}`,
      text: `${org.name} has been ${direction} from ${oldPlan?.name || 'previous plan'} to ${newPlan?.name || 'new plan'}. Your new billing amount is $${((newPlan?.price || 0) / 100).toFixed(2)}/${newPlan?.billingInterval || 'month'}.`,
    });
  } else {
    await sendEmail({
      to: org.billingEmail,
      subject: 'Payment received — your organization is active',
      text: `${org.name} is now active on the ${newPlan?.name || ''} plan. Thanks for subscribing!`,
    });
  }
}

async function handleCheckoutExpired(session) {
  const { orgId } = session.metadata;
  const org = await Organization.findById(orgId);
  if (!org) return;

  await Payment.create({
    orgId,
    amount: session.amount_total || 0,
    stripeSessionId: session.id,
    status: 'FAILED',
  });

  await Transaction.create({
    orgId,
    type: 'subscription_payment',
    amount: session.amount_total || 0,
    status: 'FAILED',
  });

  // Organization deliberately left as-is (PENDING) — no partial activation.
  await sendEmail({
    to: org.billingEmail,
    subject: 'Payment failed',
    text: `Your checkout for ${org.name} did not complete. You can retry from your dashboard.`,
  });
}

// POST /api/billing/portal — org_admin only
// Creates a Stripe Billing Portal session for the org so they can:
//   - Update payment methods (change card, add/remove)
//   - View invoices from Stripe's side
//   - Manage Stripe subscription settings
// In dev mode (no real Stripe key), returns the local billing page URL.
export const createPortalSession = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const isMockStripe = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_...');

  if (isMockStripe) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.json({
      url: `${frontendUrl}/org/billing`,
      dev: true,
      message: 'Dev mode: Stripe Customer Portal is not available without a real Stripe key. In production, this would open the Stripe Billing Portal for payment method management.',
    });
  }

  if (!org.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer record found for this organization. Please contact support.' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${frontendUrl}/org/billing`,
  });

  res.json({ url: session.url });
});

