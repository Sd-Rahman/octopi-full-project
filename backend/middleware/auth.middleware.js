import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// This is THE gatekeeper middleware. Any route that needs a logged-in
// user runs this first. If it calls next(), the route handler runs.
// If it calls res.status(...).json(...) instead, Express stops there —
// the route handler never runs at all.
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify does two things at once: checks the signature is valid
    // (proves we issued this token, it wasn't forged) AND checks it
    // hasn't expired. Throws if either check fails.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the real, fresh user document to req — every downstream
    // handler and middleware (like tenant-isolation in Stage 4) reads
    // req.user instead of re-decoding the token themselves.
    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, invalid or expired token' });
  }
};
