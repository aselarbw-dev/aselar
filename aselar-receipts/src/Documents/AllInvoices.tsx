import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrash,
  faTimes,
  faExclamationTriangle,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from './AllInvoices.module.css'; // Assume a similar CSS module for invoices

interface InvoiceItem {
  field1: string;
  field2: string;
  field3: number;
  field4: number;
  _id: string;
}

interface Company {
  name: string;
  logo: string;
  address1: string;
  address2: string;
  email: string;
  location: string;
}

interface InvoiceData {
  _id: string;
  fields: InvoiceItem[];
  totalSum: string;
  addition: string;
  vat: string;
  date?: string;
  createdAt?: string;
  dueDate?: string;
  status?: string;
  customerName?: string;
  company?: Company;
  refNo?: string;
  seller?: string;
  invoiceNumber?: string;
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

interface DeleteModalProps {
  isOpen: boolean;
  invoiceId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  invoiceId,
  onConfirm,
  onCancel,
  isDeleting
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.warningIcon} />
          <h3>Confirm Deletion</h3>
          <button className={styles.closeButton} onClick={onCancel}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this invoice?</p>
          <p className={styles.invoiceId}>Invoice ID: {invoiceId.slice(-8)}</p>
          <p className={styles.warningText}>This action cannot be undone.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <ClipLoader size={16} color="#fff" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} />
                <span>Delete Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AllInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceName: string;
  }>({
    isOpen: false,
    invoiceId: '',
    invoiceName: ''
  });

  // Fetch business and profile data once on mount
  useEffect(() => {
    const fetchBusinessAndProfile = async () => {
      try {
        const [businessResponse, profileResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/get-business`, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }),
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/profile`, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          })
        ]);

        setBusinessData(businessResponse.data);
        setProfileData(profileResponse.data);
      } catch (error) {
        console.error('Failed to fetch business/profile data:', error);
        toast.error('Failed to load business information');
      }
    };

    fetchBusinessAndProfile();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5004/api/get-invoices', {
        withCredentials: true,
      });
      
      console.log('Fetched invoices data:', response.data); // Debug log
      setInvoices(response.data.invoices || response.data);
      setTotalInvoices(response.data?.length || 0);
    } catch (error: any) {
      console.error('Fetch invoices error:', error);
      // Handle 404 gracefully (no invoices) - no toast for empty state
      if (error.response?.status === 404) {
        console.log('No invoices found (404) - treating as empty');
        setInvoices([]);
        setTotalInvoices(0);
      } else {
        toast.error('Failed to fetch invoices');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportInvoiceToPDF = (invoice: InvoiceData, profile: ProfileData | null, business: BusinessData | null) => {
    const doc = new jsPDF();
    
    // Company Header
    const companyName = profile?.nameOfBusiness || 'TeX-Technology Extreme';
    const logoUrl = profile?.profilePicture || '/default-logo.png';
    const address1 = business?.place || 'Plot 1234';
    const address2 = business?.businessDescription || 'Box 3456, Phakalane';
    const email = profile?.emailBusiness || 'tex@robotics.bw';
    const location = business?.businessNature || 'Fair Grounds';
    
    // Add logo if available (fetch and add as base64)
    if (logoUrl && logoUrl !== '/default-logo.png') {
      // For simplicity, assume logo is accessible; in production, fetch as base64
      doc.addImage(logoUrl, 'PNG', 14, 20, 30, 30);
    }
    
    doc.setFontSize(16);
    doc.text(companyName, 50, 25);
    doc.setFontSize(10);
    doc.text(address1, 50, 35);
    doc.text(address2, 50, 40);
    doc.text(email, 50, 45);
    doc.text(location, 50, 50);
    
    // Invoice Header
    doc.setFontSize(18);
    doc.text('INVOICE', 105, 70, { align: 'center' });
    const invoiceDate = invoice.date || invoice.createdAt;
    if (invoiceDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(invoiceDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Invoice #: ${invoice.invoiceNumber || invoice._id.slice(-6)}`, 105, 85, { align: 'center' });
    if (invoice.dueDate) {
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 105, 90, { align: 'center' });
    }
    if (invoice.status) {
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 105, 95, { align: 'center' });
    }
    if (invoice.customerName) {
      doc.text(`Customer: ${invoice.customerName}`, 14, 100);
    }
    
    // Items Table
    let yPosition = 110;
    doc.setFontSize(14);
    doc.text('Product', 14, yPosition);
    doc.text('Qty', 80, yPosition);
    doc.text('Price (P)', 100, yPosition);
    doc.text('Unit', 140, yPosition);
    
    yPosition += 5;
    invoice.fields?.forEach((item) => {
      doc.setFontSize(10);
      doc.text(item.field3.toString(), 14, yPosition);
      doc.text(item.field1, 80, yPosition);
      doc.text(item.field4.toFixed(2), 100, yPosition);
      doc.text(item.field2, 140, yPosition);
      yPosition += 7;
    });
    
    // Totals Section
    const totalY = yPosition + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, totalY - 2, 195, totalY - 2); // Divider line
    
    yPosition = totalY + 5;
    doc.setFontSize(12);
    doc.text(`Subtotal: BWP ${parseFloat(invoice.addition || '0').toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`VAT: BWP ${parseFloat(invoice.vat || '0').toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Total: BWP ${parseFloat(invoice.totalSum || '0').toFixed(2)}`, 100, yPosition, { align: 'right' });
    
    // Security
    yPosition += 10;
    doc.text(`Ref: ${invoice.invoiceNumber || invoice._id.slice(-6)}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Seller: ${invoice.seller || profile?.nameOfBusiness || 'Jb-1671'}`, 14, yPosition);
    
    // Footer
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `Invoice_${invoice.invoiceNumber || invoice._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handleDownload = (index: number) => {
    const invoice = invoices[index];
    if (!invoice || !profileData || !businessData) {
      toast.error('Missing invoice or business data');
      return;
    }
    
    exportInvoiceToPDF(invoice, profileData, businessData);
    toast.success('PDF downloaded!');
  };

  const openDeleteModal = (invoiceId: string, invoiceName: string) => {
    setDeleteModal({
      isOpen: true,
      invoiceId,
      invoiceName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      invoiceId: '',
      invoiceName: ''
    });
  };

  const handleDelete = async () => {
    const { invoiceId } = deleteModal;
    setDeletingId(invoiceId);
    
    try {
      await axios.delete(`http://localhost:5004/api/invoices/${invoiceId}`, {
        withCredentials: true,
      });
      toast.success('Invoice deleted successfully!');
      fetchInvoices();
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete invoice: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (invoice: InvoiceData) => {
    const itemCount = invoice.fields?.length || 0;
    const baseSize = 2.5;
    const itemSize = itemCount * 0.3;
    return `${(baseSize + itemSize).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your invoices...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Invoice Manager</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalInvoices}</span>
              <span className={styles.statLabel}>Total Invoices</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/invoice">
            <button className={styles.buttonInvoice}>New Invoice</button>
          </Link>
          <Link to="/invoice-template">
            <button className={styles.buttonRecent}>Recent Invoice</button>
          </Link>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>📄</div>
          <h3>No invoices found</h3>
          <p>You haven't created any invoices yet.</p>
          <Link to="/quick-invoice">
            <button className={styles.createButton}>Create Your First Invoice</button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.invoicesGrid}>
            {invoices.map((invoice, index) => (
              <div key={invoice._id} className={styles.invoiceCard}>
                <div className={styles.cardPreview}>
                  <div className={styles.wrapper}>
                    <div className={styles.addressPlusLogo}>
                      <img src={profileData?.profilePicture || '/default-logo.png'} alt={`${profileData?.nameOfBusiness || 'Company'} logo`} className={styles.logo} />
                      <div className={styles.text}>
                        <h4>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</h4>
                        <h4>{businessData?.place || 'Plot 1234'}</h4>
                        <h4>{businessData?.businessDescription || 'Box 3456, Phakalane'}</h4>
                        <h4>{profileData?.emailBusiness || 'tex@robotics.bw'}</h4>
                        <h4>{businessData?.businessNature || 'Fair Grounds'}</h4>
                      </div>
                    </div>

                    <div className={styles.invoiceHeader}>
                      <h3>INVOICE</h3>
                      {invoice.date && (
                        <h4>Date: {formatDate(invoice.date)}</h4>
                      )}
                      {invoice.dueDate && (
                        <h4>Due: {formatDate(invoice.dueDate)}</h4>
                      )}
                      {invoice.status && (
                        <h4 className={styles.statusText}>Status: {invoice.status.toUpperCase()}</h4>
                      )}
                      <h4>Invoice ID: {invoice.invoiceNumber || invoice._id.slice(-6)}</h4>
                    </div>
            
                    <div className={styles.items}>
                      <h4>Product</h4>
                      <h4>Qty</h4>
                      <h4>Price(P)</h4>
                      <h4>Unit</h4>
                    </div>
            
                    {invoice.fields && invoice.fields.length > 0 ? (
                      <div className={styles.itemsContainer}>
                        {invoice.fields.map((item, itemIndex) => (
                          <div key={item._id || `item-${itemIndex}`} className={styles.contentsOfInvoices}>
                            <div className={styles.productName}>{item.field3}</div>
                            <div className={styles.quantity}>{item.field1}</div>
                            <div className={styles.unit}>{item.field2}</div>
                            <div className={styles.price}>{item.field4}</div>
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
                        <div className={styles.totalAmount}>BWP {invoice.addition || '0'}</div>
                      </div>
                    <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Vat-P</h4>
                        <div className={styles.totalAmount}>BWP {invoice.vat || '0'}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Total-P</h4>
                        <div className={styles.totalAmount}>BWP {invoice.totalSum || '0'}</div>
                      </div>
                    </div>
            
                    <div className={styles.security}>
                      <h4>Ref: {invoice.invoiceNumber || invoice._id.slice(-6)}</h4>
                      <h4>Seller: {invoice.seller || profileData?.nameOfBusiness || 'Jb-1671'}</h4>
                    </div>
                    
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Invoice {invoice.invoiceNumber || invoice._id.slice(-8)}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(invoice)}</span>
                    <span className={styles.cardDate}>{formatDate(invoice.createdAt || invoice.date)}</span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={() => handleDownload(index)}
                    title="Download PDF"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => openDeleteModal(invoice._id, `Invoice ${invoice.invoiceNumber || invoice._id.slice(-8)}`)}
                    disabled={!!deletingId}
                    title="Delete Invoice"
                  >
                    {deletingId === invoice._id ? (
                      <ClipLoader size={16} color="#fff" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        invoiceId={deleteModal.invoiceId}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default AllInvoices;