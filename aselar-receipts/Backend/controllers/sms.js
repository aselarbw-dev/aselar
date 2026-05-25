const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generate PDF locally
const generatePDF = (htmlContent, filePath) => {
  return new Promise((resolve, reject) => {
    const pdfOptions = { format: 'Letter' };
    pdf.create(htmlContent, pdfOptions).toFile(filePath, (err, res) => {
      if (err) reject(err);
      else resolve(res.filename);
    });
  });
};

// Process SMS + PDF
const sendSMS = async (req, res) => {
  const { phoneNumber, receiverName, items, cash,subtraction, grandTotal, htmlContent } = req.body;
 // Validate HTML content
 if (!htmlContent || typeof htmlContent !== 'string') {
  return res.status(400).json({ 
    success: false, 
    error: 'Invalid or missing HTML content' 
  });
}
if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
  return res.status(400).json({ 
    success: false, 
    error: "Invalid phone number format. Use E.164 format (e.g., +2677177XXXX)" 
  });
}
  try {
    // 1. Generate PDF
    const tempPdfPath = path.join(__dirname, '../temp-receipt.pdf');
    await generatePDF(htmlContent, tempPdfPath);

    // 2. Move PDF to uploads folder
    const filename = `${Date.now()}-receipt.pdf`;
    const targetPath = path.join(__dirname, `../upload/receipts/${filename}`);
    fs.renameSync(tempPdfPath, targetPath);

    // 3. Create public URL
    const domain = req.get('host'); // Automatically handles local/production
    const pdfUrl = `${req.protocol}://${domain}/upload/receipts/${filename}`;

    // 4. Send SMS
    const itemsBreakdown = items.map(item => 
      `${item.field3} - ${item.field1} x ${item.field4}`
    ).join('\n');
    
    const smsBody = `Receipt for ${receiverName}:\n${itemsBreakdown}\nTotal Bwp: ${ grandTotal}\nPaid Bwp:${cash}\nBalance Bwp:${subtraction}\nDownload: ${pdfUrl}`;

    await twilioClient.messages.create({
      body: smsBody,
      from: process.env.TWILIO_ALPHANUMERIC_SENDER,
      to: phoneNumber,
    });

    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
};
module.exports={sendSMS}