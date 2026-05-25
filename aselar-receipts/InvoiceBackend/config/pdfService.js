// Install: npm install jspdf jsdom uuid
const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');

const QRCode = require('qrcode');

class PDFServiceJsPDF {
  async generatePDFFromHTML(htmlContent, invoiceData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add content to PDF with proper formatting
      this.buildInvoicePDF(pdf, invoiceData);
      
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

  buildInvoicePDF(pdf, data) {
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

    // Header - Invoice Title
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 123, 255); // Blue color
    pdf.text('INVOICE', margin, yPos);
    yPos += 15;

    // Invoice Number
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(102, 102, 102); // Gray color
    pdf.text(`Invoice Number: ${data.invoiceNumber || 'N/A'}`, margin, yPos);
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

    // Date
    checkNewPage(20);
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    pdf.text(`Date: ${currentDate}`, margin, yPos);
    yPos += 15;

    // Items Table Header
    checkNewPage(60);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('INVOICED ITEMS', margin, yPos);
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
    if (data.fields && data.fields.length > 0) {
      data.fields.forEach((item, index) => {
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
    pdf.text(`BWP ${data.addition || '0.00'}`, totalsX + 40, yPos);
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

    // Addition (if provided)
    if (data.addition) {
      checkNewPage(20);
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'italic');
      pdf.text('Addition:', margin, yPos);
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const splitAddition = pdf.splitTextToSize(data.addition, 170);
      pdf.text(splitAddition, margin, yPos);
      yPos += lineHeight * splitAddition.length + 5;
    }

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
      'Payment is due within 30 days from the date of invoice.',
      'Late payments may incur interest charges.',
      'Please remit payment to the banking details provided above.'
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
      const file = bucket.file(`invoices/${filename}`);
      const token = uuidv4();

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            firebaseStorageDownloadTokens: token,
            createdAt: new Date().toISOString(),
            ...metadata
          }
        },
        resumable: false
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Generate public URL with token
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/invoices/${filename}?token=${token}`;

      return {
        publicUrl,
        filename,
        bucket: bucket.name,
        path: `invoices/${filename}`
      };
    } catch (error) {
      console.error('Error uploading to Firebase:', error);
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
  generateFilename(invoiceNumber) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `invoice-${invoiceNumber}-${timestamp}.pdf`;
  }
}

module.exports = {PDFServiceJsPDF};