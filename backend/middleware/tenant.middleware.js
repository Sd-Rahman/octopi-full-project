// This is THE multi-tenancy enforcement point. Any route scoped to
// "my organization's data" runs this after protect+authorize.
// It does two things:
//   1. Blocks platform_admin from accidentally hitting org-scoped
//      routes without an org context (they have their own admin routes).
//   2. Refuses to proceed if, for any reason, req.user.orgId is missing
//      for a non-platform_admin user — this should never happen given
//      how registration/invites work, but if it ever did, failing
//      closed here is much safer than letting a query run with an
//      undefined orgId (which could match unexpected documents).
export const requireOrgContext = async (req, res, next) => {
  if (req.user.role === 'platform_admin') {
    return res.status(403).json({ error: 'Use the platform admin endpoints for this' });
  }
  if (!req.user.orgId) {
    return res.status(403).json({ error: 'No organization associated with this account' });
  }

  // Check if organization has been suspended by platform admin
  const Organization = (await import('../models/Organization.model.js')).default;
  const org = await Organization.findById(req.user.orgId);
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  if (org.status === 'suspended') {
    return res.status(403).json({
      error: `Your organization has been suspended by the platform administrator. Reason: ${org.suspendedReason || 'Administrative freeze'}. Access to tenant data is locked.`
    });
  }

  req.org = org;
  next();
};

// Every controller that reads/writes org-scoped data (Users, Subscriptions,
// Payments, Transactions) filters its Mongo queries by this orgId —
// e.g. Payment.find({ orgId: req.user.orgId }), NEVER Payment.find({}).
// That filter is the actual isolation; this middleware just guarantees
// a valid orgId exists before a controller ever runs.
