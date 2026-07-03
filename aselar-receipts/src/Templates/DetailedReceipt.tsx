import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import styles from "./DetailedReceipt.module.css";
import ReceiverModal from './ReceiverModal';
import { toast } from "react-toastify";
import Modal from 'react-modal';
import jsQR from 'jsqr';
import beep from "../assets/beep-329314.mp3"
import SMSModal from './SMSModal';
import QuoteWhatsAppModal from '../Quotation/QuoteWhatsAppModal';
import EmailModal from './EmailModal';
import useSMSLimit from '../Hooks/useSMSLimit'; 

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  totalPrice: number;
  _id: string;
}

interface ReceiptData {
  _id: string;
  items: ReceiptItem[];
  receiptsNumber: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  cashPaid: number;
  change: number;
  user: string;
  createdBy: string;
  status: string;
  createdAt: string;
  __v: number;
}

interface ApiResponse {
  success: boolean;
  data: ReceiptData;
}

interface ProfileData {
  _id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: string;
}

const DetailedReceipt: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [businessProfile, setBusinessProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReceiverModalOpen, setIsReceiverModalOpen] = useState<boolean>(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [receiverName, setReceiverName] = useState<string>('');
  const [shouldPrint, setShouldPrint] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCodeBase64: string; downloadUrl: string } | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  beepRef.current = new Audio(beep);
  beepRef.current.load();
}, []);
  let animationFrameId: number;

  // CHANGE 2: initialise the hook
  const {
    isLimitReached,
    remainingSMS,
    timeUntilReset,
    recordSMS,
  } = useSMSLimit();

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const token=localStorage.getItem('token')
        const [recentReceipt, userProfile] = await Promise.all([
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/recent-receipt`, { credentials: "include",
             headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
           }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, { credentials: "include",
             headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
           })
        ]);

        if (!recentReceipt.ok) throw new Error('Failed to fetch receipt data');
        if (!userProfile.ok) throw new Error('Failed to fetch profile data');

        const [ReceiptData, businessProfileData] = await Promise.all([
          recentReceipt.json(),
          userProfile.json()
        ]);

        setReceipt((ReceiptData as ApiResponse).data);
        setBusinessProfile(businessProfileData);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
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
          if (beepRef.current) {
  beepRef.current.currentTime = 0;
  beepRef.current.play().catch((err) => console.error('Beep play failed:', err));
}
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
      if (!htmlContent) throw new Error('No receipt content to send');

      const requestData = {
        receiptsNumber: receipt?.receiptsNumber,
        items: receipt?.items || [],
        subtotal: receipt?.subtotal,
        discount: receipt?.discount,
        vat: receipt?.vat,
        total: receipt?.total,
        cashPaid: receipt?.cashPaid,
        change: receipt?.change,
        createdAt: receipt?.createdAt,
        htmlContent,
        companyInfo: {
          nameOfBusiness: businessProfile?.nameOfBusiness,
          emailBusiness: businessProfile?.emailBusiness,
          businessPhone: businessProfile?.businessPhone,
          profilePicture: businessProfile?.profilePicture
        }
      };
  const token=localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/generate-qr`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

  useEffect(() => {
    if (shouldPrint) {
      window.print();
      setShouldPrint(false);
    }
  }, [shouldPrint]);

  // CHANGE 3: guard handleSendSMS with limit check
  const handleSendSMS = () => {
    if (isLimitReached) {
      toast.error(
        `Daily SMS limit reached (20/20). Resets in ${timeUntilReset}.`,
        { autoClose: 5000 }
      );
      return;
    }
    setIsSMSModalOpen(true);
  };

  const handleWhatsAppModalOpen = () => setIsWhatsAppModalOpen(true);
  const handleEmailButtonClick = () => setIsEmailModalOpen(true);

  const handleReceiverModalSubmit = (name: string) => {
    setReceiverName(name);
    setShouldPrint(true);
    setIsReceiverModalOpen(false);
  };

  const handleReceiverModalClose = () => {
    setIsReceiverModalOpen(false);
    setShouldPrint(true);
  };

  const WhatsAppModalclose = () => setIsWhatsAppModalOpen(false);

  const generateHTMLContent = () => {
    if (!receipt) return '';
    return ReactDOMServer.renderToString(
      <div className={styles.wrapper}>
        <div className={styles.addressPlusLogo}>
          <img src={businessProfile?.profilePicture} alt="TeX-Technology logo" className={styles.logo} />
          <div className={styles.text}>
            <h4>{businessProfile?.nameOfBusiness}</h4>
            <h4>{businessProfile?.emailBusiness}</h4>
            <h4>{businessProfile?.businessPhone}</h4>
          </div>
          <h4>{receipt?.receiptsNumber}</h4>
        </div>

        <div className={styles.receiptHeader}>
          <h3>SALES RECEIPT</h3>
          <h4>Date: {new Date(receipt.createdAt).toLocaleDateString()}</h4>
          {receiverName && <h4>Receiver: {receiverName}</h4>}
        </div>

        <div className={styles.items}>
          <h4>Product</h4>
          <h4>Qty</h4>
          <h4>Price(P)</h4>
          <h4>Total</h4>
        </div>

        {receipt.items && receipt.items.length > 0 ? (
          <div className={styles.itemsContainer}>
            {receipt.items.map((item, index) => (
              <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                <div className={styles.productName}>{item.name}</div>
                <div className={styles.quantity}>{item.quantity}</div>
                <div className={styles.unit}>{item.price.toFixed(2)}</div>
                <div className={styles.price}>{item.totalPrice.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noProducts}>No products found.</p>
        )}

        <div className={styles.divider}></div>

        <div className={styles.adding}>
          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Subtotal-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.subtotal.toFixed(2)}</div>
          </div>

          {receipt.discount > 0 && (
            <div className={styles.total}>
              <h4 className={styles.totalHeader}>Discount-P</h4>
              <div className={styles.totalAmount}>-BWP {receipt.discount.toFixed(2)}</div>
            </div>
          )}

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>VAT (14%)-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.vat.toFixed(2)}</div>
          </div>

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Total-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.total.toFixed(2)}</div>
          </div>

          <div className={styles.cashPaid}>
            <h4>Paid-P</h4>
            <div className={styles.paidAmount}>BWP {receipt.cashPaid.toFixed(2)}</div>
          </div>

          <div className={styles.balance}>
            <h4>Balance-P</h4>
            <div className={styles.balanceAmount}>BWP {receipt.change.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.security}>
          <h4>RefNo.{receipt._id.substring(0, 8)}</h4>
          <h4>Seller: {businessProfile?.nameOfBusiness}</h4>
        </div>

        <div className={styles.footer}>
          <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
          <p className={styles.thankYou}>Thank you for your business!</p>
        </div>
      </div>
    );
  };

  const handleEmailModalSubmit = async (customerEmail: string) => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error("No receipt content available");
    const token=localStorage.getItem('token') 
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/email-receipt`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          email: customerEmail,
          receiptsNumber: receipt?.receiptsNumber,
          items: receipt?.items || [],
          subtotal: receipt?.subtotal,
          discount: receipt?.discount,
          vat: receipt?.vat,
          total: receipt?.total,
          cashPaid: receipt?.cashPaid,
          change: receipt?.change,
          createdAt: receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: businessProfile?.nameOfBusiness,
            emailBusiness: businessProfile?.emailBusiness,
            businessPhone: businessProfile?.businessPhone,
            profilePicture: businessProfile?.profilePicture
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Receipt sent successfully to ${customerEmail}`);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Email Error:', error);
      toast.error('Failed to send email receipt');
    }
  };

  // CHANGE 4: recordSMS() called before the fetch — blocks if limit hit
  const handleSMSModalSubmit = async (phoneNumber: string) => {
    const allowed = recordSMS();
    if (!allowed) {
      toast.error(
        `Daily SMS limit reached (20/20). Resets in ${timeUntilReset}.`,
        { autoClose: 5000 }
      );
      setIsSMSModalOpen(false);
      return;
    }

    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error("No receipts data available");
  const token=localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/sms-receipt`, {
        method: 'POST',
         headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber,
          receiptsNumber: receipt?.receiptsNumber,
          items: receipt?.items || [],
          subtotal: receipt?.subtotal,
          discount: receipt?.discount,
          vat: receipt?.vat,
          total: receipt?.total,
          cashPaid: receipt?.cashPaid,
          change: receipt?.change,
          createdAt: receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: businessProfile?.nameOfBusiness,
            emailBusiness: businessProfile?.emailBusiness,
            businessPhone: businessProfile?.businessPhone,
            profilePicture: businessProfile?.profilePicture
          }
        })
      });

      const data = await response.json();
      if (data.success) toast.success('Receipt PDF created and SMS sent successfully!');
      else toast.error(data.message || 'Failed to send SMS.');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while processing your request.');
    } finally {
      setIsSMSModalOpen(false);
    }
  };

  const handleWhatsAppModalSubmit = async (phoneNumber: string) => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error("No receipts data available");
   const token=localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/whatsapp-receipt`, {
        method: 'POST',
         headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          whatsappNumber: phoneNumber,
          receiptsNumber: receipt?.receiptsNumber,
          items: receipt?.items || [],
          subtotal: receipt?.subtotal,
          discount: receipt?.discount,
          vat: receipt?.vat,
          total: receipt?.total,
          cashPaid: receipt?.cashPaid,
          change: receipt?.change,
          createdAt: receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: businessProfile?.nameOfBusiness,
            emailBusiness: businessProfile?.emailBusiness,
            businessPhone: businessProfile?.businessPhone,
            profilePicture: businessProfile?.profilePicture
          }
        })
      });

      const data = await response.json();
      if (data.success) toast.success('Receipt sent successfully via WhatsApp!');
      else toast.error(data.message || 'Failed to send WhatsApp.');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while processing your request.');
    } finally {
      setIsWhatsAppModalOpen(false);
    }
  };

  const handleSMSModalClose = () => setIsSMSModalOpen(false);

  if (loading) return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Loading receipt details...</p></div>;
  if (error) return <div className={styles.errorContainer}><div className={styles.errorIcon}>⚠️</div><p>Error: {error}</p><button onClick={() => window.location.reload()} className={styles.retryButton}>Try Again</button></div>;
  if (!receipt) return <div className={styles.noDataContainer}><p>No receipt data available.</p><button onClick={() => window.location.reload()} className={styles.retryButton}>Refresh</button></div>;

  return (
    <div className={styles.cover}>
      <div id="receipt-for-pdf" className={styles.wrapper}>
        <div className={styles.addressPlusLogo}>
          <img src={businessProfile?.profilePicture} alt="TeX-Technology logo" className={styles.logo} />
          <div className={styles.text}>
            <h4>{businessProfile?.nameOfBusiness}</h4>
            <h4>{businessProfile?.emailBusiness}</h4>
            <h4>{businessProfile?.businessPhone}</h4>
          </div>
        </div>

        <div className={styles.receiptHeader}>
          <h3>SALES RECEIPT</h3>
          <h4>Date: {new Date(receipt.createdAt).toLocaleDateString()}</h4>
          {receiverName && <h4>Receiver: {receiverName}</h4>}
        </div>

        <div className={styles.items}>
          <h4>Product</h4>
          <h4>Qty</h4>
          <h4>Price(P)</h4>
          <h4>Total</h4>
        </div>

        {receipt.items && receipt.items.length > 0 ? (
          <div className={styles.itemsContainer}>
            {receipt.items.map((item, index) => (
              <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                <div className={styles.productName}>{item.name}</div>
                <div className={styles.quantity}>{item.quantity}</div>
                <div className={styles.unit}>{item.price.toFixed(2)}</div>
                <div className={styles.price}>{item.totalPrice.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noProducts}>No products found.</p>
        )}

        <div className={styles.divider}></div>

        <div className={styles.adding}>
          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Subtotal-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.subtotal.toFixed(2)}</div>
          </div>

          {receipt.discount > 0 && (
            <div className={styles.total}>
              <h4 className={styles.totalHeader}>Discount-P</h4>
              <div className={styles.totalAmount}>-BWP {receipt.discount.toFixed(2)}</div>
            </div>
          )}

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>VAT (14%)-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.vat.toFixed(2)}</div>
          </div>

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Total-P</h4>
            <div className={styles.totalAmount}>BWP {receipt.total.toFixed(2)}</div>
          </div>

          <div className={styles.cashPaid}>
            <h4>Paid-P</h4>
            <div className={styles.paidAmount}>BWP {receipt.cashPaid.toFixed(2)}</div>
          </div>

          <div className={styles.balance}>
            <h4>Balance-P</h4>
            <div className={styles.balanceAmount}>BWP {receipt.change.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.security}>
          <h4>RefNo.{receipt._id.substring(0, 8)}</h4>
          <h4>Seller: {businessProfile?.nameOfBusiness}</h4>
        </div>

        <div className={styles.footer}>
          <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
          <p className={styles.thankYou}>Thank you for your business!</p>
        </div>
      </div>

      <div className={styles.actions}>
        {/* CHANGE 5: SMS button shows remaining count and disables at limit */}
        <button
          className={styles.pdfButton}
          onClick={handleSendSMS}
          disabled={isLimitReached}
          title={
            isLimitReached
              ? `Daily SMS limit reached. Resets in ${timeUntilReset}`
              : `${remainingSMS} SMS remaining today`
          }
        >
          {isLimitReached
            ? `SMS (Limit reached)`
            : remainingSMS <= 5
            ? `SMS (${remainingSMS} left)`
            : 'SMS'}
        </button>
        <button className={styles.smsButton} onClick={handleWhatsAppModalOpen}>Whatsapp</button>
        <button className={styles.smsButton} onClick={handleQRCode}>Scan QR code</button>
        <button className={styles.printButton} onClick={handleEmailButtonClick}>Email</button>
      </div>

      <ReceiverModal isOpen={isReceiverModalOpen} onClose={handleReceiverModalClose} onSubmit={handleReceiverModalSubmit} />
      <SMSModal isOpen={isSMSModalOpen} onClose={handleSMSModalClose} onSubmit={handleSMSModalSubmit} />
      <QuoteWhatsAppModal isOpen={isWhatsAppModalOpen} onClose={WhatsAppModalclose} onSubmit={handleWhatsAppModalSubmit} />

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleEmailModalSubmit}
      />

      <Modal isOpen={isQRModalOpen} onRequestClose={closeQRModal} style={{ content: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: '800px', padding: '20px', borderRadius: '8px' } }}>
        <h2>QR Code Scanner & Viewer</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {qrCodeData && (
            <div style={{ textAlign: 'center' }}>
              <h3>Scan this QR code with your mobile device</h3>
              <img src={qrCodeData.qrCodeBase64} alt="QR Code" style={{ width: '200px', height: '200px', margin: '10px 0' }} />
              <a href={qrCodeData.downloadUrl} download="receipt.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>Direct Download PDF</a>
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
              <a href={scannedUrl} download="receipt.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>Download Scanned PDF</a>
            </div>
          )}
          <button onClick={closeQRModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default DetailedReceipt;