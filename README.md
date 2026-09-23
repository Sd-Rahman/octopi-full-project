# Octopi Digital — Multi-Tenant SaaS Subscription Platform

## Live Deployment

The full-stack application is deployed and live on Render:

- **Web Application (Frontend)**: [https://octopi-frontend.onrender.com](https://octopi-frontend.onrender.com)
- **REST API (Backend)**: [https://octopi-full-project.onrender.com](https://octopi-full-project.onrender.com)

## Architecture

- **Frontend**: React (Vite, no Next.js) + React Router. Plain `fetch`-based API client, no Redux/TanStack Query — state is simple enough here that React Context (`AuthContext`) covers it. `ProtectedRoute` gates pages by role client-side, purely for UX; it is never the real security boundary.
- **Backend**: Node.js + Express, REST API, ESM modules throughout.
- **Database**: MongoDB (Mongoose ODM). Chosen over PostgreSQL per the assessment's either/or option.
- **Payments**: Stripe Checkout (test mode), confirmed via webhook only.

## Multi-tenant approach

Every tenant-scoped document (`User`, `Subscription`, `Payment`, `Transaction`) carries an `orgId`. There are **no MongoDB-level constraints** enforcing isolation — Mongo doesn't have foreign keys — so isolation is entirely an application-layer discipline:

1. `middleware/auth.middleware.js` (`protect`) verifies the JWT and loads the real `User` document as `req.user`.
2. `middleware/tenant.middleware.js` (`requireOrgContext`) refuses to proceed if `req.user.orgId` is missing (fails closed, not open).
3. Every org-scoped controller query is filtered by `req.user.orgId` — e.g. `Payment.find({ orgId: req.user.orgId })`, never `Payment.find({})`. Route params that reference a specific record (e.g. `PATCH /org/members/:id`) additionally filter `{ _id: req.params.id, orgId: req.user.orgId }` together, so a valid ID from another org still resolves to nothing.
4. Platform Admin routes (`routes/admin.routes.js`) are the one deliberate exception — they query across all orgs, gated by `authorize('platform_admin')` instead.

## Auth strategy

JWT-based (not sessions). `POST /api/auth/login` issues a 7-day token containing only `{ userId }`. Passwords are hashed with bcrypt via a Mongoose `pre('save')` hook (only re-hashes when the password field actually changed). Forgot/reset password stores a **hashed** reset token (SHA-256) with a 1-hour expiry — mirrors the password-hashing principle so a DB leak can't be used to hijack accounts.

Three roles: `platform_admin`, `org_admin`, `org_member`. `middleware/role.middleware.js` (`authorize(...)`) enforces role checks server-side on every protected route — the frontend hiding a nav link is a UX nicety only.

## Payment flow

1. `POST /api/register` — creates `Organization` (`status: pending`) and the admin `User` immediately, then creates a Stripe Checkout Session and returns its URL. Nothing is active yet.
2. Browser redirects to Stripe's hosted checkout page.
3. `POST /api/billing/webhook` — Stripe calls this **server-to-server** on `checkout.session.completed`. This is the only place anything gets activated. The frontend's `success_url` redirect is purely informational (see `CheckoutSuccessPage.jsx`'s comment) — it never activates anything itself, per "never trust a frontend redirect alone."
4. On failure/expiry (`checkout.session.expired`), a `FAILED` `Payment`/`Transaction` is recorded and the org is left `pending`, with `POST /api/billing/checkout/:orgId` available to retry.

## Transaction safety & idempotency

- **Idempotency**: `models/WebhookEvent.model.js` has a unique index on `stripeEventId`. The webhook handler tries to insert the event ID *before* doing anything else; a duplicate delivery hits the unique constraint, is caught, and short-circuits to `200 OK` without re-running business logic.
- **Atomicity**: `handleCheckoutCompleted` (in `controllers/billing.controller.js`) wraps the `Payment` + `Subscription` + `Organization` writes in a single Mongoose session/transaction. Any failure mid-way calls `abortTransaction()` — the org is left cleanly `pending` rather than half-updated. Requires a MongoDB replica set, which every Atlas cluster (including the free M0 tier) provides by default.

## Security notes

- Passwords: bcrypt hashed, never logged or returned by any endpoint.
- Webhook signature verified via `stripe.webhooks.constructEvent` — the raw request body is preserved for this one route (`express.raw()`, mounted *before* the global `express.json()` in `server.js`) since Stripe signs the exact raw bytes.
- Rate limiting: tighter limits on `/api/auth/*` and `/api/register`, a looser global limit elsewhere (`express-rate-limit`).
- `helmet()` for standard security headers.
- Generic error responses only (`server.js`'s central error handler) — stack traces/internals are logged server-side, never sent to the client.
- No card data ever touches this backend — Stripe Checkout is fully hosted, we only ever see a session ID and payment intent ID.

## AI usage

Built collaboratively with Claude across the full stack — models, middleware, controllers, routes, and the React frontend — with an emphasis on understanding *why* each piece works the way it does (isolation enforcement, webhook idempotency, transaction rollback) rather than treating it as a black box, since that understanding is what's being evaluated in the review call.

## How to run locally

**Backend:**
```
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
npm run seed            # creates the platform admin + two starter plans
npm run dev
```

**Frontend:**
```
cd frontend
npm install
npm run dev
```

**Stripe webhook forwarding (required for payments to activate anything locally):**
```
stripe login
stripe listen --forward-to localhost:5000/api/billing/webhook
```
Copy the `whsec_...` value it prints into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

## Test credentials

- **Platform Admin**: `admin@octopi.dev` / `Admin123!` (created by `npm run seed`)
- **Organization Admin** / **Organization Member**: create via `POST /api/register` (org admin) and the Members page's invite flow (org member) — see the walkthrough video for a full run.

## Known limitations / what's next with more time

- Subscription plan changes (`POST /org/subscription/change`) swap the plan immediately without prorated billing — a real implementation would use Stripe Subscriptions with proration, not one-off Checkout Sessions per cycle.
- Subscription expiry reminder emails: the trigger function exists conceptually but isn't wired to a scheduler (would add `node-cron` or a scheduled job).
- Bonus items not implemented: CI/CD pipeline, PDF invoice generation, per-org custom SMTP configuration, deeper UI polish.
- Automated tests are scaffolded conceptually in this README's scope but a real Jest/Supertest suite (with `mongodb-memory-server` for isolated test runs) is the next thing to add given more time — the assessment's "prove you know what matters to test" list (auth, role authorization, tenant isolation, payment flow, duplicate webhook handling, transaction rollback) maps directly to the pieces documented above.
