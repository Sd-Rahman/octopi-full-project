import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getMe, updateMe } from '../controllers/me.controller.js';

const router = express.Router();

router.get('/', protect, getMe);
router.patch('/', protect, updateMe);

export default router;
