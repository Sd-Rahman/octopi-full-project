import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import testRoutes from './routes/test.routes.js';
import authRoutes from './routes/auth.routes.js';
import registerRoutes from './routes/register.routes.js';
import billingRoutes, { stripeWebhook } from './routes/billing.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orgRoutes from './routes/org.routes.js';
import meRoutes from './routes/me.routes.js';
import publicRoutes from './routes/public.routes.js';

// Separated from server.js so tests can import a fully wired Express
// app WITHOUT also triggering app.listen() or the real connectDB()
// (which calls process.exit(1) on failure — fine for a real boot,
// fatal for a test runner that manages its own DB connection).
const app = express();

app.use(helmet());
app.use(cors());

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.use('/api/test', testRoutes);
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/me', meRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
