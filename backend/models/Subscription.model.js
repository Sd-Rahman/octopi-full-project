import mongoose from 'mongoose';

// One active-ish record per org describing what they're subscribed to.
// Kept separate from Organization so subscription HISTORY can exist
// later (e.g. an org could churn and resubscribe) without overloading
// the Organization document itself.
const subscriptionSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'FAILED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);
