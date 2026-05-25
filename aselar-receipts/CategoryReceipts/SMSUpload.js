const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const twilio = require('twilio');
const { PDFServiceJsPDF } = require('./pdfService');

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize PDF service
const pdfService = new PDFServiceJsPDF();

// Existing SMS quote endpoint
const SMSUpload = async (req, res) => {
  try {
    const {
      phoneNumber,
      receiptsNumber,
      items = [],
      vat,
      cashPaid,
      total,
      change,
      htmlContent,
      discount
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!phoneNumber || !receiptsNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumber or receiptNumber.'
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Receipts must be an array'
      });
    }

    const receiptsData = {
 
      receiptsNumber,
      items: items,
      vat,
      total,
      cashPaid,
      discount,
      htmlContent,
      change
  
    };

    console.log('Generating PDF for quote:', phoneNumber);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
     receiptsNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: total
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded:', uploadResultWithQR.publicUrl);

    const smsMessage = `Hello! Your quotation #${receiptsNumber} is ready.

📋 Receipt Details:
• Total Amount: BWP ${total}
• Amt Paid: ${cashPaid}
.Balance: ${change}

📄 Download your receipt:
${uploadResultWithQR.publicUrl}

Thank you for your business!`.trim();

    console.log(`Sending SMS to: ${phoneNumber} (initiated by user: ${authenticatedUser.id})`);

    const smsResult = await twilioClient.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_ALPHANUMERIC_SENDER,
      to: phoneNumber
    });

    console.log('SMS sent:', smsResult.sid);

    res.json({
      success: true,
      message: 'SMS sent successfully with PDF download link',
      data: {
        smsId: smsResult.sid,
        downloadUrl: uploadResultWithQR.publicUrl,
        qrCodeBase64: uploadResultWithQR.qrCodeBase64,
        filename,
        phoneNumber
      },
      sentBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in SMS quote endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`SMS upload failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process quote SMS'
    });
  }
};

// New endpoint for QR code generation without SMS
const generateQR = async (req, res) => {
  try {
    const {
      receiptsNumber,
      items = [],
      vat,
      cashPaid,
      total,
      change,
      htmlContent,
      discount
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!receiptsNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: receiptNumber'
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }

    const receiptsData = {
    receiptsNumber,
      items: items,
      vat,
      total,
      cashPaid,
      discount,
      htmlContent,
      change
  
    };

    console.log("Generating PDF for receipt");

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      receiptsNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: totalSum
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded with QR:', uploadResultWithQR.publicUrl);

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        downloadUrl: uploadResultWithQR.publicUrl,
        qrCodeBase64: uploadResultWithQR.qrCodeBase64,
        filename,
        quoteNumber
      },
      createdBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in QR generation endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`QR generation failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
};

module.exports = { SMSUpload, generateQR };