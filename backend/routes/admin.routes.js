import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  listOrganizations,
  getOrganizationDetail,
  suspendOrganization,
  reactivateOrganization,
  deleteOrganization,
  createPlan,
  listPlans,
  updatePlan,
  disablePlan,
  enablePlan,
  deletePlan,
  listAllTransactions,
  getStats,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Every route here: logged in AND platform_admin. No exceptions.
router.use(protect, authorize('platform_admin'));

router.get('/orgs', listOrganizations);
router.get('/orgs/:id', getOrganizationDetail);
router.post('/orgs/:id/suspend', suspendOrganization);
router.post('/orgs/:id/reactivate', reactivateOrganization);
router.delete('/orgs/:id', deleteOrganization);

router.get('/plans', listPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.post('/plans/:id/disable', disablePlan);
router.post('/plans/:id/enable', enablePlan);
router.delete('/plans/:id', deletePlan);

router.get('/transactions', listAllTransactions);
router.get('/stats', getStats);

export default router;
