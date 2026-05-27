// DebtCollectionTemplate.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import styles from './DebtCollectionTemplate.module.css';
import { toast } from "react-toastify";
import Modal from 'react-modal';
import jsQR from 'jsqr';
import beep from "../assets/beep-329314.mp3"; // Adjust path as needed
import SMSModal from '../Templates/SMSModal'; // Reuse from receipt
import WhatsAppModal from '../Templates/WhatsAppModal'; // Reuse from receipt

interface DebtNoteData {
  _id: string;
  fullName: string;
  location: string;
  amount: number;
  issuersName: string;
  message: string;
  debtNoteNumber: string;
  user: string;
  date?: string;
  createdAt: string;
  __v: number;
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

const DebtCollectionTemplate: React.FC = () => {
  const [debtNote, setDebtNote] = useState<DebtNoteData | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [qrCodeData, setQRCodeData] = useState<{ qrCodeBase64: string; downloadUrl: string } | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null); // For PDF download
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let animationFrameId: number;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        const [debtNoteResponse, businessResponse, profileResponse] = await Promise.all([
          fetch('http://localhost:5012/api/recent-debt', { credentials: "include" }), // Your endpoint
          fetch('/api/get-business', { headers: { 'Content-Type': 'application/json' }, credentials: "include" }),
          fetch('/api/profile', { headers: { 'Content-Type': 'application/json' }, credentials: "include" })
        ]);

        if (!debtNoteResponse.ok) {
          throw new Error(`Failed to fetch debt note: ${debtNoteResponse.statusText}`);
        }
    
        const debtNoteRaw = await debtNoteResponse.json();
        console.log('Raw debt note data:', debtNoteRaw); // ← ADDED: Debug log to check structure
        
        // ← FIXED: Handle if response is wrapped (e.g., { success: true, data: {...} })
        const debtNoteData = debtNoteRaw.data || debtNoteRaw;
        
        // ← FIXED: More flexible validation (check for key presence, not strict fullName)
        if (debtNoteData && debtNoteData._id && (debtNoteData.fullName || debtNoteData.debtorFullName)) {
          // Map if different key names (e.g., if backend uses debtorFullName)
          setDebtNote({
            ...debtNoteData,
            fullName: debtNoteData.fullName || debtNoteData.debtorFullName || '',
            issuersName: debtNoteData.issuersName || debtNoteData.issuerName || ''
          });
        } else {
          console.error('Invalid debt note structure:', debtNoteData); // ← ADDED: Log invalid data
          setError('Invalid debt note data structure - missing required fields');
        }

        if (businessResponse.ok) {
          setBusinessData(await businessResponse.json());
        }
        if (profileResponse.ok) {
          setProfileData(await profileResponse.json());
        }

      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  // QR Scanner (mirrors receipt)
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
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
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
          beepSound.play().catch(console.error);
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
      if (!htmlContent) throw new Error('No debt note content');

