import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash, never plain text

    role: {
      type: String,
      enum: ['platform_admin', 'org_admin', 'org_member'],
      required: true,
    },

    // The tenant-isolation key. platform_admin: null. Everyone else: required.
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },

    status: {
      type: String,
      enum: ['invited', 'active', 'removed'],
      default: 'active',
    },

    resetPasswordToken: { type: String, default: null }, // stored HASHED, never the raw token
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
