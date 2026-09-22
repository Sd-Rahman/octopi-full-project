import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    billingEmail: { type: String, required: true, lowercase: true, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true },

    // pending: created, awaiting first payment. trial/active: usable.
    // suspended: admin-frozen. cancelled: subscription ended.
    status: {
      type: String,
      enum: ['pending', 'trial', 'active', 'suspended', 'cancelled'],
      default: 'pending',
    },

    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },

    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