      const requestData = {
        debtNoteNumber: debtNote?.debtNoteNumber,
        fullName: debtNote?.fullName,
        location: debtNote?.location,
        amount: debtNote?.amount,
        issuersName: debtNote?.issuersName,
        message: debtNote?.message,
        createdAt: debtNote?.createdAt,
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

      const response = await fetch('http://localhost:5012/api/generate-qr-debt', { // ← FIXED: Port to 5012 for debt server
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
        throw new Error(res.error || 'Failed to generate QR');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const closeQRModal = () => {
    setIsQRModalOpen(false);
    setScannedUrl(null);
    setQRCodeData(null);
    stopQRScanner();
  };

  const handleSendSMS = () => setIsSMSModalOpen(true);
  const handleSendWhatsApp = () => setIsWhatsAppModalOpen(true);

  const handleSMSModalSubmit = async (phoneNumber: string) => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error("No debt note data");

      const response = await fetch('http://localhost:5012/api/sms-debt', { // ← FIXED: Port to 5012
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          debtNoteNumber: debtNote?.debtNoteNumber,
          fullName: debtNote?.fullName,
          location: debtNote?.location,
          amount: debtNote?.amount,
          issuersName: debtNote?.issuersName,
          message: debtNote?.message,
          createdAt: debtNote?.createdAt,
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
        toast.success('Debt note PDF created and SMS sent successfully!');
      } else {
        toast.error(data.message || 'Failed to send SMS.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error processing SMS.');
    } finally {
      setIsSMSModalOpen(false);
    }
  };

  const handleWhatsAppModalSubmit = async (phoneNumber: string) => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error("No debt note data");

      const response = await fetch('http://localhost:5012/api/whatsapp-debt-note', { // ← FIXED: Port to 5012
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          debtNoteNumber: debtNote?.debtNoteNumber,
          fullName: debtNote?.fullName,
          location: debtNote?.location,
          amount: debtNote?.amount,
          issuersName: debtNote?.issuersName,
          message: debtNote?.message,
          createdAt: debtNote?.createdAt,
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
        toast.success('Debt note PDF created and WhatsApp sent successfully!');
      } else {
        toast.error(data.message || 'Failed to send WhatsApp.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error processing WhatsApp.');
    } finally {
      setIsWhatsAppModalOpen(false);
    }
  };

  // NEW: Handle PDF Download (mirrors QR but no QR, just upload URL)
  const handleDownloadPDF = async () => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error('No debt note content');

      const requestData = {
        debtNoteNumber: debtNote?.debtNoteNumber,
        fullName: debtNote?.fullName,
        location: debtNote?.location,
        amount: debtNote?.amount,
        issuersName: debtNote?.issuersName,
        message: debtNote?.message,
        createdAt: debtNote?.createdAt,
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

      const response = await fetch('http://localhost:5012/api/download-debt-note-pdf', { // ← FIXED: Port to 5012
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();
      if (res.success) {
        setDownloadUrl(res.data.downloadUrl);
        const link = document.createElement('a');
        link.href = res.data.downloadUrl;
        link.download = `debt-note-${debtNote?.debtNoteNumber}.pdf`;
        link.click();
        toast.success('PDF downloaded successfully!');
      } else {
        throw new Error(res.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const generateHTMLContent = () => {
    if (!debtNote) return '';

    return ReactDOMServer.renderToString(
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src={profileData?.profilePicture || ''} alt="logo" className={styles.logo} />
          </div>
          <div className={styles.companyInfo}>
            <div>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</div>
            <div>{profileData?.emailBusiness || ''}</div>
            <div>{profileData?.businessPhone || ''}</div>
          </div>
        </div>

        <div className={styles.content}>
          <h1 className={styles.title}>DEBT COLLECTION NOTE</h1>
          <div className={styles.date}>Date: {new Date(debtNote.date || debtNote.createdAt).toLocaleDateString()}</div>

          <div className={styles.detailsSection}>
            <table className={styles.detailsTable}>
              <tbody>
                <tr>
                  <td className={styles.label}>Debtor Full Name</td>
                  <td className={styles.value}>{debtNote.fullName}</td>
                </tr>
                <tr>
                  <td className={styles.label}>Location</td>
                  <td className={styles.value}>{debtNote.location}</td>
                </tr>
                <tr>
                  <td className={styles.label}>Amount Owed (KSh)</td>
                  <td className={styles.value}>{debtNote.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className={styles.label}>Issuer Name</td>
                  <td className={styles.value}>{debtNote.issuersName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.messageSection}>
            <div className={styles.label}>Message to Client</div>
            <div className={styles.message}>{debtNote.message}</div>
          </div>

          <div className={styles.footerSection}>
            <div className={styles.refNo}>Ref No: {debtNote.debtNoteNumber}</div>
            <div className={styles.seller}>Issuer: {debtNote.issuersName}</div>
          </div>
        </div>

        <div className={styles.footer}>
          <div>Powered by Asela, a TEX product</div>
          <div className={styles.thanks}>Thank you for your prompt payment!</div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <p>Loading debt collection note...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorContainer}>
      <p>Error: {error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  
  if (!debtNote) return (
    <div className={styles.noDataContainer}>
      <p>No debt collection note available.</p>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>
<img src={profileData?.profilePicture || ''} alt="" className={styles.logo} />

        </div>
        <div className={styles.companyInfo}>
          <div>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</div>
          <div>{profileData?.emailBusiness || ''}</div>
          <div>{profileData?.businessPhone || ''}</div>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>DEBT COLLECTION NOTE</h1>
        <div className={styles.date}>Date: {new Date(debtNote.date || debtNote.createdAt).toLocaleDateString()}</div>

        <div className={styles.detailsSection}>
          <table className={styles.detailsTable}>
            <tbody>
              <tr>
                <td className={styles.label}>Debtor Full Name</td>
                <td className={styles.value}>{debtNote.fullName}</td>
              </tr>
              <tr>
                <td className={styles.label}>Location</td>
                <td className={styles.value}>{debtNote.location}</td>
              </tr>
              <tr>
                <td className={styles.label}>Amount Owed (KSh)</td>
                <td className={styles.value}>{debtNote.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className={styles.label}>Issuer Name</td>
                <td className={styles.value}>{debtNote.issuersName}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.messageSection}>
          <div className={styles.label}>Message to Client</div>
          <div className={styles.message}>{debtNote.message}</div>
        </div>

        <div className={styles.footerSection}>
          <div className={styles.refNo}>Ref No: {debtNote.debtNoteNumber}</div>
          <div className={styles.seller}>Issuer: {debtNote.issuersName}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <div>Powered by Asela, a TEX product</div>
        <div className={styles.thanks}>Thank you for your prompt payment!</div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.smsButton} onClick={handleSendSMS}>SMS</button>
        <button className={styles.whatsappButton} onClick={handleSendWhatsApp}>WhatsApp</button>
        <button className={styles.qrButton} onClick={handleQRCode}>QR Code</button>
        <button className={styles.downloadButton} onClick={handleDownloadPDF}>Download PDF</button>
      </div>

      <SMSModal
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onSubmit={handleSMSModalSubmit}
      />
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSubmit={handleWhatsAppModalSubmit}
      />
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
              <img
                src={qrCodeData.qrCodeBase64}
                alt="QR Code for PDF"
                style={{ width: '200px', height: '200px', margin: '10px 0' }}
              />
              <a
                href={qrCodeData.downloadUrl}
                download="debt-note.pdf"
                style={{ display: 'block', marginTop: '10px', color: '#007bff' }}
              >
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
              <embed
                src={scannedUrl}
                type="application/pdf"
                width="100%"
                height="400px"
                style={{ border: '1px solid #ccc', marginTop: '10px' }}
              />
              <a
                href={scannedUrl}
                download="debt-note.pdf"
                style={{ display: 'block', marginTop: '10px', color: '#007bff' }}
              >
                Download Scanned PDF
              </a>
            </div>
          )}
{downloadUrl && (
              <a
                href={downloadUrl}
                download="debt-note.pdf"
                style={{ display: 'block', marginTop: '10px', color: '#007bff' }}
              >
                Download PDF
              </a>
            ) }

          <button
            onClick={closeQRModal}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DebtCollectionTemplate;