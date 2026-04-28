const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  vaultPin: { type: String, select: false }, // Hashed PIN for Vault access
  avatar: { type: String, default: '' },
  resetOTP: { type: String, select: false },
  resetOTPExpires: { type: Date, select: false },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('vaultPin') && this.vaultPin) {
    this.vaultPin = await bcrypt.hash(this.vaultPin, 12);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchVaultPin = async function (enteredPin) {
  if (!this.vaultPin) return false;
  return await bcrypt.compare(enteredPin, this.vaultPin);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
