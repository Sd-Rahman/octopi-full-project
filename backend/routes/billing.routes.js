import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { requireOrgContext } from '../middleware/tenant.middleware.js';
import { startCheckout, confirmCheckout, stripeWebhook, createPortalSession } from '../controllers/billing.controller.js';

const router = express.Router();

// Checkout start requires login (the pending org_admin from registration, or active org admin switching/renewing).
router.post('/checkout/:orgId', protect, startCheckout);
router.post('/confirm-checkout', protect, confirmCheckout);

// Stripe Customer Portal — lets org admins manage their payment methods
router.post('/portal', protect, requireOrgContext, authorize('org_admin'), createPortalSession);

// NOTE: the webhook route itself is mounted separately in server.js
// with express.raw() BEFORE the global express.json() — it can't live
// here as a normal JSON route. Exported handler is reused there.
export { stripeWebhook };
export default router;
