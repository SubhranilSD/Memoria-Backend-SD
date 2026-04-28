const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key_change_in_prod', { expiresIn: '30d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ user, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ user, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get profile
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('+vaultPin');
  const userObj = user.toJSON();
  userObj.hasVault = !!user.vaultPin;
  res.json(userObj);
});

// Update profile
router.put('/me', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, avatar }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vault: Setup PIN
router.post('/vault/setup', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ message: 'PIN must be at least 4 characters' });
    
    const user = await User.findById(req.user._id);
    user.vaultPin = pin;
    await user.save();
    
    res.json({ message: 'Vault PIN set successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vault: Verify PIN
router.post('/vault/verify', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+vaultPin');
    
    if (!user.vaultPin) return res.status(400).json({ message: 'Vault PIN not set up' });
    
    const isMatch = await user.matchVaultPin(pin);
    if (!isMatch) return res.status(401).json({ message: 'Invalid Vault PIN' });
    
    // Generate a short-lived token for vault access (e.g., 1 hour)
    const vaultToken = jwt.sign({ id: user._id, vault: true }, process.env.JWT_SECRET || 'fallback_secret_key_change_in_prod', { expiresIn: '1h' });
    
    res.json({ vaultToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const sendEmail = require('../utils/mailer');

// Forgot Password: Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in user document (expires in 10 mins)
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Memoria Password Reset OTP',
        message: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #c4813a;">Password Reset Request</h2>
            <p>You requested a password reset for your Memoria account.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
              ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `
      });
      res.json({ message: 'OTP sent to email' });
    } catch (mailErr) {
      console.error('MAIL ERROR:', mailErr);
      user.resetOTP = undefined;
      user.resetOTPExpires = undefined;
      await user.save();
      return res.status(500).json({ 
        message: 'Failed to send email. Check backend console for details.',
        error: mailErr.message 
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified. You can now reset your password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Memoria Password Changed',
        message: `Your password has been successfully changed.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2e7d32;">Password Changed Successfully</h2>
            <p>This is a confirmation that your Memoria account password has been updated.</p>
            <p style="color: #666; font-size: 13px;">Note: For security reasons, we do not send your old password in plain text. If you did not authorize this change, please contact support immediately.</p>
          </div>
        `
      });
    } catch (mailErr) {
      // Don't fail the password change if confirmation email fails
      console.error('Confirmation email failed:', mailErr);
    }

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Test Email Connection
router.get('/test-email', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ message: 'Email credentials not configured in .env' });
    }

    await sendEmail({
      email: process.env.EMAIL_USER,
      subject: 'Memoria SMTP Test',
      message: 'If you are reading this, your email configuration is working perfectly!',
      html: '<h1 style="color: #c4813a;">SMTP Test Successful!</h1><p>Your Memoria app is now ready to send emails.</p>'
    });

    res.json({ message: 'Test email sent successfully to your own address!' });
  } catch (err) {
    console.error('SMTP TEST ERROR:', err);
    res.status(500).json({ 
      message: 'SMTP Test Failed', 
      error: err.message,
      tip: 'Ensure you are using a 16-character App Password, not your regular password.' 
    });
  }
});

module.exports = router;
