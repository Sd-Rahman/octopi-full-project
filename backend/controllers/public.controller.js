import Plan from '../models/Plan.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/plans — deliberately public, no auth. A prospective customer
// has to see pricing/features BEFORE they can register or log in, so
// this one read-only endpoint is intentionally outside the auth wall.
// Never exposes anything beyond what a pricing page would show.
export const listPublicPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).select('name price billingInterval features').sort({ price: 1 });
  res.json(plans);
});
