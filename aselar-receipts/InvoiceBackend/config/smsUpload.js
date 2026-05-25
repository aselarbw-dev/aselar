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

// SMS invoice endpoint
const SMSInvoiceUpload = async (req, res) => {

  try {
    const {
      phoneNumber,
      fields = [],
      vat,
      invoiceNumber,
      totalSum,
      addition,
      htmlContent,
      companyInfo,
      clientInfo,
      bankingInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!phoneNumber || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumber or invoiceNumber'
      });
    }

    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }

    const invoiceData = {
      invoiceNumber,
      fields,
      vat,
      totalSum,
    
      addition: addition || '',
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
      clientInfo: {
        companyName: clientInfo?.companyName || '',
        addressedTo: clientInfo?.addressedTo || '',
        email: clientInfo?.email || '',
        phone: clientInfo?.phone || ''
      },
      bankingInfo: {
        accountName: bankingInfo?.accountName || '',
        bankName: bankingInfo?.bankName || '',
        accountNumber: bankingInfo?.accountNumber || '',
        branchName: bankingInfo?.branchName || '',
        swiftCode: bankingInfo?.swiftCode || ''
      }
    };

    console.log('Generating PDF for invoice:', invoiceNumber);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, invoiceData);
    const filename = pdfService.generateFilename(invoiceNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      invoiceNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: totalSum
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded:', uploadResultWithQR.publicUrl);

    const smsMessage = `Hello! Your invoice #${invoiceNumber} is ready.

Invoice Details:
• Total Amount: BWP ${totalSum}
• Due: Within 30 days

Download your invoice:
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
        invoiceNumber,
        phoneNumber
      },
      sentBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in SMS invoice endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`SMS upload failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process invoice SMS'
    });
  }
};

// New endpoint for QR code generation without SMS for invoice
const generateQRInvoice = async (req, res) => {
  try {
    const {
      fields = [],
      vat,
      invoiceNumber,
      totalSum,
      addition,
      htmlContent,
      companyInfo,
      clientInfo,
      bankingInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: invoiceNumber'
      });
    }

    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }

    const invoiceData = {
      invoiceNumber,
      fields,
      vat,
      totalSum,
      addition: addition || '',
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
      clientInfo: {
        companyName: clientInfo?.companyName || '',
        addressedTo: clientInfo?.addressedTo || '',
        email: clientInfo?.email || '',
        phone: clientInfo?.phone || ''
      },
      bankingInfo: {
        accountName: bankingInfo?.accountName || '',
        bankName: bankingInfo?.bankName || '',
        accountNumber: bankingInfo?.accountNumber || '',
        branchName: bankingInfo?.branchName || '',
        swiftCode: bankingInfo?.swiftCode || ''
      }
    };

    console.log('Generating PDF for invoice:', invoiceNumber);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, invoiceData);
    const filename = pdfService.generateFilename(invoiceNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      invoiceNumber,
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
        invoiceNumber
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

module.exports = { SMSInvoiceUpload, generateQRInvoice };