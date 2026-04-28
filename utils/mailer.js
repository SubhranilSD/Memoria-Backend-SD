const nodemailer = require('nodemailer');

/**
 * Send an email using nodemailer
 * @param {Object} options - Email options (email, subject, message, html)
 */
const sendEmail = async (options) => {
  // If no credentials, log to console for development
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 MOCK EMAIL SENT (No Credentials in .env)');
    console.log(`TO:      ${options.email}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log(`BODY:    ${options.message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Memoria Team" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
