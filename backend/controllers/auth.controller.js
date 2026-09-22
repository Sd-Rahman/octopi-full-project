import crypto from 'crypto';
import User from '../models/User.model.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/sendEmail.js';

// POST /api/auth/login — works for all three roles; role comes back
// in the response so the frontend knows which panel to route to.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Same error for "no user" and "wrong password" — prevents email enumeration.
  if (!user || user.status === 'removed' || !(await user.matchPassword(password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Freeze access if organization has been suspended by platform admin
  if (user.orgId) {
    const Organization = (await import('../models/Organization.model.js')).default;
    const org = await Organization.findById(user.orgId);
    if (org && org.status === 'suspended') {
      return res.status(403).json({
        error: `Your organization has been suspended. Reason: ${org.suspendedReason || 'Administrative freeze'}.`
      });
    }
  }

  const token = generateToken(user._id);
  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, orgId: user.orgId },
    token,
  });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  // Always respond the same way whether or not the email exists —
  // otherwise this endpoint becomes another email-enumeration leak.
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  // Store only a HASH of the token, same principle as passwords — if the
  // DB leaks, the leaked hash can't be used to reset anyone's password.
  user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password here (valid 1 hour): ${resetUrl}`,
  });

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired' });
  }

  user.password = password; // re-hashed automatically by the pre-save hook
  if (user.status === 'invited') {
    user.status = 'active';
  }
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  const token = generateToken(user._id);

  res.json({
    message: 'Password set successfully. You are now logged in.',
    user: { id: user._id, name: user.name, email: user.email, role: user.role, orgId: user.orgId },
    token,
  });
});
