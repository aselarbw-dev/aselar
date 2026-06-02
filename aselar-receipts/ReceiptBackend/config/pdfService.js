// Install: npm install jspdf jsdom uuid qrcode
const { bucket } = require("./firebase");
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const admin = require('firebase-admin');
const QRCode = require('qrcode');

class PDFServiceJsPDF {
  async generatePDFFromHTML(htmlContent, receiptsData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add content to PDF with proper formatting (adapted for receipts)
      this.buildReceiptPDF(pdf, receiptsData);
      
      return Buffer.from(pdf.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async generateQRCode(url, options = {}) {
    try {
      const qrOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M',
        ...options
      };

      // Generate QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

 buildReceiptPDF(pdf, receiptsData) {
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

  // Header - Receipt Title
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(0, 123, 255); // Blue color
  pdf.text('RECEIPT', margin, yPos);
  yPos += 15;

  // Receipt Number
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(102, 102, 102); // Gray color
  pdf.text(`Receipt Number: ${receiptsData.receiptsNumber || 'N/A'}`, margin, yPos);
  yPos += 15;

  // Reset text color to black
  pdf.setTextColor(0, 0, 0);

  // Company / Seller Information Section
  checkNewPage(60);
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(0, 123, 255);
  pdf.text('FROM:', margin, yPos);
  yPos += 10;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(0, 0, 0);

  // Priority: daily seller name first → business name fallback → 'Unknown Seller'
  const sellerName = receiptsData.sellerName || 
                     (receiptsData.companyInfo?.nameOfBusiness || 
                      receiptsData.companyInfo?.name || 'Unknown Seller');

  // Seller line (bold, prominent)
  pdf.setFont(undefined, 'bold');
  pdf.text(`Seller: ${sellerName}`, margin, yPos);
  yPos += lineHeight + 4;  // Extra spacing after seller

  // Business details (normal font, slight indent to distinguish)
  pdf.setFont(undefined, 'normal');
  if (receiptsData.companyInfo) {
    const businessName = receiptsData.companyInfo.nameOfBusiness || 
                         receiptsData.companyInfo.name || '';

    // Only show business name if it's different from seller
    if (businessName && businessName !== sellerName) {
      pdf.text(businessName, margin + 10, yPos);
      yPos += lineHeight;
    }

    if (receiptsData.companyInfo.place || receiptsData.companyInfo.address) {
      pdf.text(receiptsData.companyInfo.place || receiptsData.companyInfo.address, margin + 10, yPos);
      yPos += lineHeight;
    }

    if (receiptsData.companyInfo.businessPhone || receiptsData.companyInfo.phone) {
      pdf.text(`Phone: ${receiptsData.companyInfo.businessPhone || receiptsData.companyInfo.phone}`, margin + 10, yPos);
      yPos += lineHeight;
    }

    if (receiptsData.companyInfo.emailBusiness || receiptsData.companyInfo.email) {
      pdf.text(`Email: ${receiptsData.companyInfo.emailBusiness || receiptsData.companyInfo.email}`, margin + 10, yPos);
      yPos += lineHeight;
    }

    // Optional: business nature/description if you want to include it
    if (receiptsData.companyInfo.businessNature || receiptsData.companyInfo.businessDescription) {
      pdf.text(receiptsData.companyInfo.businessNature || receiptsData.companyInfo.businessDescription, margin + 10, yPos);
      yPos += lineHeight;
    }
  }
  yPos += 10;

  // Date (with fallback)
  checkNewPage(20);
  const pdfDate = receiptsData.createdAt || receiptsData.date || Date.now();
  const currentDate = new Date(pdfDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  pdf.text(`Date: ${currentDate}`, margin, yPos);
  yPos += lineHeight + 15;

  // Items Table Header
  checkNewPage(60);
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('RECEIPT ITEMS', margin, yPos);
  yPos += 15;

  // Table setup
  const tableStart = yPos;
  const colWidths = [10, 60, 15, 20, 25, 35]; // # | Item | Qty | Unit | Price | Total
  const colPositions = [margin];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colPositions.push(colPositions[i] + colWidths[i]);
  }

  // Table header background
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margin, yPos - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  const headers = ['#', 'Item', 'Qty', 'Unit', 'Price', 'Total'];
  headers.forEach((header, index) => {
    pdf.text(header, colPositions[index] + 2, yPos);
  });
  yPos += 15;

  // Table rows
  pdf.setFont(undefined, 'normal');
  if (receiptsData.inputs && receiptsData.inputs.length > 0) {
    receiptsData.inputs.forEach((input, index) => {
      checkNewPage(15);

      const itemTotal = (input.field1 || 0) * (input.field2 || 0);
      const values = [
        (index + 1).toString(),
        input.field3 || '',
        input.field1?.toString() || '0',
        input.field4 || '',
        `BWP ${input.field2 || 0}`,
        `BWP ${itemTotal.toFixed(2)}`
      ];

      values.forEach((value, colIndex) => {
        const maxWidth = colWidths[colIndex] - 4;
        const splitText = pdf.splitTextToSize(value, maxWidth);
        pdf.text(splitText, colPositions[colIndex] + 2, yPos);
      });

      yPos += 12;

      // Separator line
      pdf.setDrawColor(238, 238, 238);
      pdf.line(margin, yPos - 2, margin + colWidths.reduce((a, b) => a + b, 0), yPos - 2);
    });
  }

  yPos += 10;

  // Totals Section
  checkNewPage(80);
  const totalsX = margin + 80;

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  pdf.text('Sub-Total:', totalsX, yPos);
  pdf.text(`BWP ${receiptsData.subtotal || '0.00'}`, totalsX + 40, yPos);
  yPos += lineHeight;

  if (receiptsData.discountValue && receiptsData.discountValue > 0) {
    const discountLabel = receiptsData.discountName 
      ? `${receiptsData.discountName} (${receiptsData.discountType || ''})` 
      : 'Discount';
    pdf.text(`${discountLabel}:`, totalsX, yPos);
    pdf.text(`BWP -${receiptsData.discountValue || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
  }

  pdf.text('VAT:', totalsX, yPos);
  pdf.text(`BWP ${receiptsData.vatAmount || '0.00'}`, totalsX + 40, yPos);
  yPos += lineHeight + 3;

  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(12);
  pdf.text('Grand Total:', totalsX, yPos);
  pdf.text(`BWP ${receiptsData.grandTotal || '0.00'}`, totalsX + 40, yPos);
  yPos += lineHeight;

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  pdf.text('Cash:', totalsX, yPos);
  pdf.text(`BWP ${receiptsData.cash || '0.00'}`, totalsX + 40, yPos);
  yPos += lineHeight;

  pdf.setFont(undefined, 'bold');
  pdf.text('Change:', totalsX, yPos);
  pdf.text(`BWP ${receiptsData.change || '0.00'}`, totalsX + 40, yPos);
  yPos += 15;

  // Footer
  checkNewPage(40);
  yPos = pageHeight - 40;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'italic');
  pdf.setTextColor(102, 102, 102);
  pdf.text('Thank you for your business!', margin, yPos);
  yPos += lineHeight;

  const contactName = sellerName !== 'Unknown Seller' ? sellerName : 
                      (receiptsData.companyInfo?.nameOfBusiness || 'the business');
  pdf.text(`For any questions, please contact ${contactName}`, margin, yPos);
}

async uploadToFirebase(pdfBuffer, filename, metadata = {}) {
  try {
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    console.log('Uploading via REST API, buffer:', buffer.length, 'bytes');

    const token = uuidv4();
    const bucketName = bucket.name;
    const filePath = `new-receipts/${filename}`;
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

  // Convenience method to generate filename (adapted for receipts)
  generateFilename(receiptsNumber) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `receipt-${receiptsNumber}-${timestamp}.pdf`;
  }
}

module.exports = { PDFServiceJsPDF };