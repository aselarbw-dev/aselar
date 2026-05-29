// Install: npm install jspdf jsdom uuid qrcode
const { bucket } = require("./firebase");
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');

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

    // Company Information Section (from API, optional)
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('FROM:', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    if (receiptsData.companyInfo) {
      pdf.text(receiptsData.companyInfo.name || '', margin, yPos);
      yPos += lineHeight;
      if (receiptsData.companyInfo.address) {
        pdf.text(receiptsData.companyInfo.address, margin, yPos);
        yPos += lineHeight;
      }
      if (receiptsData.companyInfo.phone) {  // ← Fixed: 'data' → 'receiptsData'
        pdf.text(`Phone: ${receiptsData.companyInfo.phone}`, margin, yPos);
        yPos += lineHeight;
      }
      if (receiptsData.companyInfo.email) {  // ← Fixed: 'data' → 'receiptsData'
        pdf.text(`Email: ${receiptsData.companyInfo.email}`, margin, yPos);
        yPos += lineHeight;
      }
    }
    yPos += 10;

    // Date
    checkNewPage(20);
    const currentDate = new Date(receiptsData.createdAt || Date.now()).toLocaleDateString('en-GB', {
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

    // Table headers (adapted for receipt schema: #, Item, Qty, Price, Total)
    const tableStart = yPos;
    const colWidths = [10, 70, 20, 25, 35]; // Adjusted widths for 5 columns
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
    const headers = ['#', 'Item', 'Qty', 'Price', 'Total'];
    headers.forEach((header, index) => {
      pdf.text(header, colPositions[index] + 2, yPos);
    });
    yPos += 15;

    // Table items (using receipt items schema)
    pdf.setFont(undefined, 'normal');
    if (receiptsData.items && receiptsData.items.length > 0) {
      receiptsData.items.forEach((item, index) => {
        checkNewPage(15);
        
        // Item row (mapped to receipt fields)
        const values = [
          (index + 1).toString(),
          item.name || '',
          item.quantity?.toString() || '0',
          `BWP ${item.price || 0}`,
          `BWP ${item.totalPrice || 0}`
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

    // Totals Section (adapted for receipt: add discount, cashPaid, change)
    checkNewPage(80); // Extra space for more lines
    const totalsX = margin + 80; // Position totals on the right (adjusted for narrower table)
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    pdf.text('Sub-Total:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.subtotal || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
    
    pdf.text('Discount:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.discount || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
    
    pdf.text('VAT:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.vat || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight + 3;
    
    // Final total with emphasis
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.text('Total:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.total || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    pdf.text('Cash Paid:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.cashPaid || '0.00'}`, totalsX + 40, yPos);
    yPos += lineHeight;
    
    pdf.setFont(undefined, 'bold');
    pdf.text('Change:', totalsX, yPos);
    pdf.text(`BWP ${receiptsData.change || '0.00'}`, totalsX + 40, yPos);
    yPos += 15;

    // Status (if not completed)
    if (receiptsData.status && receiptsData.status !== 'completed') {
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(255, 0, 0); // Red for non-completed
      pdf.text(`Status: ${receiptsData.status.toUpperCase()}`, totalsX, yPos);
      pdf.setTextColor(0, 0, 0); // Reset
    }

    // Footer
    checkNewPage(30);
    yPos = pageHeight - 30;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(102, 102, 102);
    pdf.text('Thank you for your business!', margin, yPos);
    yPos += lineHeight;
    if (receiptsData.companyInfo && receiptsData.companyInfo.name) {
      pdf.text(`For any questions, please contact ${receiptsData.companyInfo.name}`, margin, yPos);
    }
  }

async uploadToFirebase(pdfBuffer, filename, metadata = {}) {
  try {
    const buffer = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer);

    // 🔍 Debug logs
    console.log('Buffer type:', typeof buffer);
    console.log('Is Buffer:', Buffer.isBuffer(buffer));
    console.log('Buffer length:', buffer.length);
    console.log('Bucket name:', bucket.name);
    console.log('Filename:', filename);

    const file = bucket.file(`receipts/${filename}`);
    const token = uuidv4();

    await new Promise((resolve, reject) => {
      const stream = file.createWriteStream({
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

      stream.on('error', (err) => {
        console.error('🔴 Stream error:', err); // ← full error object
        reject(err);
      });
      stream.on('finish', () => {
        console.log('✅ Stream finished successfully');
        resolve();
      });
      stream.end(buffer);
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/receipts/${filename}?token=${token}`;

    return { publicUrl, filename, bucket: bucket.name, path: `receipts/${filename}` };

  } catch (error) {
    console.error('🔴 Full Firebase error:', error); // ← full stack
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
    return `receipt-${receiptsNumber}-${timestamp}.pdf`; // Changed from 'quote-'
  }
}

module.exports = { PDFServiceJsPDF };