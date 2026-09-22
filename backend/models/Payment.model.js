import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },

    stripeSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null },

    amount: { type: Number, required: true }, // smallest currency unit (cents)
    currency: { type: String, default: 'usd' },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
