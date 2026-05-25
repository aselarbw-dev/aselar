// PayslipTemplate.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import styles from './PayslipTemplate.module.css';
import { toast } from "react-toastify";
import Modal from 'react-modal';
import jsQR from 'jsqr';
import beep from "../assets/beep-329314.mp3"; // Adjust path as needed
import SMSModal from '../Templates/SMSModal'; // Reuse from receipt
import WhatsAppModal from '../Templates/WhatsAppModal'; // Reuse from receipt

interface Deduction {
  label: string;
  amount: number;
}

interface Addition {
  label: string;
  amount: number;
}

interface PayslipData {
  _id: string;
  employeeName: string;
  employeeId: string;
  basicSalary: number;
  vat: number;
  deductions: Deduction[];
  additions: Addition[];
  balance: number;
  payslipNumber?: string;
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

const PayslipTemplate: React.FC = () => {
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
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
        
        const [payslipResponse, businessResponse, profileResponse] = await Promise.all([
          fetch('http://localhost:5002/api/latest-payslip', { credentials: "include" }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/get-business`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" }),
          fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/profile`, { headers: { 'Content-Type': 'application/json' }, credentials: "include" })
        ]);

        if (!payslipResponse.ok) {
          throw new Error(`Failed to fetch payslip: ${payslipResponse.statusText}`);
        }
    
        const payslipRaw = await payslipResponse.json();
        console.log('Raw payslip data:', payslipRaw); // Debug log to check structure
        console.log(downloadUrl)
        // Handle if response is wrapped (e.g., { success: true, data: {...} })
        const payslipData = payslipRaw.data || payslipRaw;
        
        // More flexible validation
        if (payslipData && payslipData._id && payslipData.employeeName) {
          setPayslip(payslipData);
        } else {
          console.error('Invalid payslip structure:', payslipData);
          setError('Invalid payslip data structure - missing required fields');
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
      if (!htmlContent) throw new Error('No payslip content');

      const requestData = {
        payslipNumber: payslip?.payslipNumber,
        employeeName: payslip?.employeeName,
        employeeId: payslip?.employeeId,
        basicSalary: payslip?.basicSalary,
        vat: payslip?.vat,
        deductions: payslip?.deductions,
        additions: payslip?.additions,
        balance: payslip?.balance,
        createdAt: payslip?.createdAt,
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

      const response = await fetch('http://localhost:5002/api/generate-qr-payslip', {
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
      if (!htmlContent) throw new Error("No payslip data");

      const response = await fetch('http://localhost:5002/api/sms-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          payslipNumber: payslip?.payslipNumber,
          employeeName: payslip?.employeeName,
          employeeId: payslip?.employeeId,
          basicSalary: payslip?.basicSalary,
          vat: payslip?.vat,
          deductions: payslip?.deductions,
          additions: payslip?.additions,
          balance: payslip?.balance,
          createdAt: payslip?.createdAt,
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
        toast.success('Payslip PDF created and SMS sent successfully!');
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
      if (!htmlContent) throw new Error("No payslip data");

      const response = await fetch('http://localhost:5002/api/whatsapp-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          payslipNumber: payslip?.payslipNumber,
          employeeName: payslip?.employeeName,
          employeeId: payslip?.employeeId,
          basicSalary: payslip?.basicSalary,
          vat: payslip?.vat,
          deductions: payslip?.deductions,
          additions: payslip?.additions,
          balance: payslip?.balance,
          createdAt: payslip?.createdAt,
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
        toast.success('Payslip PDF created and WhatsApp sent successfully!');
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

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    try {
      const htmlContent = generateHTMLContent();
      if (!htmlContent) throw new Error('No payslip content');

      const requestData = {
        payslipNumber: payslip?.payslipNumber,
        employeeName: payslip?.employeeName,
        employeeId: payslip?.employeeId,
        basicSalary: payslip?.basicSalary,
        vat: payslip?.vat,
        deductions: payslip?.deductions,
        additions: payslip?.additions,
        balance: payslip?.balance,
        createdAt: payslip?.createdAt,
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

      const response = await fetch('http://localhost:5002/api/download-payslip-pdf', {
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
        link.download = `payslip-${payslip?.payslipNumber || payslip?._id}.pdf`;
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
    if (!payslip) return '';

    const formatCurrency = (amount: number) => `BWP ${amount.toFixed(2)}`;
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return ReactDOMServer.renderToString(
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>TeX</div>
          <div className={styles.companyInfo}>
            <div>{profileData?.nameOfBusiness || 'TeX Industries'}</div>
            <div>{businessData?.place || 'Gaborone west phase 1, Gaborone, Botswana'}</div>
            <div>Phone: {profileData?.businessPhone || '+267 72150073'}</div>
          </div>
        </div>

        <div className={styles.content}>
          <h1 className={styles.title}>PAYSLIP</h1>
          <div className={styles.date}>Payment Date: {formatDate(payslip.date || payslip.createdAt)}</div>

          <div className={styles.employeeInfo}>
            <div>Employee Name: {payslip.employeeName}</div>
            <div>Employee ID: {payslip.employeeId}</div>
          </div>

          <div className={styles.salaryDetails}>
            <h3>Salary Details</h3>
            <div className={styles.detailRow}>
              <span>Basic Salary:</span>
              <span>{formatCurrency(payslip.basicSalary)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>VAT:</span>
              <span>{formatCurrency(payslip.vat)}</span>
            </div>
          </div>

          <div className={styles.deductionsAdditions}>
            <div className={styles.deductionsBox}>
              <strong>Deductions</strong>
              {payslip.deductions && payslip.deductions.length > 0 ? (
                payslip.deductions.map((deduction, index) => (
                  <div key={index} className={styles.deductionItem}>
                    {deduction.label}: {formatCurrency(deduction.amount)}
                  </div>
                ))
              ) : (
                <div className={styles.noItems}>No deductions</div>
              )}
            </div>
            <div className={styles.additionsBox}>
              <strong>Additions</strong>
              {payslip.additions && payslip.additions.length > 0 ? (
                payslip.additions.map((addition, index) => (
                  <div key={index} className={styles.additionItem}>
                    {addition.label}: {formatCurrency(addition.amount)}
                  </div>
                ))
              ) : (
                <div className={styles.noItems}>No additions</div>
              )}
            </div>
          </div>

          <div className={styles.netSalary}>
            <strong>Net Salary:</strong> {formatCurrency(payslip.balance)}
          </div>

          <div className={styles.note}>
            This is a computer-generated document. No signature required.
          </div>
        </div>

        <div className={styles.footer}>
          <div>Powered by Asela, a TEX product</div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <p>Loading payslip...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorContainer}>
      <p>Error: {error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  
  if (!payslip) return (
    <div className={styles.noDataContainer}>
      <p>No payslip available.</p>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );

  const formatCurrency = (amount: number) => `BWP ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>TeX</div>
        <div className={styles.companyInfo}>
          <div>{profileData?.nameOfBusiness || 'TeX Industries'}</div>
          <div>{businessData?.place || 'Gaborone west phase 1, Gaborone, Botswana'}</div>
          <div>Phone: {profileData?.businessPhone || '+267 72150073'}</div>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>PAYSLIP</h1>
        <div className={styles.date}>Payment Date: {formatDate(payslip.date || payslip.createdAt)}</div>

        <div className={styles.employeeInfo}>
          <div>Employee Name: {payslip.employeeName}</div>
          <div>Employee ID: {payslip.employeeId}</div>
        </div>

        <div className={styles.salaryDetails}>
          <h3>Salary Details</h3>
          <div className={styles.detailRow}>
            <span>Basic Salary:</span>
            <span>{formatCurrency(payslip.basicSalary)}</span>
          </div>
          <div className={styles.detailRow}>
            <span>VAT:</span>
            <span>{formatCurrency(payslip.vat)}</span>
          </div>
        </div>

        <div className={styles.deductionsAdditions}>
          <div className={styles.deductionsBox}>
            <strong>Deductions</strong>
            {payslip.deductions && payslip.deductions.length > 0 ? (
              payslip.deductions.map((deduction, index) => (
                <div key={index} className={styles.deductionItem}>
                  {deduction.label}: {formatCurrency(deduction.amount)}
                </div>
              ))
            ) : (
              <div className={styles.noItems}>No deductions</div>
            )}
          </div>
          <div className={styles.additionsBox}>
            <strong>Additions</strong>
            {payslip.additions && payslip.additions.length > 0 ? (
              payslip.additions.map((addition, index) => (
                <div key={index} className={styles.additionItem}>
                  {addition.label}: {formatCurrency(addition.amount)}
                </div>
              ))
            ) : (
              <div className={styles.noItems}>No additions</div>
            )}
          </div>
        </div>

        <div className={styles.netSalary}>
          <strong>Net Salary:</strong> {formatCurrency(payslip.balance)}
        </div>

        <div className={styles.note}>
          This is a computer-generated document. No signature required.
        </div>
      </div>

      <div className={styles.footer}>
        <div>Powered by Asela, a TEX product</div>
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
                download="payslip.pdf"
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
                download="payslip.pdf"
                style={{ display: 'block', marginTop: '10px', color: '#007bff' }}
              >
                Download Scanned PDF
              </a>
            </div>
          )}
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

export default PayslipTemplate;