import mongoose from 'mongoose';

// A Plan is platform-wide — it does NOT belong to any organization.
// Organizations subscribe TO a plan, they don't own one.
const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }, // store in smallest currency unit (cents) once Stripe enters the picture
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true }, // lets admin "disable" a plan without deleting it (existing subscribers keep it)
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

export default mongoose.model('Plan', planSchema);
