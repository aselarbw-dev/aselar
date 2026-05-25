// payslipSMS.js (New file, mirroring debtNoteSMS.js/receipt SMSUpload - payslip-specific)
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const twilio = require('twilio');
const { PayslipPDFService } = require('./payslipPDFService'); // Import payslip service

// Initialize
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const pdfService = new PayslipPDFService();

// SMS payslip (mirrors SMSUpload, payslip fields)
const payslipSMSUpload = async (req, res) => {
  try {
    const {
      phoneNumber,
      payslipNumber,
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions = [],
      additions = [],
      balance,
      htmlContent,
      companyInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!phoneNumber || !payslipNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields: phoneNumber or payslipNumber.' });
    }

    const payslipData = {
      payslipNumber,
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions,
      additions,
      balance,
      htmlContent,
      companyInfo: {
        nameOfBusiness: companyInfo?.nameOfBusiness || '',
        place: companyInfo?.place || '',
        businessNature: companyInfo?.businessNature || '',
        businessPhone: companyInfo?.businessPhone || '',
        emailBusiness: companyInfo?.emailBusiness || ''
      }
    };

    console.log('Generating PDF for payslip:', phoneNumber);

    const pdfBuffer = await pdfService.generatePayslipPDF(payslipData); // Use payslip service
    const filename = pdfService.generatePayslipFilename(payslipNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadPayslipToFirebase(pdfBuffer, filename, {
      payslipNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      netSalary: balance
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded:', uploadResultWithQR.publicUrl);

    // SMS template (payslip summary w/ net balance, ref, link)
    const smsMessage = `Payslip Ref#${payslipNumber}

Employee: ${employeeName} (ID: ${employeeId})
Basic Salary: BWP ${basicSalary.toFixed(2)}
VAT: BWP ${vat.toFixed(2)}
Net Salary: BWP ${balance.toFixed(2)}

View details: ${uploadResultWithQR.publicUrl}

Thank you!`.trim();

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
    console.error('Error in payslip SMS endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`Payslip SMS failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payslip SMS'
    });
  }
};

// QR generation (mirrors generateQR)
const generatePayslipQR = async (req, res) => {
  try {
    const {
      payslipNumber,
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions = [],
      additions = [],
      balance,
      htmlContent,
      companyInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!payslipNumber) {
      return res.status(400).json({ success: false, error: 'Missing required field: payslipNumber' });
    }

    const payslipData = {
      payslipNumber,
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions,
      additions,
      balance,
      htmlContent,
      companyInfo: {
        nameOfBusiness: companyInfo?.nameOfBusiness || '',
        place: companyInfo?.place || '',
        businessNature: companyInfo?.businessNature || '',
        businessPhone: companyInfo?.businessPhone || '',
        emailBusiness: companyInfo?.emailBusiness || ''
      }
    };

    console.log("Generating PDF for payslip QR");

    const pdfBuffer = await pdfService.generatePayslipPDF(payslipData);
    const filename = pdfService.generatePayslipFilename(payslipNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadPayslipToFirebase(pdfBuffer, filename, {
      payslipNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      netSalary: balance
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
        payslipNumber
      },
      createdBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in payslip QR generation:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`Payslip QR failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
};

module.exports = { payslipSMSUpload, generatePayslipQR };