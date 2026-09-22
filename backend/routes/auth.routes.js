import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, forgotPassword, resetPassword } from '../controllers/auth.controller.js';

const router = express.Router();

// Auth endpoints are prime brute-force targets — rate-limit them
// specifically, tighter than the rest of the API.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

export default router;
