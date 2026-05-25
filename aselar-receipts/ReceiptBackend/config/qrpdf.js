const { PDFServiceJsPDF } = require('./pdfService'); // Adjust path if needed

const generateReceiptWithQR = async (req, res) => {
  try {
    const { receiptsData, htmlContent } = req.body; // Renamed from receiptsData for clarity; htmlContent optional/ignored if using buildReceiptPDF
    const pdfService = new PDFServiceJsPDF();

    // Chain: Generate PDF buffer → Upload to Firebase → Generate QR for the URL
    const pdfBuffer = await pdfService.generatePDFFromHTML(htmlContent, receiptsData);
    const filename = pdfService.generateFilename(receiptsData.receiptsNumber);
    const uploadResult = await pdfService.uploadToFirebase(pdfBuffer, filename, {
      // Optional metadata, e.g., { userId: receiptData.user }
    });
    const resultWithQR = await pdfService.generateQRForUpload(uploadResult);

    res.json({
      success: true,
      message: 'Receipt generated with embedded QR code',
      pdfUrl: resultWithQR.publicUrl,
      qrCode: resultWithQR.qrCode, // Base64 QR if you want to show it in frontend
      filename: resultWithQR.filename,
    });
  } catch (error) {
    console.error('Error in generateReceiptWithQR:', error); // Added for debugging
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateReceiptWithQR };