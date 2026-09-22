import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/me — update own name and/or password. Deliberately does
// NOT allow changing role or orgId here — those are admin-only actions
// elsewhere, never something a user sets on themselves.
export const updateMe = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    user.password = password; // re-hashed by pre-save hook
  }

  await user.save();
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } });
});
