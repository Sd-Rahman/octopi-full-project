// One-time setup script: creates platform admin, plans, and realistic demo
// organizations with active subscriptions, members, and transactions.
// Safe to re-run: skips entities that already exist.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import Plan from '../models/Plan.model.js';
import Organization from '../models/Organization.model.js';
import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import Transaction from '../models/Transaction.model.js';

dotenv.config();

const run = async () => {
  await connectDB();

  // 1. Platform Admin
  const adminEmail = 'admin@octopi.dev';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Platform Admin',
      email: adminEmail,
      password: 'Admin123!',
      role: 'platform_admin',
      orgId: null,
    });
    console.log(`✓ Created platform admin: ${adminEmail} / Admin123!`);
  } else {
    console.log('• Platform admin already exists.');
  }

  // 2. Plans
  let starterPlan = await Plan.findOne({ name: 'Starter' });
  if (!starterPlan) {
    starterPlan = await Plan.create({
      name: 'Starter',
      price: 999,
      billingInterval: 'monthly',
      features: ['Up to 5 team members', 'Standard API access', 'Community support', 'Basic analytics'],
    });
    console.log('✓ Created Starter plan ($9.99/mo)');
  }

  let proPlan = await Plan.findOne({ name: 'Pro' });
  if (!proPlan) {
    proPlan = await Plan.create({
      name: 'Pro',
      price: 2999,
      billingInterval: 'monthly',
      features: ['Unlimited team members', 'High-throughput API', 'Priority 24/7 support', 'Advanced audit logs', 'Custom exports'],
    });
    console.log('✓ Created Pro plan ($29.99/mo)');
  }

  // 3. Organization 1: Acme Technologies (Pro Plan, Active)
  let acme = await Organization.findOne({ name: 'Acme Technologies' });
  if (!acme) {
    acme = await Organization.create({
      name: 'Acme Technologies',
      billingEmail: 'billing@acme.com',
      contactEmail: 'contact@acme.com',
      status: 'active',
      currentPlan: proPlan._id,
    });
    console.log('✓ Created organization: Acme Technologies');
  }

  // Users for Acme
  const acmeAdminEmail = 'admin@acme.com';
  if (!(await User.findOne({ email: acmeAdminEmail }))) {
    await User.create({
      name: 'Sarah Connor',
      email: acmeAdminEmail,
      password: 'Password123!',
      role: 'org_admin',
      orgId: acme._id,
      status: 'active',
    });
    console.log(`✓ Created Org Admin: ${acmeAdminEmail} / Password123!`);
  }

  const acmeMember1Email = 'alice@acme.com';
  if (!(await User.findOne({ email: acmeMember1Email }))) {
    await User.create({
      name: 'Alice Johnson',
      email: acmeMember1Email,
      password: 'Password123!',
      role: 'org_member',
      orgId: acme._id,
      status: 'active',
    });
    console.log(`✓ Created Org Member: ${acmeMember1Email} / Password123!`);
  }

  const acmeMember2Email = 'bob@acme.com';
  if (!(await User.findOne({ email: acmeMember2Email }))) {
    await User.create({
      name: 'Bob Smith',
      email: acmeMember2Email,
      password: 'Password123!',
      role: 'org_member',
      orgId: acme._id,
      status: 'active',
    });
    console.log(`✓ Created Org Member: ${acmeMember2Email} / Password123!`);
  }

  // Subscription for Acme
  let acmeSub = await Subscription.findOne({ orgId: acme._id });
  if (!acmeSub) {
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    acmeSub = await Subscription.create({
      orgId: acme._id,
      planId: proPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const payment = await Payment.create({
      orgId: acme._id,
      subscriptionId: acmeSub._id,
      stripeSessionId: 'cs_test_demo_acme_001',
      stripePaymentIntentId: 'pi_test_demo_acme_001',
      amount: 2999,
      currency: 'usd',
      status: 'SUCCESS',
    });

    await Transaction.create({
      orgId: acme._id,
      paymentId: payment._id,
      type: 'subscription_payment',
      amount: 2999,
      status: 'SUCCESS',
      meta: { planName: 'Pro' },
    });
    console.log('✓ Created active Pro subscription & transactions for Acme');
  }

  // 4. Organization 2: Starlight Creative (Starter Plan, Active)
  let starlight = await Organization.findOne({ name: 'Starlight Creative' });
  if (!starlight) {
    starlight = await Organization.create({
      name: 'Starlight Creative',
      billingEmail: 'billing@starlight.io',
      contactEmail: 'hello@starlight.io',
      status: 'active',
      currentPlan: starterPlan._id,
    });
    console.log('✓ Created organization: Starlight Creative');
  }

  const starlightAdminEmail = 'admin@starlight.io';
  if (!(await User.findOne({ email: starlightAdminEmail }))) {
    await User.create({
      name: 'Elena Rostova',
      email: starlightAdminEmail,
      password: 'Password123!',
      role: 'org_admin',
      orgId: starlight._id,
      status: 'active',
    });
    console.log(`✓ Created Org Admin: ${starlightAdminEmail} / Password123!`);
  }

  let starlightSub = await Subscription.findOne({ orgId: starlight._id });
  if (!starlightSub) {
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    starlightSub = await Subscription.create({
      orgId: starlight._id,
      planId: starterPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const payment = await Payment.create({
      orgId: starlight._id,
      subscriptionId: starlightSub._id,
      stripeSessionId: 'cs_test_demo_starlight_001',
      stripePaymentIntentId: 'pi_test_demo_starlight_001',
      amount: 999,
      currency: 'usd',
      status: 'SUCCESS',
    });

    await Transaction.create({
      orgId: starlight._id,
      paymentId: payment._id,
      type: 'subscription_payment',
      amount: 999,
      status: 'SUCCESS',
      meta: { planName: 'Starter' },
    });
    console.log('✓ Created active Starter subscription & transactions for Starlight');
  }

  // 5. Organization 3: Nova Systems (Pending / Inactive Subscription)
  let nova = await Organization.findOne({ name: 'Nova Systems' });
  if (!nova) {
    nova = await Organization.create({
      name: 'Nova Systems',
      billingEmail: 'founder@novasystems.dev',
      contactEmail: 'support@novasystems.dev',
      status: 'pending',
      currentPlan: null,
    });
    console.log('✓ Created organization: Nova Systems (Pending, No Plan Selected)');
  } else {
    // Reset Nova to pending with no plan so admin can choose individually
    nova.status = 'pending';
    nova.currentPlan = null;
    await nova.save();
    await Subscription.deleteMany({ orgId: nova._id });
    console.log('✓ Reset organization: Nova Systems (Pending, No Plan Selected)');
  }

  const novaAdminEmail = 'founder@novasystems.dev';
  if (!(await User.findOne({ email: novaAdminEmail }))) {
    await User.create({
      name: 'David Vance',
      email: novaAdminEmail,
      password: 'Password123!',
      role: 'org_admin',
      orgId: nova._id,
      status: 'active',
    });
    console.log(`✓ Created Org Admin: ${novaAdminEmail} / Password123!`);
  }

  console.log('\n--- Demo Data Seeding Complete ---');
  console.log('Platform Admin:      admin@octopi.dev          / Admin123!');
  console.log('Org Admin (Pro):     admin@acme.com            / Password123!');
  console.log('Org Member:          alice@acme.com            / Password123!');
  console.log('Org Admin (Starter): admin@starlight.io        / Password123!');
  console.log('Org Admin (Pending): founder@novasystems.dev   / Password123!');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
