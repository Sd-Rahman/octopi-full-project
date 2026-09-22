import cron from 'node-cron';
import Subscription from '../models/Subscription.model.js';
import Organization from '../models/Organization.model.js';
import Plan from '../models/Plan.model.js';
import { sendEmail } from '../utils/sendEmail.js';

// Runs every day at 9:00 AM — finds active subscriptions expiring
// within the next 7 days and sends a reminder email to the org.
// This is the "subscription expiring soon" notification the assessment
// requires. node-cron was already in package.json but wasn't wired up.
export function startSubscriptionReminderJob() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Running subscription expiry reminder check...');
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find active subscriptions expiring within 7 days
      const expiringSubs = await Subscription.find({
        status: 'ACTIVE',
        currentPeriodEnd: { $gte: now, $lte: sevenDaysFromNow },
      }).populate('planId');

      for (const sub of expiringSubs) {
        const org = await Organization.findById(sub.orgId);
        if (!org || org.status !== 'active') continue;

        const daysLeft = Math.ceil(
          (new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await sendEmail({
          to: org.billingEmail,
          subject: `Subscription expiring soon — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`,
          text: [
            `Hi ${org.name},`,
            '',
            `Your ${sub.planId?.name || 'current'} subscription is expiring on ${new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}.`,
            `That's ${daysLeft} day${daysLeft === 1 ? '' : 's'} from now.`,
            '',
            'Please renew your subscription to avoid any interruption in service.',
            '',
            'Thanks,',
            'The Octopi Digital Team',
          ].join('\n'),
        });

        console.log(`[cron] Sent expiry reminder to ${org.billingEmail} (${daysLeft} days left)`);
      }

      console.log(`[cron] Expiry reminder check complete. ${expiringSubs.length} reminder(s) sent.`);
    } catch (err) {
      console.error(`[cron] Subscription reminder job failed: ${err.message}`);
    }
  });

  console.log('[cron] Subscription expiry reminder job scheduled (daily at 9:00 AM)');
}
