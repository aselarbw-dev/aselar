// services/debtPDFService.js (New separate service, mirroring PDFServiceJsPDF but debt-specific)
const { bucket } = require("../config/firebase"); // Adjust path to your Firebase config
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

class DebtPDFService {
  async generateDebtNotePDF(debtNoteData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      this.buildDebtNotePDF(pdf, debtNoteData);
      return Buffer.from(pdf.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating debt note PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
async uploadDebtNoteToFirebase(pdfBuffer, filename, metadata = {}) {
  console.log('Firebase deps check:', require('firebase-admin')); // Should log object
  console.log('Bucket:', bucket); // Should log bucket object
  if (!bucket) throw new Error('Bucket undefined - check firebase config export');
  // ... rest
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
      const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  buildDebtNotePDF(pdf, debtNoteData) {
    let yPos = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    const checkNewPage = (additionalHeight = lineHeight) => {
      if (yPos + additionalHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = 20;
      }
    };

    // Header - Debt Note Title (red for urgency)
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(220, 53, 69); // Red
    pdf.text('DEBT COLLECTION NOTE', margin, yPos);
    yPos += 15;

    // Ref No
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(102, 102, 102);
    pdf.text(`Ref No: ${debtNoteData.debtNoteNumber || 'N/A'}`, margin, yPos);
    yPos += 15;

    // Reset to black
    pdf.setTextColor(0, 0, 0);

    // Company Info (adapt from receipt pattern)
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('FROM:', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    if (debtNoteData.companyInfo) {
      pdf.text(debtNoteData.companyInfo.nameOfBusiness || '', margin, yPos);
      yPos += lineHeight;
      if (debtNoteData.companyInfo.place) pdf.text(debtNoteData.companyInfo.place, margin, yPos), yPos += lineHeight;
      if (debtNoteData.companyInfo.businessNature) pdf.text(debtNoteData.companyInfo.businessNature, margin, yPos), yPos += lineHeight;
      if (debtNoteData.companyInfo.businessPhone) pdf.text(`Phone: ${debtNoteData.companyInfo.businessPhone}`, margin, yPos), yPos += lineHeight;
      if (debtNoteData.companyInfo.emailBusiness) pdf.text(`Email: ${debtNoteData.companyInfo.emailBusiness}`, margin, yPos), yPos += lineHeight;
    }
    yPos += 10;

    // Date
    checkNewPage(20);
    const currentDate = new Date(debtNoteData.date || debtNoteData.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    pdf.text(`Date: ${currentDate}`, margin, yPos);
    yPos += lineHeight + 15;

    // Debtor Details (table per screenshot)
    checkNewPage(60);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('DEBTOR DETAILS', margin, yPos);
    yPos += 15;

    const colWidths = [50, 120]; // Label | Value
    const colPositions = [margin, margin + 50];
    
    pdf.setFillColor(248, 249, 250);
    pdf.rect(margin, yPos - 5, 170, 10, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text('Field', colPositions[0] + 2, yPos);
    pdf.text('Value', colPositions[1] + 2, yPos);
    yPos += 15;

    pdf.setFont(undefined, 'normal');
    const details = [
      ['Debtor Full Name', debtNoteData.fullName || ''],
      ['Location', debtNoteData.location || ''],
      ['Amount Owed (BWP)', `BWP ${debtNoteData.amount?.toFixed(2) || '0.00'}`],
      ['Issuer Name', debtNoteData.issuersName || '']
    ];

    details.forEach(([label, value]) => {
      checkNewPage(15);
      pdf.text(label, colPositions[0] + 2, yPos);
      const splitValue = pdf.splitTextToSize(value, 110);
      pdf.text(splitValue, colPositions[1] + 2, yPos);
      yPos += 12;
      pdf.setDrawColor(238, 238, 238);
      pdf.line(margin, yPos - 2, margin + 170, yPos - 2);
    });

    yPos += 10;

    // Message Section
    checkNewPage(80);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Message to Client:', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    const messageLines = pdf.splitTextToSize(debtNoteData.message || 'No message provided.', 170);
    pdf.text(messageLines, margin, yPos);
    yPos += (messageLines.length * lineHeight) + 10;

    // Footer (per screenshot)
    checkNewPage(30);
    yPos = pageHeight - 30;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(102, 102, 102);
    pdf.text('Thank you for your prompt payment!', margin, yPos);
    yPos += lineHeight;
    pdf.text('Powered by Aselar, a TeX product.', margin, yPos);
    pdf.text(`Issuer: ${debtNoteData.issuersName || ''}`, margin, yPos);
  }

  // Filename for debt notes
  generateDebtNoteFilename(debtNoteNumber) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `debt-note-${debtNoteNumber}-${timestamp}.pdf`;
  }

  // Upload to Firebase (debt-notes/ path)
  async uploadDebtNoteToFirebase(pdfBuffer, filename, metadata = {}) {
    try {
      const file = bucket.file(`debt-notes/${filename}`);
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

      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/debt-notes/${filename}?token=${token}`;

      return {
        publicUrl,
        filename,
        bucket: bucket.name,
        path: `debt-notes/${filename}`
      };
    } catch (error) {
      console.error('Error uploading debt note to Firebase:', error);
      throw new Error(`Firebase upload failed: ${error.message}`);
    }
  }

  // Generate QR for upload result (reuse from receipt)
  async generateQRForUpload(uploadResult) {
    try {
      const qrCodeBase64 = await this.generateQRCode(uploadResult.publicUrl);
      return {
        ...uploadResult,
        qrCodeBase64
      };
    } catch (error) {
      console.error('Error generating QR for upload:', error);
      return uploadResult;
    }
  }
}

module.exports = { DebtPDFService };