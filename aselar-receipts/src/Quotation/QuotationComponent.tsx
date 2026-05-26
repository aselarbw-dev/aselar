import React, { useState, useEffect, useRef } from 'react';
import { FileText, Send, Download, Printer, Mail } from 'lucide-react';
import Modal from 'react-modal';
import jsQR from 'jsqr';
import styles from './QuotationComponent.module.css';
import ReactDOMServer from 'react-dom/server';
import QuoteSMSModal from './QuoteSMSModal';
import QuoteWhatsAppModal from './QuoteWhatsAppModal';
import EmailModal from '../Templates/EmailModal';
import { toast } from "react-toastify";
import { useSellerContext } from '../Sellers/SellerNameProvider';
import beep from "../assets/beep-329314.mp3"

Modal.setAppElement('#root');

interface QuoteItem {
  field1: string;
  field2: string;
  field3: number;
  field4: number;
  _id: string;
}

interface QuoteData {
  _id: string;
  totalSum: string;
  vat: string;
  subtotal: string;
  quoteNumber: string;
  data: QuoteItem[];
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: string;
  __v?: number;
}

interface Banking {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchName: string;
  swiftCode: string;
  accountType: string;
}

interface BusinessData {
  _id: string;
  businessNature: string;
  place: string;
  businessNumber: string;
  businessDescription: string;
  user: string;
}

interface ProfileData {
  _id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: string;
}

interface ReceiversData {
  companyName: string;
  addressedTo: string;
  phone: string;
  email: string;
  preparedBy: string;
}

