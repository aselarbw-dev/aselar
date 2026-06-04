// Install: npm install jspdf jsdom uuid
const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const admin = require('firebase-admin');
const QRCode = require('qrcode');

class PDFServiceJsPDF {
  async generatePDFFromHTML(htmlContent, quoteData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add content to PDF with proper formatting
      this.buildQuotationPDF(pdf, quoteData);
      
      return Buffer.from(pdf.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async generateQRCode(url, options = {}) {
    try {
      const qrOptions = {
        width: 256,  // Increased for better printability/scannability
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H',  // UPGRADED: 30% tolerance for blur/damage—key for phone cams
        type: 'image/png',  // Explicit PNG for sharper edges
        ...options
      };
  
      // Generate QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);
      console.log(`Generated QR for URL: ${url}`);  // DEBUG: Log the encoded URL
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  buildQuotationPDF(pdf, data) {
    let yPos = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Helper function to check if new page is needed
    const checkNewPage = (additionalHeight = lineHeight) => {
      if (yPos + additionalHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = 20;
      }
    };

    // Header - Quotation Title
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 123, 255); // Blue color
    pdf.text('QUOTATION', margin, yPos);
    yPos += 15;

    // Quote Number
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(102, 102, 102); // Gray color
    pdf.text(`Quote Number: ${data.quoteNumber || 'N/A'}`, margin, yPos);
    yPos += 15;

    // Reset text color to black
    pdf.setTextColor(0, 0, 0);

    // Company Information Section
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('FROM:', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    if (data.companyInfo) {
      pdf.text(data.companyInfo.name || '', margin, yPos);
      yPos += lineHeight;
      if (data.companyInfo.address) {
        pdf.text(data.companyInfo.address, margin, yPos);
        yPos += lineHeight;
      }
      if (data.companyInfo.phone) {
        pdf.text(`Phone: ${data.companyInfo.phone}`, margin, yPos);
        yPos += lineHeight;
      }
      if (data.companyInfo.email) {
        pdf.text(`Email: ${data.companyInfo.email}`, margin, yPos);
        yPos += lineHeight;
      }
    }
    yPos += 10;

    // Client Information Section
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('TO:', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    if (data.clientInfo) {
      pdf.text(data.clientInfo.companyName || data.clientInfo.addressedTo || '', margin, yPos);
      yPos += lineHeight;
      if (data.clientInfo.addressedTo && data.clientInfo.companyName) {
        pdf.text(`Attn: ${data.clientInfo.addressedTo}`, margin, yPos);
        yPos += lineHeight;
      }
      if (data.clientInfo.email) {
        pdf.text(`Email: ${data.clientInfo.email}`, margin, yPos);
        yPos += lineHeight;
      }
      if (data.clientInfo.phone) {
        pdf.text(`Phone: ${data.clientInfo.phone}`, margin, yPos);
        yPos += lineHeight;
      }
    }
    yPos += 10;

    // Date and validity
    checkNewPage(20);
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    pdf.text(`Date: ${currentDate}`, margin, yPos);
    yPos += lineHeight;
    pdf.text('Valid Until: 30 days from date of issue', margin, yPos);
    yPos += 15;

    // Items Table Header
    checkNewPage(60);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('QUOTED ITEMS', margin, yPos);
    yPos += 15;

    // Table headers
    const tableStart = yPos;
    const colWidths = [15, 60, 30, 25, 25, 35]; // Column widths in mm
    const colPositions = [margin];
    
    // Calculate column positions
    for (let i = 0; i < colWidths.length - 1; i++) {
      colPositions.push(colPositions[i] + colWidths[i]);
    }

    // Draw table header
    pdf.setFillColor(248, 249, 250);
    pdf.rect(margin, yPos - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    const headers = ['#', 'Item', 'Description', 'Qty', 'Unit Price', 'Amount'];
    headers.forEach((header, index) => {
      pdf.text(header, colPositions[index] + 2, yPos);
    });
    yPos += 15;

    // Table items
    pdf.setFont(undefined, 'normal');
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, index) => {
        checkNewPage(15);
        
        // Item row
        const values = [
          (index + 1).toString(),
          item.field1 || '',
          item.field2 || '',
          item.field3?.toString() || '',
          `BWP ${item.field4 || 0}`,
          `BWP ${(item.field3 * item.field4) || 0}`
        ];

        values.forEach((value, colIndex) => {
          // Wrap text if too long
          const maxWidth = colWidths[colIndex] - 4;
          const splitText = pdf.splitTextToSize(value, maxWidth);
          pdf.text(splitText, colPositions[colIndex] + 2, yPos);
        });
        
        yPos += 12;
        
        // Draw line separator
        pdf.setDrawColor(238, 238, 238);
        pdf.line(margin, yPos - 2, margin + colWidths.reduce((a, b) => a + b, 0), yPos - 2);
      });
    }

    yPos += 10;

    // Totals Section
    checkNewPage(50);
    const totalsX = margin + 120; // Position totals on the right
    
    pdf.setFont(undefined, 'normal');
    pdf.text('Sub-Total:', totalsX, yPos);
    pdf.text(`BWP ${data.subtotal || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
    
    pdf.text('VAT (14%):', totalsX, yPos);
    pdf.text(`BWP ${data.vat || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight + 3;
    
    // Final total with emphasis
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.text('Total:', totalsX, yPos);
    pdf.text(`BWP ${data.totalSum || '0.00'}`, totalsX + 40, yPos);
    yPos += 15;

    // Banking Details
    checkNewPage(60);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('BANKING DETAILS', margin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    if (data.bankingInfo) {
      pdf.text(`Account Name: ${data.bankingInfo.accountName || ''}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Bank Name: ${data.bankingInfo.bankName || ''}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Account Number: ${data.bankingInfo.accountNumber || ''}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`Branch Name: ${data.bankingInfo.branchName || ''}`, margin, yPos);
      yPos += lineHeight;
      pdf.text(`SWIFT Code: ${data.bankingInfo.swiftCode || ''}`, margin, yPos);
      yPos += lineHeight;
    }
    yPos += 10;

    // Terms and Notes
    checkNewPage(40);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('TERMS & NOTES', margin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const terms = [
      'This quote is valid for 30 days from the date of issue.',
      'Payment terms: 50% upfront, 50% upon completion.',
      'Delivery timeline will be finalized upon project kickoff.'
    ];

    terms.forEach(term => {
      checkNewPage();
      const splitTerm = pdf.splitTextToSize(term, 170);
      pdf.text(splitTerm, margin, yPos);
      yPos += lineHeight * splitTerm.length + 2;
    });

    // Footer
    yPos = pageHeight - 30;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(102, 102, 102);
    pdf.text('Thank you for your business!', margin, yPos);
    yPos += lineHeight;
    if (data.companyInfo && data.companyInfo.name) {
      pdf.text(`For any questions, please contact ${data.companyInfo.name}`, margin, yPos);
    }
  }
async uploadToFirebase(pdfBuffer, filename, metadata = {}) {
  try {
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    console.log('Uploading via REST API, buffer:', buffer.length, 'bytes');

    const token = uuidv4();
    const bucketName = bucket.name;
    const filePath = `quotations/${filename}`;
    const encodedPath = encodeURIComponent(filePath);

    // Get access token from admin credential
    const accessToken = await admin.app().options.credential.getAccessToken();

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodedPath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length
      },
      body: buffer
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GCS REST upload failed: ${response.status} - ${errText}`);
    }

    console.log('✅ REST upload successful');

    // Make public
    const aclUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodedPath}/acl`;
    await fetch(aclUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entity: 'allUsers', role: 'READER' })
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}?token=${token}`;

    return { publicUrl, filename, bucket: bucketName, path: filePath };

  } catch (error) {
    console.error('🔴 Upload error:', error);
    throw new Error(`Firebase upload failed: ${error.message}`);
  }
}

  // NEW METHOD: Generate QR code for existing upload result
  async generateQRForUpload(uploadResult) {
    try {
      const qrCodeBase64 = await this.generateQRCode(uploadResult.publicUrl);
      return {
        ...uploadResult,
        qrCodeBase64
      };
    } catch (error) {
      console.error('Error generating QR for upload:', error);
      // Return original result if QR generation fails
      return uploadResult;
    }
  }

  // Convenience method to generate filename
  generateFilename(quoteNumber) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `quote-${quoteNumber}-${timestamp}.pdf`;
  }
}

module.exports = {PDFServiceJsPDF};