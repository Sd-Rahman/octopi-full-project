import express from 'express';

const router = express.Router();

// GET /api/test/ping
// Purpose: nothing to do with the app's real features. This exists
// purely to prove that browser -> Express -> response actually works
// before we add auth, DB models, or anything else on top of it.
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong from backend',
    timestamp: new Date().toISOString(),
  });
});

export default router;
