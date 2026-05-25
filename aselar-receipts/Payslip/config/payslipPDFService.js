// services/payslipPDFService.js (Separate service, mirroring DebtPDFService for payslips)
const { bucket } = require("../config/firebase"); // Adjust path to your Firebase export (e.g., ../../Shared/config/firebase)
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

class PayslipPDFService {
  async generatePayslipPDF(payslipData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      this.buildPayslipPDF(pdf, payslipData);
      return Buffer.from(pdf.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating payslip PDF:', error);
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
      const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  buildPayslipPDF(pdf, payslipData) {
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

    // Header - Company Info (per screenshot)
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 123, 255); // Blue for professional
    pdf.text(payslipData.companyInfo?.nameOfBusiness || 'TeX Industries', margin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);
    if (payslipData.companyInfo) {
      if (payslipData.companyInfo.place) pdf.text(payslipData.companyInfo.place, margin, yPos), yPos += lineHeight;
      if (payslipData.companyInfo.businessPhone) pdf.text(`Phone: ${payslipData.companyInfo.businessPhone}`, margin, yPos), yPos += lineHeight;
    }
    yPos += 10;

    // Title & Payment Date
    checkNewPage(20);
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text('PAYSLIP', margin, yPos);
    yPos += 15;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    const paymentDate = new Date(payslipData.createdAt || Date.now()).toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    pdf.text(`Payment Date: ${paymentDate}`, margin, yPos);
    yPos += lineHeight + 10;

    // Employee Details
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Employee Details', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    const employeeDetails = [
      ['Employee Name', payslipData.employeeName || ''],
      ['Employee ID', payslipData.employeeId || '']
    ];

    employeeDetails.forEach(([label, value]) => {
      pdf.text(`${label}:`, margin, yPos);
      pdf.text(value, margin + 60, yPos);
      yPos += lineHeight;
    });
    yPos += 5;

    // Salary Details (Basic + VAT)
    checkNewPage(40);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Salary Details', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text('Basic Salary:', margin, yPos);
    pdf.text(`BWP ${payslipData.basicSalary?.toFixed(2) || '0.00'}`, margin + 60, yPos);
    yPos += lineHeight;

    pdf.text('VAT (14%):', margin, yPos);
    pdf.text(`BWP ${payslipData.vat?.toFixed(2) || '0.00'}`, margin + 60, yPos);
    yPos += lineHeight + 10;

    // Deductions & Additions Tables (arrays)
    checkNewPage(60);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Deductions', margin, yPos);
    yPos += 10;

    if (payslipData.deductions && payslipData.deductions.length > 0) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, yPos - 5, 80, 10, 'F');
      pdf.text('Label', margin + 2, yPos);
      pdf.text('Amount', margin + 40, yPos);
      yPos += 15;

      payslipData.deductions.forEach(ded => {
        checkNewPage(15);
        pdf.text(ded.label || '', margin + 2, yPos);
        pdf.text(`BWP ${ded.amount?.toFixed(2) || '0.00'}`, margin + 40, yPos);
        yPos += 12;
      });
    } else {
      pdf.text('No deductions', margin, yPos);
      yPos += lineHeight;
    }

    yPos += 10;

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Additions', margin, yPos);
    yPos += 10;

    if (payslipData.additions && payslipData.additions.length > 0) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, yPos - 5, 80, 10, 'F');
      pdf.text('Label', margin + 2, yPos);
      pdf.text('Amount', margin + 40, yPos);
      yPos += 15;

      payslipData.additions.forEach(add => {
        checkNewPage(15);
        pdf.text(add.label || '', margin + 2, yPos);
        pdf.text(`BWP ${add.amount?.toFixed(2) || '0.00'}`, margin + 40, yPos);
        yPos += 12;
      });
    } else {
      pdf.text('No additions', margin, yPos);
      yPos += lineHeight;
    }

    yPos += 10;

    // Net Salary
    checkNewPage(20);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Net Salary:', margin, yPos);
    pdf.setFontSize(16);
    pdf.text(`BWP ${payslipData.balance?.toFixed(2) || '0.00'}`, margin + 60, yPos);
    yPos += lineHeight + 10;

    // Footer (per screenshot)
    checkNewPage(30);
    yPos = pageHeight - 30;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(102, 102, 102);
    pdf.text('This is a computer-generated document. No signature is required.', margin, yPos);
    yPos += lineHeight;
    pdf.text('Powered by Aselar, a TeX product.', margin, yPos);
  }

  // Filename for payslips
  generatePayslipFilename(payslipNumber) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `payslip-${payslipNumber}-${timestamp}.pdf`;
  }

  // Upload to Firebase (payslips/ path)
  async uploadPayslipToFirebase(pdfBuffer, filename, metadata = {}) {
    try {
      const file = bucket.file(`payslips/${filename}`);
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
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/payslips/${filename}?token=${token}`;

      return {
        publicUrl,
        filename,
        bucket: bucket.name,
        path: `payslips/${filename}`
      };
    } catch (error) {
      console.error('Error uploading payslip to Firebase:', error);
      throw new Error(`Firebase upload failed: ${error.message}`);
    }
  }

  // Generate QR for upload result (reuse from debt/receipt)
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

module.exports = { PayslipPDFService };