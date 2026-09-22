import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { requireOrgContext } from '../middleware/tenant.middleware.js';
import {
  getOrgProfile,
  updateOrgProfile,
  getOrgInfo,
  listMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  getSubscription,
  changeSubscriptionPlan,
  cancelSubscription,
  listOrgPayments,
  downloadInvoice,
  listOrgTransactions,
} from '../controllers/org.controller.js';

const router = express.Router();

// Every route: logged in AND has a valid orgId (blocks platform_admin
// and blocks anyone whose account somehow lacks an org).
router.use(protect, requireOrgContext);

// Read-only, safe for every org role (admin AND member)
router.get('/info', getOrgInfo);

// org_admin only from here down
router.get('/profile', authorize('org_admin'), getOrgProfile);
router.patch('/profile', authorize('org_admin'), updateOrgProfile);

router.get('/members', authorize('org_admin'), listMembers);
router.post('/members/invite', authorize('org_admin'), inviteMember);
router.patch('/members/:id/role', authorize('org_admin'), changeMemberRole);
router.delete('/members/:id', authorize('org_admin'), removeMember);

router.get('/subscription', authorize('org_admin'), getSubscription);
router.post('/subscription/change', authorize('org_admin'), changeSubscriptionPlan);
router.post('/subscription/cancel', authorize('org_admin'), cancelSubscription);

router.get('/payments', authorize('org_admin'), listOrgPayments);
router.get('/payments/:id/invoice', authorize('org_admin'), downloadInvoice);
router.get('/transactions', authorize('org_admin'), listOrgTransactions);

export default router;
