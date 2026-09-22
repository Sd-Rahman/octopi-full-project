import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerOrganization } from '../controllers/registration.controller.js';

const router = express.Router();
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/', registerLimiter, registerOrganization);

export default router;
