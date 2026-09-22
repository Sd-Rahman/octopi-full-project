import express from 'express';
import { listPublicPlans } from '../controllers/public.controller.js';

const router = express.Router();
router.get('/plans', listPublicPlans);

export default router;
