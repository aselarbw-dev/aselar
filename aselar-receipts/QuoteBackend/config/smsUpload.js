const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { Resend } = require('resend');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { PDFServiceJsPDF } = require('./pdfService');
const SibApiV3Sdk = require('sib-api-v3-sdk');
// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Gmail Transporter
const sendEmail = async ({ to, subject, html, attachments }) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'Aselar <onboarding@resend.dev>',
    to,
    subject,
    html,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : a.content
    }))
  });
};

// Initialize PDF service
const pdfService = new PDFServiceJsPDF();

// ====================== SMS UPLOAD (Existing) ======================
const SMSUpload = async (req, res) => {
  try {
    const {
      phoneNumber,
      quotes = [],
      vat,
      quoteNumber,
      totalSum,
      subTotal,
      htmlContent,
      companyInfo,
      clientInfo,
      bankingInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!phoneNumber || !quoteNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields: phoneNumber or quoteNumber' });
    }

    if (!Array.isArray(quotes)) {
      return res.status(400).json({ success: false, error: 'Quotes must be an array' });
    }

    const quoteData = {
      quoteNumber,
      items: quotes,
      vat,
      totalSum,
      subtotal: subTotal,
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

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, quoteData);
    const filename = pdfService.generateFilename(quoteNumber);

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      quoteNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: totalSum
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    const smsMessage = `Hello! Your quotation #${quoteNumber} is ready.

Quote Details:
• Total Amount: BWP ${totalSum}
• Valid for: 30 days

Download your quote:
${uploadResultWithQR.publicUrl}

Thank you for your business!`.trim();

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
        quoteNumber,
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
    res.status(500).json({ success: false, error: error.message || 'Failed to process quote SMS' });
  }
};

// ====================== EMAIL UPLOAD (New) ======================
const EmailUpload = async (req, res) => {
  try {
    const {
      email,
      quotes = [],
      vat,
      quoteNumber,
      totalSum,
      subTotal,
      htmlContent,
      companyInfo,
      clientInfo,
      bankingInfo
    } = req.body;

    const authenticatedUser = req.user;

    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!email || !quoteNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email or quoteNumber' });
    }

    if (!Array.isArray(quotes)) {
      return res.status(400).json({ success: false, error: 'Quotes must be an array' });
    }

    // Prepare data for PDF
    const quoteData = {
      quoteNumber,
      items: quotes,
      vat,
      totalSum,
      subtotal: subTotal,
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

    console.log('Generating PDF for email quote:', quoteNumber);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, quoteData);
    const filename = pdfService.generateFilename(quoteNumber);

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      quoteNumber,
      customerEmail: email,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: totalSum
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    // Email Body
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a8a;">Quotation #${quoteNumber}</h2>
        <p>Hello,</p>
        <p>Thank you for your interest. Please find your quotation below:</p>
        
        <strong>Total Amount: BWP ${totalSum}</strong><br>
        ${vat ? `VAT: BWP ${vat}<br>` : ''}
        <p>Valid for 30 days.</p>
        
        <p style="margin: 25px 0;">
          <a href="${uploadResultWithQR.publicUrl}" 
             style="background:#1e3a8a; color:white; padding:14px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">
            📄 Download Full Quotation PDF
          </a>
        </p>
        
        <p>Thank you for your business!</p>
        <p><strong>${companyInfo?.nameOfBusiness || 'Your Business'}</strong></p>
      </div>
    `;

  await sendEmail({
      to: email,
      subject: `Your Quotation #${quoteNumber} from ${companyInfo?.nameOfBusiness || 'Our Company'}`,
      html: emailBody,
        attachments: [{
    filename: filename,
    content: pdfBuffer,
    contentType: 'application/pdf'
  }]
    });

    console.log(`✅ Email sent for quote ${quoteNumber}`);

    res.json({
      success: true,
      message: 'Quotation sent successfully via Email with PDF attachment',
      data: {
        downloadUrl: uploadResultWithQR.publicUrl,
        filename,
        quoteNumber,
        emailAddress: email
      },
      sentBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in EmailUpload (Quote):', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email quotation'
    });
  }
};

// ====================== GENERATE QR (Existing) ======================
const generateQR = async (req, res) => {
  try {
    const {
      quotes = [],
      vat,
      quoteNumber,
      totalSum,
      subTotal,
      htmlContent,
      companyInfo,
      clientInfo,
      bankingInfo
    } = req.body;
    
    const authenticatedUser = req.user;
    
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (!quoteNumber) {
      return res.status(400).json({ success: false, error: 'Missing required field: quoteNumber' });
    }

    if (!Array.isArray(quotes)) {
      return res.status(400).json({ success: false, error: 'Quotes must be an array' });
    }

    const quoteData = {
      quoteNumber,
      items: quotes,
      vat,
      totalSum,
      subtotal: subTotal,
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

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, quoteData);
    const filename = pdfService.generateFilename(quoteNumber);

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      quoteNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: totalSum
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

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
    res.status(500).json({ success: false, error: error.message || 'Failed to generate QR code' });
  }
};

module.exports = { SMSUpload, generateQR, EmailUpload };