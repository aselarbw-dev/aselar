const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const twilio = require('twilio');
const { PDFServiceJsPDF } = require('./pdfService');

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize PDF service
const pdfService = new PDFServiceJsPDF();

// SMS receipt endpoint (generates PDF, uploads, sends SMS with details and link)
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
      discount,
      subtotal,  // ← ADD
      createdAt,  // ← ADD
      companyInfo  // ← ADD
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
        error: 'Missing required fields: phoneNumber or receiptsNumber.'
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
      items,
      vat,
      total,
      subtotal,  // ← ADD
      cashPaid,
      discount,
      htmlContent,
      createdAt,  // ← ADD (for date)
      companyInfo,  // ← ADD (for header)
      change,
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
    };

    console.log('Generating PDF for receipt:', phoneNumber);
    console.log('Incoming req.body.items:', JSON.stringify(items, null, 2));
console.log('Items type:', typeof items, 'Is array?', Array.isArray(items), 'Length:', items?.length || 0);

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

    // SMS template: Items bought (count), total, amount paid, change, and PDF link
    // ... (rest of function unchanged)

// Helper to format items for SMS (keeps it under ~100 chars total for items)
const formatItemsForSMS = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  
  return items.slice(0, 5).map(item => {  // Limit to first 5 to avoid overflow
    let itemStr = `${item.name.slice(0, 15)}${item.name.length > 15 ? '...' : ''}`.trim() + ` x${item.quantity}`;  // ← Changed to let; fixed ellipsis logic
    if (item.price > 0) itemStr += ` @BWP${item.price.toFixed(2)}`;  // No more reassignment error
    return `  • ${itemStr}`;
  }).join('\n') + (items.length > 5 ? '\n  • ... + more' : '');
};

// SMS template: Now includes formatted items list
const itemsFormatted = formatItemsForSMS(items);
const smsMessage = `Hello! Receipt #${receiptsNumber} ready.

 Items:
${itemsFormatted}

 Total: BWP ${total.toFixed(2)}
 Paid: BWP ${cashPaid.toFixed(2)}
Change: BWP ${change.toFixed(2)}

 Download: ${uploadResultWithQR.publicUrl}

Thanks!`.trim();

console.log('SMS body preview:', smsMessage);  // For debugging
console.log('SMS char count:', smsMessage.length);  // Quick check: <160 idealfor single msg  // Add this for debugging

// ... (Twilio send and response unchanged)

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
    console.error('Error in SMS receipt endpoint:', error);
    const userId = req.user?.id || 'unknown';
    console.error(`SMS upload failed for user ${userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process receipt SMS'
    });
  }
};

// QR code generation endpoint for receipts (no SMS, just PDF + upload + QR)
const generateQR = async (req, res) => {
  try {
    const {
      receiptsNumber,
      items,
      vat,
      total,
      subtotal,  // ← ADD
      cashPaid,
      discount,
      htmlContent,
      createdAt,  // ← ADD (for date)
      companyInfo,  // ← ADD (for header)
      change
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
        error: 'Missing required field: receiptsNumber'
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }

    console.log('Incoming req.body.items for QR:', JSON.stringify(items, null, 2));  // ← Add this for debug
    console.log('Items type:', typeof items, 'Is array?', Array.isArray(items), 'Length:', items?.length || 0);

    const receiptsData = {
      receiptsNumber,
      items,
      vat,
      total,
      subtotal,  // ← ADD
      cashPaid,
      discount,
      htmlContent,
      createdAt,  // ← ADD (for date)
      companyInfo,  // ← ADD (for header)
      change,
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
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
      totalAmount: total
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
        receiptsNumber
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
// Initialize Gmail Transporter
let emailTransporter = null;

const getEmailTransporter = () => {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,        // ← change from 465 to 587
  secure: false,    // ← false for port 587
  family: 4, 
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return emailTransporter;
};
// ====================== EMAIL UPLOAD (New) ======================
const EmailUpload = async (req, res) => {
  try {
    const {
      email,
      receiptsNumber,
      items = [],
      vat,
      cashPaid,
      total,
      change,
      discount,
      subtotal,
      createdAt,
      htmlContent,
      companyInfo
    } = req.body;

    const authenticatedUser = req.user;

    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!email || !receiptsNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email or receiptsNumber.' });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items must be an array' });
    }

    // Prepare data for PDF
    const receiptsData = {
      receiptsNumber,
      items,
      vat,
      total,
      subtotal,
      cashPaid,
      discount,
      htmlContent,
      createdAt,
      companyInfo,
      change,
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
    };

    console.log('Generating PDF for email receipt:', receiptsNumber);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsNumber);

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      receiptsNumber,
      customerEmail: email,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: total
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    // Format items for email
    const formatItemsForEmail = (items) => {
      if (!Array.isArray(items) || items.length === 0) return 'No items';
      return items.slice(0, 8).map(item => {
        let itemStr = `${(item.name || '').slice(0, 25)}${(item.name || '').length > 25 ? '...' : ''}`.trim();
        itemStr += ` x${item.quantity}`;
        if (item.price > 0) itemStr += ` @BWP${item.price.toFixed(2)}`;
        return `• ${itemStr}`;
      }).join('\n') + (items.length > 8 ? '\n• ... + more items' : '');
    };

    const itemsFormatted = formatItemsForEmail(items);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a8a;">Receipt #${receiptsNumber}</h2>
        <p>Hello,</p>
        <p>Thank you for your purchase. Here is your receipt:</p>
        
        <strong>Items:</strong><br>
        <pre style="background:#f8f9fa; padding:12px; border-radius:6px;">${itemsFormatted}</pre><br>
        
        Subtotal: <strong>BWP ${subtotal?.toFixed(2) || '0.00'}</strong><br>
        ${discount && discount > 0 ? `Discount: <strong>-BWP ${discount.toFixed(2)}</strong><br>` : ''}
        VAT: <strong>BWP ${vat?.toFixed(2) || '0.00'}</strong><br>
        <h3>Grand Total: BWP ${total.toFixed(2)}</h3>
        Paid: BWP ${cashPaid.toFixed(2)}<br>
        Change: BWP ${change.toFixed(2)}<br><br>
        
        <p>
          <a href="${uploadResultWithQR.publicUrl}" 
             style="background:#1e3a8a; color:white; padding:14px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">
            📄 Download Full PDF Receipt
          </a>
        </p>
        
        <p>Thank you for your business!</p>
        <p><strong>${companyInfo?.nameOfBusiness || 'Your Business'}</strong></p>
      </div>
    `;

    const transporter = getEmailTransporter();

    const mailOptions = {
      from: {
        name: companyInfo?.nameOfBusiness || 'Your Business',
        address: process.env.SENDER_EMAIL
      },
      to: email,
      subject: `Receipt #${receiptsNumber} - ${companyInfo?.nameOfBusiness || 'Your Business'}`,
      html: emailBody,
      attachments: [{
        filename: filename,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${email} | Message ID: ${info.messageId}`);

    res.json({
      success: true,
      message: 'Receipt sent successfully via Email with PDF attachment',
      data: {
        messageId: info.messageId,
        downloadUrl: uploadResultWithQR.publicUrl,
        filename,
        emailAddress: email
      },
      sentBy: {
        userId: authenticatedUser.id,
        email: authenticatedUser.email || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in EmailUpload:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email receipt'
    });
  }
};
module.exports = { SMSUpload, generateQR,EmailUpload };