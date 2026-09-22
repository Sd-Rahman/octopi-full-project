import mongoose from 'mongoose';

// The user-facing "history" record. Distinct from Payment: a Payment
// is specifically a Stripe money-movement record; a Transaction is a
// broader ledger entry (could later include non-payment events).
// For this project they're mostly 1:1, kept separate to mirror what
// the assessment explicitly asks for as its own page/list.
const transactionSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    type: { type: String, required: true }, // e.g. 'subscription_payment', 'plan_change', 'cancellation'
    amount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'ROLLED_BACK'],
      default: 'PENDING',
      index: true,
    },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
