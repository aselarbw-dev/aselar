const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


const sendWhatsApp = async (req, res) => {
  const { phoneNumber, receiverName, items, cash, subtraction, grandTotal, htmlContent } = req.body;

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

    // 2. Move to /upload
    const filename = `${Date.now()}-receipt.pdf`;
    const targetPath = path.join(__dirname, `../upload/receipts/${filename}`);
    fs.renameSync(tempPdfPath, targetPath);

    // 3. Public URL
    const domain = req.get('host');
    const pdfUrl = `${req.protocol}://${domain}/upload/receipts/${filename}`;

    // 4. Message text
    const itemsBreakdown = items.map(item => 
      `${item.field3} - ${item.field1} x ${item.field4}`
    ).join('\n');

    const messageBody = `🧾 Receipt for ${receiverName}:\n${itemsBreakdown}\nTotal Bwp: ${grandTotal}\nPaid Bwp: ${cash}\nBalance: ${subtraction}\n📎 Download PDF: ${pdfUrl}`;

    // 5. WhatsApp message (Sandbox mode)
    await twilioClient.messages.create({
      from: 'whatsapp:+14155238886', // Twilio sandbox number
      to: `whatsapp:${phoneNumber}`,  // e.g. whatsapp:+2677177XXXX
      body: messageBody,
    });

    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('WhatsApp Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message' });
  }
};

module.exports = { sendWhatsApp };