const QuotationComponent: React.FC = () => {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [receiver, setReceiver] = useState<ReceiversData | null>(null);
  const [bank, setBank] = useState<Banking | null>(null);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCodeBase64: string; downloadUrl: string } | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let animationFrameId: number;
  const { sellerName } = useSellerContext();

  useEffect(() => {
    async function fetchLatestQuote() {
      try {
        setLoading(true);
        const [quoteResponse, businessResponse, profileResponse, receiversResponse, bankResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/get-new-quote`, { credentials: "include" }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/get-business`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/profile`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" }),
          fetch(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/get-receiver`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/user-banking`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" })
        ]);

        if (!quoteResponse.ok) throw new Error('Failed to fetch quote');
        if (!businessResponse.ok) throw new Error('Failed to fetch business data');
        if (!profileResponse.ok) throw new Error('Failed to fetch profile data');
        if (!receiversResponse.ok) throw new Error('Failed to fetch receivers data');
        if (!bankResponse.ok) throw new Error('Failed to fetch banking data');

        const [quoteData, businessData, profileData, receiversData, bankingResponse] = await Promise.all([
          quoteResponse.json(),
          businessResponse.json(),
          profileResponse.json(),
          receiversResponse.json(),
          bankResponse.json()
        ]);

        const bankingData = bankingResponse.success ? bankingResponse.data : null;

        setQuote(quoteData);
        setBusinessData(businessData);
        setProfileData(profileData);
        setReceiver(receiversData);
        setBank(bankingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestQuote();
  }, []);

  const startQRScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRCode();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Failed to access camera for QR scanning');
    }
  };

  const stopQRScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };

  const scanQRCode = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

        if (code) {
          setScannedUrl(code.data);
          stopQRScanner();
          const beepSound = new Audio(beep);
          beepSound.play().catch(() => {});
          toast.success('QR code scanned successfully!');
        } else {
          animationFrameId = requestAnimationFrame(scanQRCode);
        }
      } else {
        animationFrameId = requestAnimationFrame(scanQRCode);
      }
    }
  };

  const handleQRCode = async () => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error('No quote content to send');

      const requestData = {
        quotes: quote?.data,
        vat: quote?.vat,
        quoteNumber: quote?.quoteNumber,
        totalSum: quote?.totalSum,
        subTotal: quote?.subtotal,
        htmlContent,
        companyInfo: {
          nameOfBusiness: profileData?.nameOfBusiness,
          place: businessData?.place,
          businessNature: businessData?.businessNature,
          businessPhone: profileData?.businessPhone,
          emailBusiness: profileData?.emailBusiness
        },
        clientInfo: {
          companyName: receiver?.companyName,
          addressedTo: receiver?.addressedTo,
          phone: receiver?.phone,
          email: receiver?.email
        },
        bankingInfo: {
          accountName: bank?.accountName,
          bankName: bank?.bankName,
          accountNumber: bank?.accountNumber,
          branchName: bank?.branchName,
          swiftCode: bank?.swiftCode
        }
      };

      const response = await fetch('http://localhost:5003/api/generate-qr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();

      if (res.success) {
        setQRCodeData({ qrCodeBase64: res.data.qrCodeBase64, downloadUrl: res.data.downloadUrl });
        setIsQRModalOpen(true);
        startQRScanner();
        toast.success('QR code generated successfully!');
      } else {
        throw new Error(res.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const closeQRModal = () => {
    setIsQRModalOpen(false);
    setScannedUrl(null);
    setQRCodeData(null);
    stopQRScanner();
  };

  const handlePrint = () => window.print();
  const handleSMSModalOpen = () => setIsSMSModalOpen(true);
  const handleWhatsAppModalOpen = () => setIsWhatsAppModalOpen(true);
  const handleEmailButtonClick = () => setIsEmailModalOpen(true);

  const SMSModalclose = () => setIsSMSModalOpen(false);
  const WhatsAppModalclose = () => setIsWhatsAppModalOpen(false);

  const generateHTMLContent = () => {
    if (!quote) return '<p>No quote data available.</p>';

    return ReactDOMServer.renderToString(
      <div className={styles.quotationCard}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Quotation</h1>
            <p className={styles.quoteNumber}>Quote Number: {quote?.quoteNumber}</p>
          </div>
        </div>
        <div className={styles.infoSection}>
          <div className={styles.companyInfo}>
            <img src={profileData?.profilePicture} alt="Company Logo" className={styles.logo} />
            <h2 className={styles.companyName}>{profileData?.nameOfBusiness}</h2>
            <div className={styles.address}>
              {businessData?.place}<br />
              {businessData?.businessNature}<br />
              Phone: {profileData?.businessPhone}<br />
              Email: {profileData?.emailBusiness}<br />
            </div>
          </div>
          <div className={styles.clientInfoContainer}>
            <div className={styles.clientInfo}>
              <h3 className={styles.clientTitle}>Quotation For:</h3>
              <h4 className={styles.clientName}>{receiver?.companyName || receiver?.addressedTo}</h4>
              <div className={styles.quoteDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Addressed to: {receiver?.addressedTo}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email: {receiver?.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Call: {receiver?.phone}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date:</span>
                  <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Valid Until:</span>
                  <span>30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.quoteContent}>
          <div className={styles.sectionTitle}>
            <FileText size={24} className={styles.sectionIcon} />
            <h2 className={styles.sectionHeading}>Quoted Items</h2>
          </div>
          <div className={styles.tableContainer}>
            <div className={styles.itemsTable}>
              <div>
                <div className={styles.changeOrientation}>
                  <div className={`${styles.tableHeader} ${styles.columnId}`}>#</div>
                  <div className={`${styles.tableHeader} ${styles.columnTotal}`}>Item</div>
                  <div className={`${styles.tableHeader} ${styles.columnDesc}`}>Desc</div>
                  <div className={`${styles.tableHeader} ${styles.columnQty}`}>Qty</div>
                  <div className={`${styles.tableHeader} ${styles.columnPrice}`}>Unit Price</div>
                  <div className={`${styles.tableHeader} ${styles.columnTotalTwo}`}>Amount</div>
                </div>
              </div>
              <div>
                {quote && quote.data && quote.data.length > 0 ? (
                  <div className={styles.itemsContainer}>
                    {quote.data.map((item, index) => (
                      <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                        <div className={styles.itemIndex}>{index + 1}</div>
                        <div className={styles.itemDescription}>{item.field1}</div>
                        <div className={styles.itemQuantity}>{item.field2}</div>
                        <div className={styles.itemPrice}>{item.field3}</div>
                        <div className={styles.itemTotal}>{item.field4}</div>
                        <div className={styles.itemTotal}>{(item.field4 * item.field3).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noProducts}>No products found.</p>
                )}
              </div>
            </div>
          </div>
          <div className={styles.totalsContainer}>
            <div className={styles.totalsCard}>
              <div className={styles.totalsDivider}></div>
              <div className={styles.totalsRowFinal}>
                <span>Sub-Total:</span>
                <span className={styles.totalAmount}>{quote?.subtotal}</span>
              </div>
              <div className={styles.totalsRowFinal}>
                <span>VAT(14%)BWP:</span>
                <span className={styles.totalAmount}>{quote?.vat}</span>
              </div>
              <div className={styles.totalsRowFinal}>
                <span>Total:</span>
                <span className={styles.totalAmount}>{quote?.totalSum}</span>
              </div>
            </div>
          </div>
          <div className={styles.notesSection}>
            <div className={styles.banking}>
              <h3 className={styles.notesTitle}>Banking Details</h3>
              <p>Account Name: {bank?.accountName}</p>
              <p>Bank Name: {bank?.bankName}</p>
              <p>Account Number: {bank?.accountNumber}</p>
              <p>Branch Name: {bank?.branchName}</p>
              <p>SWIFT Code: {bank?.swiftCode}</p>
            </div>
            <h3 className={styles.notesTitle}>Terms & Notes</h3>
            <div className={styles.notesContent}>
              <p>This quote is valid for 30 days from the date of issue.</p>
              <p>Payment terms: 50% upfront, 50% upon completion.</p>
              <p>Delivery timeline will be finalized upon project kickoff.</p>
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <p>Thank you for your business!</p>
          <p className={styles.footerContact}>For any questions, please contact {sellerName || profileData?.nameOfBusiness}</p>
        </div>
      </div>
    );
  };

  const handleEmailModalSubmit = async (customerEmail: string) => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error('No quote content available');

      const requestData = {
        email: customerEmail,
        quotes: quote?.data,
        vat: quote?.vat,
        quoteNumber: quote?.quoteNumber,
        totalSum: quote?.totalSum,
        subTotal: quote?.subtotal,
        htmlContent,
        companyInfo: {
          nameOfBusiness: profileData?.nameOfBusiness,
          place: businessData?.place,
          businessNature: businessData?.businessNature,
          businessPhone: profileData?.businessPhone,
          emailBusiness: profileData?.emailBusiness
        },
        clientInfo: {
          companyName: receiver?.companyName,
          addressedTo: receiver?.addressedTo,
          phone: receiver?.phone,
          email: receiver?.email
        },
        bankingInfo: {
          accountName: bank?.accountName,
          bankName: bank?.bankName,
          accountNumber: bank?.accountNumber,
          branchName: bank?.branchName,
          swiftCode: bank?.swiftCode
        }
      };

      const response = await fetch(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/email-quote`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();

      if (res.success) {
        toast.success(`Quotation sent successfully to ${customerEmail}`);
      } else {
        toast.error(res.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Email Error:', error);
      toast.error('Failed to send email quotation');
    }
  };

  const handleSubmitSMSModal = async (phoneNumber: string) => {
    try {
      const htmlContent = generateHTMLContent();
      const requestData = {
        phoneNumber,
        quotes: quote?.data,
        vat: quote?.vat,
        quoteNumber: quote?.quoteNumber,
        totalSum: quote?.totalSum,
        subTotal: quote?.subtotal,
        htmlContent,
        companyInfo: {
          nameOfBusiness: profileData?.nameOfBusiness,
          place: businessData?.place,
          businessNature: businessData?.businessNature,
          businessPhone: profileData?.businessPhone,
          emailBusiness: profileData?.emailBusiness
        },
        clientInfo: {
          companyName: receiver?.companyName,
          addressedTo: receiver?.addressedTo,
          phone: receiver?.phone,
          email: receiver?.email
        },
        bankingInfo: {
          accountName: bank?.accountName,
          bankName: bank?.bankName,
          accountNumber: bank?.accountNumber,
          branchName: bank?.branchName,
          swiftCode: bank?.swiftCode
        }
      };

      const response = await fetch(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/sms-quote`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();
      if (res.success) toast.success('SMS sent successfully!');
      else toast.error(res.error || 'Failed to send SMS');
    } catch (error) {
      toast.error('Failed to send SMS');
    } finally {
      setIsSMSModalOpen(false);
    }
  };

  const handleSubmitWhatsAppModal = async (phoneNumber: string) => {
    try {
      const htmlContent = generateHTMLContent();
      const requestData = {
        phoneNumber,
        quotes: quote?.data,
        vat: quote?.vat,
        quoteNumber: quote?.quoteNumber,
        totalSum: quote?.totalSum,
        subTotal: quote?.subtotal,
        htmlContent,
        companyInfo: {
          nameOfBusiness: profileData?.nameOfBusiness,
          place: businessData?.place,
          businessNature: businessData?.businessNature,
          businessPhone: profileData?.businessPhone,
          emailBusiness: profileData?.emailBusiness
        },
        clientInfo: {
          companyName: receiver?.companyName,
          addressedTo: receiver?.addressedTo,
          phone: receiver?.phone,
          email: receiver?.email
        },
        bankingInfo: {
          accountName: bank?.accountName,
          bankName: bank?.bankName,
          accountNumber: bank?.accountNumber,
          branchName: bank?.branchName,
          swiftCode: bank?.swiftCode
        }
      };

      const response = await fetch(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/whatsapp-quote`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();
      if (res.success) toast.success('WhatsApp message sent successfully!');
      else toast.error(res.error || 'Failed to send WhatsApp');
    } catch (error) {
      toast.error('Failed to send WhatsApp');
    } finally {
      setIsWhatsAppModalOpen(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading quote data...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.quotationCard}>
        {/* Full Quotation Display */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Quotation</h1>
            <p className={styles.quoteNumber}>Quote Number: {quote?.quoteNumber}</p>
          </div>
        </div>
        <div className={styles.infoSection}>
          <div className={styles.companyInfo}>
            <img src={profileData?.profilePicture} alt="Company Logo" className={styles.logo} />
            <h2 className={styles.companyName}>{profileData?.nameOfBusiness}</h2>
            <div className={styles.address}>
              {businessData?.place}<br />
              {businessData?.businessNature}<br />
              Phone: {profileData?.businessPhone}<br />
              Email: {profileData?.emailBusiness}<br />
            </div>
          </div>
          <div className={styles.clientInfoContainer}>
            <div className={styles.clientInfo}>
              <h3 className={styles.clientTitle}>Quotation For:</h3>
              <h4 className={styles.clientName}>{receiver?.companyName || receiver?.addressedTo}</h4>
              <div className={styles.quoteDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Addressed to: {receiver?.addressedTo}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email: {receiver?.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Call: {receiver?.phone}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date:</span>
                  <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Valid Until:</span>
                  <span>30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.quoteContent}>
          <div className={styles.sectionTitle}>
            <FileText size={24} className={styles.sectionIcon} />
            <h2 className={styles.sectionHeading}>Quoted Items</h2>
          </div>
          <div className={styles.tableContainer}>
            <div className={styles.itemsTable}>
              <div className={styles.changeOrientation}>
                <div className={`${styles.tableHeader} ${styles.columnId}`}>#</div>
                <div className={`${styles.tableHeader} ${styles.columnTotal}`}>Item</div>
                <div className={`${styles.tableHeader} ${styles.columnDesc}`}>Desc</div>
                <div className={`${styles.tableHeader} ${styles.columnQty}`}>Qty</div>
                <div className={`${styles.tableHeader} ${styles.columnPrice}`}>Unit Price</div>
                <div className={`${styles.tableHeader} ${styles.columnTotalTwo}`}>Amount</div>
              </div>
              {quote && quote.data && quote.data.length > 0 ? (
                quote.data.map((item, index) => (
                  <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemDescription}>{item.field1}</div>
                    <div className={styles.itemQuantity}>{item.field2}</div>
                    <div className={styles.itemPrice}>{item.field3}</div>
                    <div className={styles.itemTotal}>{item.field4}</div>
                    <div className={styles.itemTotal}>{(item.field4 * item.field3).toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <p className={styles.noProducts}>No products found.</p>
              )}
            </div>
          </div>

          <div className={styles.totalsContainer}>
            <div className={styles.totalsCard}>
              <div className={styles.totalsDivider}></div>
              <div className={styles.totalsRowFinal}>
                <span>Sub-Total:</span>
                <span className={styles.totalAmount}>{quote?.subtotal}</span>
              </div>
              <div className={styles.totalsRowFinal}>
                <span>VAT(14%)BWP:</span>
                <span className={styles.totalAmount}>{quote?.vat}</span>
              </div>
              <div className={styles.totalsRowFinal}>
                <span>Total:</span>
                <span className={styles.totalAmount}>{quote?.totalSum}</span>
              </div>
            </div>
          </div>

          <div className={styles.notesSection}>
            <div className={styles.banking}>
              <h3 className={styles.notesTitle}>Banking Details</h3>
              <p>Account Name: {bank?.accountName}</p>
              <p>Bank Name: {bank?.bankName}</p>
              <p>Account Number: {bank?.accountNumber}</p>
              <p>Branch Name: {bank?.branchName}</p>
              <p>SWIFT Code: {bank?.swiftCode}</p>
            </div>
            <h3 className={styles.notesTitle}>Terms & Notes</h3>
            <div className={styles.notesContent}>
              <p>This quote is valid for 30 days from the date of issue.</p>
              <p>Payment terms: 50% upfront, 50% upon completion.</p>
              <p>Delivery timeline will be finalized upon project kickoff.</p>
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.actionButton} onClick={handleSMSModalOpen}>
            <Send size={16} className={styles.buttonIcon} />
            Send SMS
          </button>
          <button className={styles.actionButton} onClick={handleWhatsAppModalOpen}>
            <Download size={16} className={styles.buttonIcon} />
            WhatsApp
          </button>
          <button className={styles.actionButton} onClick={handleQRCode}>
            <Printer size={16} className={styles.buttonIcon} />
            QR Code
          </button>
          <button className={styles.actionButton} onClick={handleEmailButtonClick}>
            <Mail size={16} className={styles.buttonIcon} />
            Email
          </button>
          <button className={styles.actionButton} onClick={handlePrint}>
            <Printer size={16} className={styles.buttonIcon} />
            Download PDF
          </button>
        </div>

        <div className={styles.footer}>
          <p>Thank you for your business!</p>
          <p className={styles.footerContact}>For any questions, please contact {sellerName || profileData?.nameOfBusiness}</p>
        </div>
      </div>

      {/* Modals */}
      <QuoteSMSModal isOpen={isSMSModalOpen} onClose={SMSModalclose} onSubmit={handleSubmitSMSModal} />
      <QuoteWhatsAppModal isOpen={isWhatsAppModalOpen} onClose={WhatsAppModalclose} onSubmit={handleSubmitWhatsAppModal} />

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleEmailModalSubmit}
      />

      <Modal isOpen={isQRModalOpen} onRequestClose={closeQRModal} style={{ content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: '800px', padding: '20px', borderRadius: '8px' } }}>
        <h2>QR Code Scanner & Viewer</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {qrCodeData && (
            <div style={{ textAlign: 'center' }}>
              <h3>Scan this QR code with your mobile device</h3>
              <img src={qrCodeData.qrCodeBase64} alt="QR Code" style={{ width: '200px', height: '200px', margin: '10px 0' }} />
              <a href={qrCodeData.downloadUrl} download="quotation.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>Direct Download PDF</a>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <h3>Scan a QR code with your camera</h3>
            <video ref={videoRef} style={{ width: '100%', maxWidth: '400px', border: '1px solid #ccc' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          {scannedUrl && (
            <div style={{ textAlign: 'center' }}>
              <h3>PDF Preview</h3>
              <embed src={scannedUrl} type="application/pdf" width="100%" height="400px" style={{ border: '1px solid #ccc', marginTop: '10px' }} />
              <a href={scannedUrl} download="quotation.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>Download Scanned PDF</a>
            </div>
          )}
          <button onClick={closeQRModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default QuotationComponent;