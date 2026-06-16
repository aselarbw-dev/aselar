const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { Resend } = require('resend');
const twilio = require('twilio');
const { PDFServiceJsPDF } = require('./pdfService');
const SibApiV3Sdk = require('sib-api-v3-sdk');
// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize PDF service
const pdfService = new PDFServiceJsPDF();

// SMS receipt endpoint (adapted for new schema: uses inputs array, vatAmount, grandTotal, cash, etc.)
const SMSUpload = async (req, res) => {
  try {
    const {
      phoneNumber,
      receiptsNumber,
      inputs = [],  // ← Changed from 'items' to 'inputs'
      vatAmount,    // ← Changed from 'vat'
      cash,         // ← Changed from 'cashPaid'
      grandTotal,   // ← Changed from 'total'
      change,
      htmlContent,
      discountValue,  // ← Changed; use discountName/discountType for optional details
      discountName,
      discountType,
      subtotal,     // ← Already present
      date,         // ← Changed from 'createdAt'
      companyInfo   // ← Already present
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

    if (!Array.isArray(inputs)) {  // ← Validate 'inputs' instead of 'items'
      return res.status(400).json({
        success: false,
        error: 'Inputs must be an array'
      });
    }

    const receiptsData = {
      receiptsNumber,
      inputs,  // ← Use 'inputs' for PDF
      vatAmount,  // ← Map to vatAmount
      grandTotal,  // ← Map to grandTotal
      subtotal,
      cash,  // ← Map to cash
      discountValue,  // ← Map discount
      discountName,
      discountType,
      htmlContent,
      date,  // ← Use for PDF date
      companyInfo,  // ← For header
      change,
      companyInfo: {  // ← Keep formatting
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
    };

    console.log('Generating PDF for receipt:', phoneNumber);
    console.log('Incoming req.body.inputs:', JSON.stringify(inputs, null, 2));
    console.log('Inputs type:', typeof inputs, 'Is array?', Array.isArray(inputs), 'Length:', inputs?.length || 0);

    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsNumber);

    console.log('Uploading PDF to Firebase...');
    
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      receiptsNumber,
      customerPhone: phoneNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: grandTotal  // ← Use grandTotal
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    console.log('PDF uploaded:', uploadResultWithQR.publicUrl);

    // Helper to format inputs for SMS (adapted from items: uses field3=name, field1=qty, field4=unit, field2=price)
    const formatInputsForSMS = (inputs) => {
      if (!Array.isArray(inputs) || inputs.length === 0) return 'No items';
      
      return inputs.slice(0, 5).map(input => {  // Limit to first 5 to avoid overflow
        let inputStr = `${(input.field3 || '').slice(0, 15)}${(input.field3 || '').length > 15 ? '...' : ''}`.trim() + ` x${input.field1 || 0}`;  // Name + qty
        if (input.field4) inputStr += ` ${input.field4}`;  // Add unit if present
        if (input.field2 > 0) inputStr += ` @BWP${(input.field2 || 0).toFixed(2)}`;  // Add price
        return `  • ${inputStr}`;
      }).join('\n') + (inputs.length > 5 ? '\n  • ... + more' : '');
    };

    // SMS template: Adapted for new schema (grandTotal, cash, change; optional discount mention)
    const inputsFormatted = formatInputsForSMS(inputs);
    let smsMessage = `Hello! Receipt #${receiptsNumber} ready.

 Items:
${inputsFormatted}

 Sub-total: BWP ${subtotal.toFixed(2)}
${discountValue > 0 ? `Discount: -BWP ${discountValue.toFixed(2)} (${discountName || 'General'})` : ''}
 VAT: BWP ${vatAmount.toFixed(2)}
 Grand Total: BWP ${grandTotal.toFixed(2)}
 Paid: BWP ${cash.toFixed(2)}
 Change: BWP ${change.toFixed(2)}

 Download: ${uploadResultWithQR.publicUrl}

 Thanks!`.trim();

    // Truncate if too long (Twilio handles multi-part, but keep concise)
    if (smsMessage.length > 1600) {  // Rough limit for readability
      smsMessage = smsMessage.substring(0, 1600) + '\n... (shortened)';
    }

    console.log('SMS body preview:', smsMessage);
    console.log('SMS char count:', smsMessage.length);

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

// QR code generation endpoint for receipts (adapted similarly for new schema)
const generateQR = async (req, res) => {
  try {
    const {
      receiptsNumber,
      inputs,  // ← Changed from 'items'
      vatAmount,  // ← Changed
      grandTotal,  // ← Changed
      subtotal,
      cash,  // ← Changed
      discountValue,  // ← Changed
      discountName,
      discountType,
      htmlContent,
      date,  // ← Changed
      companyInfo,
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

    if (!Array.isArray(inputs)) {  // ← Validate 'inputs'
      return res.status(400).json({
        success: false,
        error: 'Inputs must be an array'
      });
    }

    console.log('Incoming req.body.inputs for QR:', JSON.stringify(inputs, null, 2));
    console.log('Inputs type:', typeof inputs, 'Is array?', Array.isArray(inputs), 'Length:', inputs?.length || 0);

    const receiptsData = {
      receiptsNumber,
      inputs,  // ← Use 'inputs'
      vatAmount,
      grandTotal,
      subtotal,
      cash,
      discountValue,
      discountName,
      discountType,
      htmlContent,
      date,
      companyInfo,
      change,
      companyInfo: {  // ← Keep formatting
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
      totalAmount: grandTotal  // ← Use grandTotal
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


// WhatsApp receipt endpoint - SANDBOX READY (for tomorrow's presentation)
const WhatsAppUpload = async (req, res) => {
  try {
    const {
      whatsappNumber,
      receiptsNumber,
      inputs = [],
      vatAmount,
      cash,
      grandTotal,
      change,
      discountValue = 0,
      discountName,
      discountType,
      subtotal,
      date,
      companyInfo,
      htmlContent
    } = req.body;

    const authenticatedUser = req.user;

    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!whatsappNumber || !receiptsNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: whatsappNumber or receiptsNumber.'
      });
    }

    if (!Array.isArray(inputs)) {
      return res.status(400).json({ success: false, error: 'Inputs must be an array' });
    }

    // Prepare data for PDF generation (same as SMS)
    const receiptsData = {
      receiptsNumber,
      inputs,
      vatAmount,
      grandTotal,
      subtotal,
      cash,
      discountValue,
      discountName,
      discountType,
      htmlContent,
      date,
      companyInfo,
      change,
      companyInfo: {
        name: companyInfo?.nameOfBusiness || '',
        address: `${companyInfo?.place || ''}\n${companyInfo?.businessNature || ''}`,
        phone: companyInfo?.businessPhone || '',
        email: companyInfo?.emailBusiness || ''
      },
    };

    // Generate PDF and upload to Firebase
    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsNumber);

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      receiptsNumber,
      customerPhone: whatsappNumber,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: grandTotal
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    // Format items nicely for WhatsApp message
    const formatInputsForSMS = (inputs) => {
      if (!Array.isArray(inputs) || inputs.length === 0) return 'No items';
      return inputs.slice(0, 5).map(input => {
        let inputStr = `${(input.field3 || '').slice(0, 15)}${(input.field3 || '').length > 15 ? '...' : ''}`.trim() 
                     + ` x${input.field1 || 0}`;
        if (input.field4 && input.field4 !== 'na') inputStr += ` ${input.field4}`;
        if (input.field2 > 0) inputStr += ` @BWP${(input.field2 || 0).toFixed(2)}`;
        return `  • ${inputStr}`;
      }).join('\n') + (inputs.length > 5 ? '\n  • ... + more' : '');
    };

    const inputsFormatted = formatInputsForSMS(inputs);

    const messageBody = `Hello! Receipt #${receiptsNumber} is ready.\n\n` +
      `Items:\n${inputsFormatted}\n\n` +
      `Sub-total: BWP ${subtotal.toFixed(2)}\n` +
      `${discountValue > 0 ? `Discount: -BWP ${discountValue.toFixed(2)}\n` : ''}` +
      `VAT: BWP ${vatAmount.toFixed(2)}\n` +
      `Grand Total: BWP ${grandTotal.toFixed(2)}\n` +
      `Paid: BWP ${cash.toFixed(2)}\n` +
      `Change: BWP ${change.toFixed(2)}\n\n` +
      `Thank you for your business!`;

    // === SANDBOX CONFIGURATION ===
    const whatsappResult = await twilioClient.messages.create({
      body: messageBody,
      from: 'whatsapp:+14155238886',           // Twilio WhatsApp Sandbox
      to: `whatsapp:${whatsappNumber}`,        // Must have whatsapp: prefix
      mediaUrl: [uploadResultWithQR.publicUrl] // This sends the actual PDF file
    });

    console.log('✅ WhatsApp Sandbox message sent with PDF:', whatsappResult.sid);

    res.json({
      success: true,
      message: 'Receipt sent successfully via WhatsApp Sandbox',
      data: {
        whatsappId: whatsappResult.sid,
        downloadUrl: uploadResultWithQR.publicUrl,
        filename,
        whatsappNumber
      }
    });

  } catch (error) {
    console.error('WhatsApp Sandbox Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send WhatsApp receipt'
    });
  }
};
// Initialize Gmail transporter
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
// ====================== FULL EMAIL UPLOAD FUNCTION (Gmail) ======================
const EmailUpload = async (req, res) => {
  try {
    const {
      email,                    // Customer's email
      receiptsNumber,
      inputs = [],
      vatAmount,
      cash,
      grandTotal,
      change,
      discountValue = 0,
      discountName,
      discountType,
      subtotal,
      date,
      companyInfo,
      htmlContent
    } = req.body;

    const authenticatedUser = req.user;

    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!email || !receiptsNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email or receiptsNumber.'
      });
    }

    if (!Array.isArray(inputs)) {
      return res.status(400).json({ success: false, error: 'Inputs must be an array' });
    }

    // Prepare receipts data for PDF
    const receiptsData = {
      receiptsNumber,
      inputs,
      vatAmount,
      grandTotal,
      subtotal,
      cash,
      discountValue,
      discountName,
      discountType,
      htmlContent,
      date,
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

    console.log('Uploading PDF to Firebase...');

    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      receiptsNumber,
      customerEmail: email,
      createdBy: authenticatedUser.id,
      createdByEmail: authenticatedUser.email || null,
      createdAt: new Date().toISOString(),
      totalAmount: grandTotal
    });

    const uploadResultWithQR = await pdfService.generateQRForUpload(uploadResult);

    // Format items
    const formatInputsForEmail = (inputs) => {
      if (!Array.isArray(inputs) || inputs.length === 0) return 'No items';
      return inputs.slice(0, 8).map(input => {
        let inputStr = `${(input.field3 || '').slice(0, 25)}${(input.field3 || '').length > 25 ? '...' : ''}`.trim();
        inputStr += ` x${input.field1 || 0}`;
        if (input.field4 && input.field4 !== 'na') inputStr += ` ${input.field4}`;
        if (input.field2 > 0) inputStr += ` @BWP${(input.field2 || 0).toFixed(2)}`;
        return `• ${inputStr}`;
      }).join('\n') + (inputs.length > 8 ? '\n• ... + more items' : '');
    };

    const inputsFormatted = formatInputsForEmail(inputs);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e3a8a;">Receipt #${receiptsNumber}</h2>
        <p>Hello,</p>
        <p>Thank you for your purchase. Here is your receipt:</p>
        
        <strong>Items:</strong><br>
        <pre style="background:#f8f9fa; padding:12px; border-radius:6px;">${inputsFormatted}</pre><br>
        
        Sub-total: <strong>BWP ${subtotal.toFixed(2)}</strong><br>
        ${discountValue > 0 ? `Discount: <strong>-BWP ${discountValue.toFixed(2)}</strong> (${discountName || 'General'})<br>` : ''}
        VAT: <strong>BWP ${vatAmount.toFixed(2)}</strong><br>
        <h3>Grand Total: BWP ${grandTotal.toFixed(2)}</h3>
        Paid: BWP ${cash.toFixed(2)}<br>
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

    // Send Email
   await sendEmail({
     to: email,                    // ← customer's email (required)
  cc: companyInfo?.emailBusiness || null,   // ← add this line                  // ← customer's email (required)
      html: emailBody,  
      attachments: [{
    filename: filename,
    content: pdfBuffer,
    contentType: 'application/pdf'
  }]
   })

    console.log(`✅ Email sent to ${email} `);

    res.json({
      success: true,
      message: 'Receipt sent successfully via Email',
      data: {
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
    console.error('EmailUpload Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email receipt'
    });
  }
};

module.exports = { SMSUpload, generateQR, WhatsAppUpload,EmailUpload };