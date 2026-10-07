// Install: npm install jspdf jsdom uuid qrcode
const { bucket } = require("./firebase");
const { v4: uuidv4 } = require('uuid');
const { jsPDF } = require('jspdf');
const admin = require('firebase-admin');
const QRCode = require('qrcode');

// Receipt colour palette (navy matches the email template)
const COLORS = {
  navy: [30, 58, 138],
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  line: [229, 231, 235],
  band: [243, 246, 252],
  white: [255, 255, 255],
  softWhite: [203, 213, 240],
  green: [21, 128, 61],
  red: [220, 38, 38]
};

const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const LOGO_TIMEOUT_MS = 5000;

class PDFServiceJsPDF {
  async generatePDFFromHTML(htmlContent, receiptsData = {}) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Logo is optional: if it cannot be loaded the receipt still generates
      const logo = await this.loadLogo(receiptsData.companyInfo?.profilePicture);

      this.buildReceiptPDF(pdf, receiptsData, logo);

      return Buffer.from(pdf.output('arraybuffer'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  // Loads the business logo (https URL or base64 data URL). PNG and JPEG only.
  // Never throws: returns null if anything goes wrong.
  async loadLogo(source) {
    if (!source || typeof source !== 'string') return null;

    try {
      let buffer;

      if (source.startsWith('data:image/')) {
        const base64 = source.split(',')[1];
        if (!base64) return null;
        buffer = Buffer.from(base64, 'base64');
      } else if (/^https:\/\//i.test(source)) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), LOGO_TIMEOUT_MS);
        let response;
        try {
          response = await fetch(source, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
        if (!response.ok) {
          console.warn('Logo fetch failed with status', response.status);
          return null;
        }
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        return null;
      }

      if (!buffer.length || buffer.length > LOGO_MAX_BYTES) {
        console.warn('Logo skipped: empty or larger than 2 MB');
        return null;
      }

      // Detect the real format from the file header (jsPDF supports PNG and JPEG only)
      let format = null;
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        format = 'PNG';
      } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        format = 'JPEG';
      }

      if (!format) {
        console.warn('Logo skipped: unsupported image format (use PNG or JPEG)');
        return null;
      }

      const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
      return { dataUrl: `data:${mime};base64,${buffer.toString('base64')}`, format };
    } catch (error) {
      console.warn('Logo load skipped:', error.message);
      return null;
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

  buildReceiptPDF(pdf, receiptsData, logo = null) {
    const C = COLORS;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    const bottomLimit = pageH - 28; // keeps content clear of the footer

    pdf.setLineHeightFactor(1.4);

    // ---------- small helpers ----------
    const fill = (c) => pdf.setFillColor(c[0], c[1], c[2]);
    const stroke = (c) => pdf.setDrawColor(c[0], c[1], c[2]);
    const color = (c) => pdf.setTextColor(c[0], c[1], c[2]);
    const font = (style = 'normal', size = 10) => {
      pdf.setFont('helvetica', style);
      pdf.setFontSize(size);
    };
    const money = (v) =>
      `BWP ${(Number(v) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

    // ---------- data ----------
    const company = receiptsData.companyInfo || {};
    const businessName = company.name || company.nameOfBusiness || '';
    const sellerName = receiptsData.sellerName || businessName || 'Unknown Seller';
    const items = Array.isArray(receiptsData.items) ? receiptsData.items : [];

    const dateStr = new Date(receiptsData.createdAt || Date.now()).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ---------- HEADER BAND ----------
    const contactLines = [];
    if (company.phone) contactLines.push(`Tel: ${company.phone}`);
    if (company.email) contactLines.push(company.email);
    String(company.address || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => contactLines.push(l));

    font('normal', 8.5);
    const shownContacts = contactLines.slice(0, 4).map((l) => pdf.splitTextToSize(l, 90)[0]);

    font('bold', 15);
    const nameLines = pdf.splitTextToSize(businessName || sellerName, 90).slice(0, 2);

    const bandH = Math.max(40, 14 + nameLines.length * 6.5 + shownContacts.length * 4.6 + 4);

    fill(C.navy);
    pdf.rect(0, 0, pageW, bandH, 'F');

    // Logo tile (white rounded square) with initial as fallback
    const tileSize = 26;
    const tileY = (bandH - tileSize) / 2;
    fill(C.white);
    pdf.roundedRect(margin, tileY, tileSize, tileSize, 3, 3, 'F');

    let logoDrawn = false;
    if (logo) {
      try {
        const props = pdf.getImageProperties(logo.dataUrl);
        const box = tileSize - 4;
        const scale = Math.min(box / props.width, box / props.height);
        const drawW = props.width * scale;
        const drawH = props.height * scale;
        pdf.addImage(
          logo.dataUrl,
          logo.format,
          margin + (tileSize - drawW) / 2,
          tileY + (tileSize - drawH) / 2,
          drawW,
          drawH
        );
        logoDrawn = true;
      } catch (error) {
        console.warn('Logo could not be drawn:', error.message);
      }
    }
    if (!logoDrawn) {
      const initial = (businessName || sellerName || 'A').trim().charAt(0).toUpperCase();
      font('bold', 20);
      color(C.navy);
      pdf.text(initial, margin + tileSize / 2, tileY + tileSize / 2 + 3.5, { align: 'center' });
    }

    // Business name + contact details (left)
    const textX = margin + tileSize + 6;
    let ly = 14;
    font('bold', 15);
    color(C.white);
    nameLines.forEach((line) => {
      pdf.text(line, textX, ly);
      ly += 6.5;
    });
    font('normal', 8.5);
    color(C.softWhite);
    shownContacts.forEach((line) => {
      pdf.text(line, textX, ly);
      ly += 4.6;
    });

    // Receipt title, number and date (right)
    font('bold', 24);
    color(C.white);
    pdf.text('RECEIPT', pageW - margin, 18, { align: 'right' });
    font('normal', 10);
    color(C.softWhite);
    pdf.text(`No. ${receiptsData.receiptsNumber || 'N/A'}`, pageW - margin, 26, { align: 'right' });
    pdf.text(dateStr, pageW - margin, 32, { align: 'right' });

    let y = bandH + 8;

    // ---------- INFO STRIP ----------
    fill(C.band);
    pdf.roundedRect(margin, y, contentW, 16, 2, 2, 'F');

    font('bold', 10.5);
    const sellerShown = pdf.splitTextToSize(sellerName, contentW * 0.42)[0];
    const fields = [
      { x: margin + 6, label: 'SERVED BY', value: sellerShown },
      { x: margin + contentW * 0.55, label: 'DATE ISSUED', value: dateStr },
      { x: margin + contentW * 0.82, label: 'ITEMS', value: String(items.length) }
    ];
    fields.forEach((f) => {
      font('bold', 7);
      color(C.muted);
      pdf.text(f.label, f.x, y + 6);
      font('bold', 10.5);
      color(C.ink);
      pdf.text(f.value, f.x, y + 12);
    });

    y += 16 + 10;

    // ---------- ITEMS TABLE ----------
    const colW = [12, 80, 18, 35, 35]; // #, Item, Qty, Price, Total (sums to 180)
    const qtyR = margin + colW[0] + colW[1] + colW[2] - 3;
    const priceR = qtyR + colW[3];
    const totalR = priceR + colW[4];

    const drawTableHeader = (yy) => {
      fill(C.navy);
      pdf.roundedRect(margin, yy, contentW, 9, 1.5, 1.5, 'F');
      font('bold', 8);
      color(C.white);
      pdf.text('#', margin + 6, yy + 6, { align: 'center' });
      pdf.text('ITEM', margin + 14, yy + 6);
      pdf.text('QTY', qtyR, yy + 6, { align: 'right' });
      pdf.text('PRICE', priceR, yy + 6, { align: 'right' });
      pdf.text('TOTAL', totalR, yy + 6, { align: 'right' });
    };

    drawTableHeader(y);
    y += 9;

    if (items.length === 0) {
      font('normal', 9.5);
      color(C.muted);
      pdf.text('No items on this receipt.', margin + 14, y + 7);
      y += 10;
    }

    items.forEach((item, index) => {
      font('normal', 9.5);
      const wrapped = pdf.splitTextToSize(String(item.name || ''), colW[1] - 4);
      const rowH = Math.max(10, wrapped.length * 4.7 + 5.4);

      if (y + rowH > bottomLimit) {
        pdf.addPage();
        y = margin;
        drawTableHeader(y);
        y += 9;
      }

      if (index % 2 === 1) {
        fill(C.band);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }

      const qty = Number(item.quantity) || 0;
      const lineTotal =
        item.totalPrice !== undefined && item.totalPrice !== null
          ? item.totalPrice
          : (Number(item.price) || 0) * qty;

      font('normal', 9.5);
      color(C.ink);
      pdf.text(String(index + 1), margin + 6, y + 6.4, { align: 'center' });
      pdf.text(wrapped, margin + 14, y + 6.4);
      pdf.text(String(item.quantity ?? 0), qtyR, y + 6.4, { align: 'right' });
      pdf.text(money(item.price), priceR, y + 6.4, { align: 'right' });
      font('bold', 9.5);
      pdf.text(money(lineTotal), totalR, y + 6.4, { align: 'right' });

      stroke(C.line);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + rowH, margin + contentW, y + rowH);

      y += rowH;
    });

    y += 8;

    // ---------- TOTALS CARD ----------
    const showDiscount = Number(receiptsData.discount) > 0;
    const summaryRows = 2 + (showDiscount ? 1 : 0); // subtotal, (discount), VAT
    const totalsH = summaryRows * 7 + 12 + 7 + 14 + 4;

    if (y + totalsH > bottomLimit) {
      pdf.addPage();
      y = margin;
    }

    const boxW = 85;
    const boxX = pageW - margin - boxW;
    const totalsTop = y;

    const summaryRow = (label, value, opts = {}) => {
      font(opts.bold ? 'bold' : 'normal', 9.5);
      color(C.muted);
      pdf.text(label, boxX + 4, y + 5);
      color(opts.valueColor || C.ink);
      pdf.text(value, boxX + boxW - 4, y + 5, { align: 'right' });
      y += 7;
    };

    summaryRow('Sub-Total', money(receiptsData.subtotal));
    if (showDiscount) {
      summaryRow('Discount', `-${money(receiptsData.discount)}`, { valueColor: C.green });
    }
    summaryRow('VAT', money(receiptsData.vat));

    y += 1;
    fill(C.navy);
    pdf.roundedRect(boxX, y, boxW, 12, 2, 2, 'F');
    font('bold', 10);
    color(C.white);
    pdf.text('TOTAL', boxX + 4, y + 8);
    font('bold', 12);
    pdf.text(money(receiptsData.total), boxX + boxW - 4, y + 8, { align: 'right' });
    y += 12 + 3;

    summaryRow('Cash Paid', money(receiptsData.cashPaid));
    summaryRow('Change', money(receiptsData.change), { bold: true });

    // Status badge (left of totals) when the receipt is not completed
    const showStatus = receiptsData.status && receiptsData.status !== 'completed';
    if (showStatus) {
      font('bold', 10);
      color(C.red);
      pdf.text(`STATUS: ${String(receiptsData.status).toUpperCase()}`, margin, totalsTop + 6);
    }

    // ---------- REFUND / RETURNS POLICY ----------
    const policyClause = String(receiptsData.policyClause || '').trim().slice(0, 1000);
    if (policyClause) {
      font('normal', 8.5);
      const clauseLines = pdf.splitTextToSize(policyClause, contentW - 12);
      const policyH = 14 + clauseLines.length * 4.2;

      y += 6;
      if (y + policyH > bottomLimit) {
        pdf.addPage();
        y = margin;
      }

      fill(C.band);
      stroke(C.line);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, contentW, policyH, 2, 2, 'FD');

      font('bold', 9);
      color(C.navy);
      pdf.text('Refund & Returns Policy', margin + 6, y + 7);

      font('normal', 8.5);
      color([75, 85, 99]);
      pdf.text(clauseLines, margin + 6, y + 13);
    }

    // ---------- FOOTER (every page) ----------
    const totalPages = pdf.getNumberOfPages();
    const contactName = businessName || sellerName;
    const contactText = `Questions? Contact ${contactName}${company.phone ? ' on ' + company.phone : ''}`;

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      stroke(C.line);
      pdf.setLineWidth(0.3);
      pdf.line(margin, pageH - 22, pageW - margin, pageH - 22);

      font('bold', 10);
      color(C.navy);
      pdf.text('Thank you for your business!', margin, pageH - 15);

      font('normal', 8);
      color(C.muted);
      pdf.text(pdf.splitTextToSize(contactText, 110)[0], margin, pageH - 10);
      pdf.text('Powered by Aselar, a TeX product.', pageW - margin, pageH - 15, { align: 'right' });
      pdf.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 10, { align: 'right' });
    }
  }

async uploadToFirebase(pdfBuffer, filename, metadata = {}) {
  try {
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    
    console.log('Uploading via REST API, buffer:', buffer.length, 'bytes');

    const token = uuidv4();
    const bucketName = bucket.name;
    const filePath = `receipts/${filename}`;
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
    return `receipt-${receiptsNumber}-${timestamp}.pdf`; // Changed from 'quote-'
  }
}

module.exports = { PDFServiceJsPDF };