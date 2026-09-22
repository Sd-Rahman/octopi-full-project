// Usage: router.get('/x', protect, authorize('platform_admin'), handler)
// Must run AFTER `protect` — it reads req.user, which protect sets.
// This is the "server-side enforcement" the assessment insists on:
// hiding a button in the UI means nothing if this check isn't also here.
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};
