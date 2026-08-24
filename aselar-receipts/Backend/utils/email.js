const nodemailer = require('nodemailer');

// Resend transporter — domain verified, ready for production sends
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: 'resend',                      // literally the string "resend", not your email
    pass: process.env.RESEND_API_KEY     // the API key you just created
  }
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    console.error('Resend connection error:', error);
  } else {
    console.log('Resend is ready to send emails');
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`, // must be @ your verified domain
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent via Resend:', info.messageId);
    return info;
  } catch (error) {
    console.error('Resend send error:', error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

module.exports = sendEmail;