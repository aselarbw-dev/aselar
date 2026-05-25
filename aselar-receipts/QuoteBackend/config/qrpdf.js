const {PDFServiceJsPDF} = require('./pdfService');

const generateQuoteWithQR = async (req, res) => {
  try {
    const { quoteData, htmlContent } = req.body;
    const pdfService = new PDFServiceJsPDF();

    const result = await pdfService.generatePDFWithQRCode(htmlContent, quoteData);

    res.json({
      success: true,
      message: 'Quote generated with embedded QR code',
      pdfUrl: result.pdfUrl,
      qrCode: result.qrCode, // Base64 QR if you want to show it in frontend
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateQuoteWithQR };
