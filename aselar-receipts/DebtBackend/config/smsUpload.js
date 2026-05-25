// debtNoteSMS.js (Separate file, mirroring your receipt SMS upload - debt-specific)
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const twilio = require('twilio');
const { DebtPDFService } = require('./pdfService'); // Import new service

// Initialize
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const pdfService = new DebtPDFService();

// SMS debt note (mirrors SMSUpload, debt fields)
const debtNoteSMSUpload = async (req, res) => {
  try {
    const {
      phoneNumber,
      debtNoteNumber,
      fullName,
      location,
      amount,
      issuersName,
      message,
      htmlContent,
      companyInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!phoneNumber || !debtNoteNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields: phoneNumber or debtNoteNumber.' });
    }

    const debtNoteData = {
      debtNoteNumber,
      fullName,
      location,
      amount,
      issuersName,
      message,
      htmlContent,
      companyInfo: {
        nameOfBusiness: companyInfo?.nameOfBusiness || '',
        place: companyInfo?.place || '',
        businessNature: companyInfo?.businessNature || '',
        businessPhone: companyInfo?.businessPhone || '',
        emailBusiness: companyInfo?.emailBusiness || ''
      }
    };

    console.log('Generating PDF for debt note:', phoneNumber);

    const pdfBuffer = await pdfService.generateDebtNotePDF(debtNoteData); // Use debt service
    const filename = pdfService.generateDebtNoteFilename(debtNoteNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadDebtNoteToFirebase(pdfBuffer, filename, {
      debtNoteNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      amountOwed: amount
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded:', uploadResultWithQR.publicUrl);

    // SMS template (debt reminder)
    const smsMessage = `Debt Collection Notice Ref#${debtNoteNumber}

Debtor: ${fullName}
Location: ${location}
Amount Owed: BWP ${amount.toFixed(2)}

${message.substring(0, 100)}...

Pay via: ${uploadResultWithQR.publicUrl}

Thank you for prompt payment!`.trim();

    if (smsMessage.length > 1600) {
      smsMessage = smsMessage.substring(0, 1600) + '\n... (shortened)';
    }

    console.log('SMS body preview:', smsMessage);
    console.log('SMS char count:', smsMessage.length);

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
    console.error('Error in debt note SMS endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`Debt note SMS failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process debt note SMS'
    });
  }
};

// QR generation (mirrors generateQR)
const generateDebtNoteQR = async (req, res) => {
  try {
    const {
      debtNoteNumber,
      fullName,
      location,
      amount,
      issuersName,
      message,
      htmlContent,
      companyInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!debtNoteNumber) {
      return res.status(400).json({ success: false, error: 'Missing required field: debtNoteNumber' });
    }

    const debtNoteData = {
      debtNoteNumber,
      fullName,
      location,
      amount,
      issuersName,
      message,
      htmlContent,
      companyInfo: {
        nameOfBusiness: companyInfo?.nameOfBusiness || '',
        place: companyInfo?.place || '',
        businessNature: companyInfo?.businessNature || '',
        businessPhone: companyInfo?.businessPhone || '',
        emailBusiness: companyInfo?.emailBusiness || ''
      }
    };

    console.log("Generating PDF for debt note QR");

    const pdfBuffer = await pdfService.generateDebtNotePDF(debtNoteData);
    const filename = pdfService.generateDebtNoteFilename(debtNoteNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadDebtNoteToFirebase(pdfBuffer, filename, {
      debtNoteNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      amountOwed: amount
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
        debtNoteNumber
      },
      createdBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debt note QR generation:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`Debt note QR failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
};

module.exports = { debtNoteSMSUpload, generateDebtNoteQR };