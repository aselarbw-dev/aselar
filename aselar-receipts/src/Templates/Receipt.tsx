import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import styles from "./Receipt.module.css";
import ReceiverModal from './ReceiverModal';
import EmailModal from './EmailModal';
import SMSModal from './SMSModal';
import WhatsAppModal from './WhatsAppModal';
import { toast } from "react-toastify";
import Modal from 'react-modal';
import jsQR from 'jsqr';
import beep from "../assets/beep-329314.mp3";

interface ReceiptItem {
  field1: number;
  field2: number | string;
  field3: string;
  field4: string;
  _id: string;
}

interface ReceiptData {
  _id: string;
  inputs: ReceiptItem[];
  receiptsNumber?: string;
  total: string;
  subtotal?: number;
  vatAmount?: number;
  grandTotal?: number;
  discountName?: string;
  discountValue?: number;
  discountType?: string;
  change: string;
  cash: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: string;
  __v?: number;
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

interface SellerData {
  name: string;
}

const Receipt: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReceiverModalOpen, setIsReceiverModalOpen] = useState<boolean>(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [receiverName, setReceiverName] = useState<string>('');
  const [shouldPrint, setShouldPrint] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCodeBase64: string; downloadUrl: string } | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let animationFrameId: number;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
          const token = localStorage.getItem('token');
        setLoading(true);
        
        const [receiptResponse, businessResponse, profileResponse] = await Promise.all([
        
          fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/get-receipts`, { 
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: "include" 
          }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, { 
            headers: { 'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
             }, 
            credentials: "include" 
          }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, { 
            headers: { 'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
             }, 
            credentials: "include" 
          })
        ]);

        if (!receiptResponse.ok) {
          throw new Error(`Failed to fetch receipt: ${receiptResponse.status}`);
        }

        const receiptText = await receiptResponse.text();
        const receiptData = JSON.parse(receiptText);

        if (Array.isArray(receiptData) && receiptData.length > 0) {
          setReceipt(receiptData[0]);
        } else if (receiptData && typeof receiptData === 'object') {
          setReceipt(receiptData);
        } else {
          setError('Invalid receipt data');
        }

        if (businessResponse.ok) setBusinessData(await businessResponse.json());
        if (profileResponse.ok) setProfileData(await profileResponse.json());

      } catch (error: any) {
        console.error('Fetch error:', error);
        setError(error.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  // Daily Seller Fetch
  useEffect(() => {
    if (!receipt) return;

    const fetchDailySeller = async () => {
      try {
        const token = localStorage.getItem('token');
        const receiptDate = receipt.date || receipt.createdAt || new Date();
        const formattedDate = new Date(receiptDate).toISOString().split('T')[0];
        const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/daily-seller/${formattedDate}`, { 
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: "include" 
        });
        if (response.ok) {
          const sellerData = await response.json();
          setSeller(sellerData);
        } else {
          setSeller(null);
        }
      } catch (err) {
        console.warn("Seller fetch failed — using fallback");
        setSeller(null);
      }
    };

    fetchDailySeller();
  }, [receipt]);

  useEffect(() => {
    if (shouldPrint) {
      window.print();
      setShouldPrint(false);
    }
  }, [shouldPrint]);

  const displaySubtotal = receipt?.subtotal ?? parseFloat(receipt?.total || '0');
  const displayVat = receipt?.vatAmount ?? displaySubtotal * 0.14;
  const displayGrandTotal = receipt?.grandTotal ?? parseFloat(receipt?.total || '0');
  const hasDiscount = receipt?.discountValue && receipt.discountValue > 0;

  const getSellerName = () => seller?.name || profileData?.nameOfBusiness || "Unknown Seller";

  //const handlePrint = () => setIsReceiverModalOpen(true);
  const handleSendSMS = () => setIsSMSModalOpen(true);
  const handleSendWhatsApp = () => setIsWhatsAppModalOpen(true);

  const handleReceiverModalSubmit = (name: string) => {
    setReceiverName(name);
    setShouldPrint(true);
    setIsReceiverModalOpen(false);
  };

  const handleReceiverModalClose = () => {
    setIsReceiverModalOpen(false);
    setShouldPrint(true);
  };

  // QR Scanner Functions
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
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

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
      const token = localStorage.getItem('token');
      const htmlContent = getReceiptHTML();
      if (!htmlContent) throw new Error('No receipt content to send');

      const requestData = {
        receiptsNumber: receipt?.receiptsNumber,
        inputs: receipt?.inputs || [],
        subtotal: displaySubtotal,
        vatAmount: displayVat,
        grandTotal: displayGrandTotal,
        ...(hasDiscount && {
          discountName: receipt.discountName,
          discountValue: receipt.discountValue,
          discountType: receipt.discountType
        }),
        cash: receipt?.cash,
        change: receipt?.change,
        date: receipt?.date || receipt?.createdAt,
        htmlContent,
        companyInfo: {
          nameOfBusiness: profileData?.nameOfBusiness,
          place: businessData?.place,
          businessNature: businessData?.businessNature,
          businessPhone: profileData?.businessPhone,
          emailBusiness: profileData?.emailBusiness,
          profilePicture: profileData?.profilePicture
        }
      };

      const response = await fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}/api/generate-qr`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();
      if (res.success) {
        setQRCodeData({
          qrCodeBase64: res.data.qrCodeBase64,
          downloadUrl: res.data.downloadUrl
        });
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

  const AddressSection = () => (
    <div className={styles.text}>
      <h4>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</h4>
      <h4>{businessData?.businessNumber}</h4>
      <h4>{businessData?.place || 'Plot 1234'}</h4>
      <h4>{businessData?.businessDescription}</h4>
      <h4>{businessData?.businessNature}</h4>
      <h4>{profileData?.emailBusiness || 'tex@robotics.bw'}</h4>
    </div>
  );
  
  const getReceiptHTML = () => {
    if (!receipt) return '';
    
    return ReactDOMServer.renderToString(
      <div className={styles.wrapper}>
        <div className={styles.addressPlusLogo}>
          <img src={profileData?.profilePicture} alt="TeX-Technology logo" className={styles.logo} />
          <div className={styles.text}>
            <h4>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</h4>
            <h4>{businessData?.place || 'Plot 1234'}</h4>
            <h4>{businessData?.businessDescription}</h4>
            <h4>{businessData?.businessNature}</h4>
            <h4>{profileData?.emailBusiness || 'tex@robotics.bw'}</h4>
          </div>
        </div>

        <div className={styles.receiptHeader}>
          <h3>SALES RECEIPT</h3>
          {(receipt.date || receipt.createdAt) && (
            <h4>Date: {new Date(receipt.date || receipt.createdAt!).toLocaleDateString()}</h4>
          )}
          {receiverName && <h4>Receiver: {receiverName}</h4>}
        </div>
  
        <div className={styles.items}>
          <h4>Product</h4>
          <h4>Qty</h4>
          <h4>Price(P)</h4>
          <h4>Unit</h4>
        </div>
  
        {receipt.inputs && receipt.inputs.length > 0 ? (
          <div className={styles.itemsContainer}>
            {receipt.inputs.map((item, index) => (
              <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                <div className={styles.productName}>{item.field3}</div>
                <div className={styles.quantity}>{item.field1}</div>
                <div className={styles.unit}>{typeof item.field2 === 'number' ? item.field2.toFixed(2) : item.field2}</div>
                <div className={styles.price}>{item.field4 === 'na' ? '-' : item.field4}</div>
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
            <div className={styles.totalAmount}>BWP {displaySubtotal.toFixed(2)}</div>
          </div>

          {hasDiscount && (
            <div className={styles.total}>
              <h4 className={styles.totalHeader}>Discount ({receipt.discountName || ''})-P</h4>
              <div className={styles.totalAmount}>-BWP {receipt.discountValue?.toFixed(2)}</div>
            </div>
          )}

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>VAT (14%)-P</h4>
            <div className={styles.totalAmount}>BWP {displayVat.toFixed(2)}</div>
          </div>

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Total-P</h4>
            <div className={styles.totalAmount}>BWP {displayGrandTotal.toFixed(2)}</div>
          </div>
  
          <div className={styles.cashPaid}>
            <h4>Paid-P</h4>
            <div className={styles.paidAmount}>BWP {parseFloat(receipt.cash || '0').toFixed(2)}</div>
          </div>
  
          <div className={styles.balance}>
            <h4>Balance-P</h4>
            <div className={styles.balanceAmount}>BWP {parseFloat(receipt.change || '0').toFixed(2)}</div>
          </div>
        </div>
  
        <div className={styles.security}>
          <h4>RefNo.{receipt.receiptsNumber || receipt._id?.substring(0, 8) || '123356'}</h4>
          <h4>Seller: {getSellerName()}</h4>
        </div>
        
        <div className={styles.footer}>
          <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
          <p className={styles.thankYou}>Thank you for your business!</p>
        </div>
      </div>
    );
  };

  // SMS Handler
  const handleSMSModalSubmit = async (phoneNumber: string) => {
    try {
      const token = localStorage.getItem('token');
      const htmlContent = getReceiptHTML();
      if (!htmlContent) throw new Error("No receipts data available");

      const response = await fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/sms-receipt`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber,
          receiptsNumber: receipt?.receiptsNumber,
          sellerName: getSellerName(),
          inputs: receipt?.inputs || [],
          subtotal: displaySubtotal,
          discountValue: receipt?.discountValue,
          discountName: receipt?.discountName,
          discountType: receipt?.discountType,
          vatAmount: displayVat,
          grandTotal: displayGrandTotal,
          cash: receipt?.cash,
          change: receipt?.change,
          date: receipt?.date || receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: profileData?.nameOfBusiness,
            place: businessData?.place,
            businessNature: businessData?.businessNature,
            businessPhone: profileData?.businessPhone,
            emailBusiness: profileData?.emailBusiness,
            profilePicture: profileData?.profilePicture
          }
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Receipt PDF created and SMS sent successfully!');
      } else {
        toast.error(data.message || 'Failed to send SMS.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while sending SMS.');
    } finally {
      setIsSMSModalOpen(false);
    }
  };

  const handleSMSModalClose = () => setIsSMSModalOpen(false);

  // WHATSAPP HANDLER - OPTIMIZED FOR SANDBOX
  const handleWhatsAppModalSubmit = async (whatsappNumber: string) => {
    try {
      const token = localStorage.getItem('token');
      const htmlContent = getReceiptHTML();
      if (!htmlContent) throw new Error("No receipts data available");

      // Clean number
      let cleanNumber = whatsappNumber.trim().replace(/\s+/g, '');
      if (!cleanNumber.startsWith('+')) {
        cleanNumber = `+${cleanNumber}`;
      }

      const response = await fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/whatsapp-receipt`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappNumber: cleanNumber,
          receiptsNumber: receipt?.receiptsNumber,
          sellerName: getSellerName(),
          inputs: receipt?.inputs || [],
          subtotal: displaySubtotal,
          discountValue: receipt?.discountValue,
          discountName: receipt?.discountName,
          discountType: receipt?.discountType,
          vatAmount: displayVat,
          grandTotal: displayGrandTotal,
          cash: receipt?.cash,
          change: receipt?.change,
          date: receipt?.date || receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: profileData?.nameOfBusiness,
            place: businessData?.place,
            businessNature: businessData?.businessNature,
            businessPhone: profileData?.businessPhone,
            emailBusiness: profileData?.emailBusiness,
            profilePicture: profileData?.profilePicture
          }
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Receipt PDF sent successfully via WhatsApp Sandbox!');
      } else {
        toast.error(data.error || data.message || 'Failed to send WhatsApp receipt.');
      }
    } catch (error: any) {
      console.error('WhatsApp Error:', error);
      toast.error('Failed to send WhatsApp receipt. Please check console.');
    } finally {
      setIsWhatsAppModalOpen(false);
    }
  };
const handleEmailModalSubmit = async (customerEmail: string) => {
    try {
      const token=localStorage.getItem('token')
      const htmlContent = getReceiptHTML();
      if (!htmlContent) throw new Error("No receipt content available");

      const response = await fetch(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/email-receipt`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          email: customerEmail,
          receiptsNumber: receipt?.receiptsNumber,
          inputs: receipt?.inputs || [],
          subtotal: displaySubtotal,
          vatAmount: displayVat,
          grandTotal: displayGrandTotal,
          discountValue: receipt?.discountValue || 0,
          discountName: receipt?.discountName,
          discountType: receipt?.discountType,
          cash: receipt?.cash,
          change: receipt?.change,
          date: receipt?.date || receipt?.createdAt,
          htmlContent,
          companyInfo: {
            nameOfBusiness: profileData?.nameOfBusiness,
            place: businessData?.place,
            businessNature: businessData?.businessNature,
            businessPhone: profileData?.businessPhone,
            emailBusiness: profileData?.emailBusiness,
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Receipt sent successfully to ${customerEmail}`);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Email Error:', error);
      toast.error('Failed to send email receipt');
    }
  };

  const handleEmailButtonClick = () => {
    setIsEmailModalOpen(true);
  };
  const handleWhatsappmodalclose = () => {
    setIsWhatsAppModalOpen(false);
  };

  // Render States
  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading receipt...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p>Error: {error}</p>
      <button onClick={() => window.location.reload()} className={styles.retryButton}>
        Try Again
      </button>
    </div>
  );
  
  if (!receipt) return (
    <div className={styles.noDataContainer}>
      <p>No receipt data available.</p>
      <button onClick={() => window.location.reload()} className={styles.retryButton}>
        Refresh
      </button>
    </div>
  );

  return (
    <div className={styles.cover}>
      <div className={styles.wrapper}>
        <div className={styles.addressPlusLogo}>
          <img src={profileData?.profilePicture} alt="TeX-Technology logo" className={styles.logo} />
          <AddressSection />
        </div>

        <div className={styles.receiptHeader}>
          <h3>SALES RECEIPT</h3>
          {(receipt.date || receipt.createdAt) && (
            <h4>Date: {new Date(receipt.date || receipt.createdAt!).toLocaleDateString()}</h4>
          )}
          {receiverName && <h4>Receiver: {receiverName}</h4>}
        </div>
  
        <div className={styles.items}>
          <h4>Product</h4>
          <h4>Qty</h4>
          <h4>Price(P)</h4>
          <h4>Unit</h4>
        </div>
  
        {receipt.inputs && receipt.inputs.length > 0 ? (
          <div className={styles.itemsContainer}>
            {receipt.inputs.map((item, index) => (
              <div key={item._id || `item-${index}`} className={styles.contentsOfReceipts}>
                <div className={styles.productName}>{item.field3}</div>
                <div className={styles.quantity}>{item.field1}</div>
                <div className={styles.unit}>{typeof item.field2 === 'number' ? item.field2.toFixed(2) : item.field2}</div>
                <div className={styles.price}>{item.field4 === 'na' ? '-' : item.field4}</div>
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
            <div className={styles.totalAmount}>BWP {displaySubtotal.toFixed(2)}</div>
          </div>

          {hasDiscount && (
            <div className={styles.total}>
              <h4 className={styles.totalHeader}>Discount ({receipt.discountName || ''})-P</h4>
              <div className={styles.totalAmount}>-BWP {receipt.discountValue?.toFixed(2)}</div>
            </div>
          )}

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>VAT (14%)-P</h4>
            <div className={styles.totalAmount}>BWP {displayVat.toFixed(2)}</div>
          </div>

          <div className={styles.total}>
            <h4 className={styles.totalHeader}>Total-P</h4>
            <div className={styles.totalAmount}>BWP {displayGrandTotal.toFixed(2)}</div>
          </div>
  
          <div className={styles.cashPaid}>
            <h4>Paid-P</h4>
            <div className={styles.paidAmount}>BWP {parseFloat(receipt.cash || '0').toFixed(2)}</div>
          </div>
  
          <div className={styles.balance}>
            <h4>Balance-P</h4>
            <div className={styles.balanceAmount}>BWP {parseFloat(receipt.change || '0').toFixed(2)}</div>
          </div>
        </div>
  
        <div className={styles.security}>
          <h4>RefNo.{receipt.receiptsNumber || receipt._id?.substring(0, 8) || '123356'}</h4>
          <h4>Seller: {getSellerName()}</h4>
        </div>
        
        <div className={styles.footer}>
          <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
          <p className={styles.thankYou}>Thank you for your business!</p>
        </div>
  
        <div className={styles.actions}>
          <button className={styles.smsButton} onClick={handleSendSMS}>Send SMS</button>
          <button className={styles.appButton} onClick={handleSendWhatsApp}>Whatsapp</button>
          <button className={styles.smsButton} onClick={handleQRCode}>Scan QR code</button>
   <button className={styles.printButton} onClick={handleEmailButtonClick}>Email</button>
        </div>
      </div>

      <ReceiverModal
        isOpen={isReceiverModalOpen}
        onClose={handleReceiverModalClose}
        onSubmit={handleReceiverModalSubmit}
      />
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleEmailModalSubmit}
      />
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={handleWhatsappmodalclose}
        onSubmit={handleWhatsAppModalSubmit}
      />
      <SMSModal
        isOpen={isSMSModalOpen}
        onClose={handleSMSModalClose}
        onSubmit={handleSMSModalSubmit}
      />

      {/* QR Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onRequestClose={closeQRModal}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: '800px',
            padding: '20px',
            borderRadius: '8px',
          },
        }}
      >
        <h2>QR Code Scanner & Viewer</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {qrCodeData && (
            <div style={{ textAlign: 'center' }}>
              <h3>Scan this QR code with your mobile device</h3>
              <img src={qrCodeData.qrCodeBase64} alt="QR Code for PDF" style={{ width: '200px', height: '200px', margin: '10px 0' }} />
              <a href={qrCodeData.downloadUrl} download="receipt.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>
                Direct Download PDF
              </a>
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
              <a href={scannedUrl} download="receipt.pdf" style={{ display: 'block', marginTop: '10px', color: '#007bff' }}>
                Download Scanned PDF
              </a>
            </div>
          )}

          <button onClick={closeQRModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Receipt;