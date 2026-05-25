const nodemailer = require('nodemailer');

// Create Mailtrap transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    console.error('Mailtrap connection error:', error);
  } else {
    console.log('Mailtrap is ready to receive test emails');
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html // Uncomment if you want HTML emails
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent to Mailtrap:', info.messageId);
    return info;
  } catch (error) {
    console.error('Mailtrap send error:', error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

module.exports = sendEmail;