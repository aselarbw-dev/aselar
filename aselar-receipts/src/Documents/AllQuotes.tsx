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
import styles from './AllQuotes.module.css'; // Assume a similar CSS module for quotes

interface QuoteItem {
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

interface QuoteData {
  _id: string;
  data: QuoteItem[];
  totalSum: string;
  subtotal: string;
  vat: string;
  date?: string;
  createdAt?: string;
  company?: Company;
  refNo?: string;
  seller?: string;
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
  quoteId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  quoteId,
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
          <p>Are you sure you want to delete this quote?</p>
          <p className={styles.quoteId}>Quote ID: {quoteId.slice(-8)}</p>
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
                <span>Delete Quote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AllQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalQuotes, setTotalQuotes] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    quoteId: string;
    quoteName: string;
  }>({
    isOpen: false,
    quoteId: '',
    quoteName: ''
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
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/get-all-quotes`, {
        withCredentials: true,
      });
      
      console.log('Fetched quotes data:', response.data); // Debug log
      setQuotes(response.data.quotes || response.data);
      setTotalQuotes(response.data?.length || 0);
    } catch (error: any) {
      console.error('Fetch quotes error:', error);
      // Handle 404 gracefully (no quotes) - no toast for empty state
      if (error.response?.status === 404) {
        console.log('No quotes found (404) - treating as empty');
        setQuotes([]);
        setTotalQuotes(0);
      } else {
        toast.error('Failed to fetch quotes');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportQuoteToPDF = (quote: QuoteData, profile: ProfileData | null, business: BusinessData | null) => {
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
    
    // Quote Header
    doc.setFontSize(18);
    doc.text('QUOTATION', 105, 70, { align: 'center' });
    const quoteDate = quote.date || quote.createdAt;
    if (quoteDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(quoteDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Quote ID: ${quote._id.slice(-6)}`, 105, 85, { align: 'center' });
    
    // Items Table
    doc.setFontSize(14);
    doc.text('Product', 14, 100);
    doc.text('Qty', 80, 100);
    doc.text('Price (P)', 100, 100);
    doc.text('Unit', 140, 100);
    
    let yPosition = 105;
    quote.data?.forEach((item) => {
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
    doc.text(`Total-P: BWP ${parseFloat(quote.totalSum || '0').toFixed(2)}`, 140, yPosition, { align: 'right' });
    
    // Security
    //${quote._id.slice(-6)}`
    yPosition += 10;
    doc.text(`RefNo: ${quote.refNo || quote._id.slice(6)}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Seller: ${quote.seller || profile?.nameOfBusiness || 'Jb-1671'}`, 14, yPosition);
    
    // Footer
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `Quote_${quote._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handleDownload = (index: number) => {
    const quote = quotes[index];
    if (!quote || !profileData || !businessData) {
      toast.error('Missing quote or business data');
      return;
    }
    
    exportQuoteToPDF(quote, profileData, businessData);
    toast.success('PDF downloaded!');
  };

  const openDeleteModal = (quoteId: string, quoteName: string) => {
    setDeleteModal({
      isOpen: true,
      quoteId,
      quoteName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      quoteId: '',
      quoteName: ''
    });
  };

  const handleDelete = async () => {
    const { quoteId } = deleteModal;
    setDeletingId(quoteId);
    
    try {
      await axios.delete(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}/api/quotes/${quoteId}`, {
        withCredentials: true,
      });
      toast.success('Quote deleted successfully!');
      fetchQuotes();
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete quote: ${error.response?.data?.message || error.message}`);
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

  const formatFileSize = (quote: QuoteData) => {
    const itemCount = quote.data?.length || 0;
    const baseSize = 2.5;
    const itemSize = itemCount * 0.3;
    return `${(baseSize + itemSize).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your quotes...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Quote Manager</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalQuotes}</span>
              <span className={styles.statLabel}>Total Quotes</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/quote">
            <button className={styles.buttonQuote}>New Quote</button>
          </Link>
          <Link to="/quotation-template">
            <button className={styles.buttonRecent}>Recent Quote</button>
          </Link>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>📝</div>
          <h3>No quotes found</h3>
          <p>You haven't created any quotes yet.</p>
          <Link to="/quick-quote">
            <button className={styles.createButton}>Create Your First Quote</button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.quotesGrid}>
            {quotes.map((quote, index) => (
              <div key={quote._id} className={styles.quoteCard}>
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

                    <div className={styles.quoteHeader}>
                      <h3>QUOTE</h3>
                      {quote.date && (
                        <h4>Date: {formatDate(quote.date)}</h4>
                      )}
                      <h4>Quote ID: {quote._id.slice(-6)}</h4>
                    </div>
            
                    <div className={styles.items}>
                      <h4>Product</h4>
                      <h4>Qty</h4>
                      <h4>Price(P)</h4>
                      <h4>Unit</h4>
                    </div>
            
                    {quote.data && quote.data.length > 0 ? (
                      <div className={styles.itemsContainer}>
                        {quote.data.map((item, itemIndex) => (
                          <div key={item._id || `item-${itemIndex}`} className={styles.contentsOfQuotes}>
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
                        <div className={styles.totalAmount}>BWP {quote.subtotal || '0'}</div>
                      </div>
                    <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Vat-P</h4>
                        <div className={styles.totalAmount}>BWP {quote.vat || '0'}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Total-P</h4>
                        <div className={styles.totalAmount}>BWP {quote.totalSum || '0'}</div>
                      </div>
                    </div>
            
                    <div className={styles.security}>
                      <h4>Ref: {quote.refNo ||quote._id.slice(5)}</h4>
                      <h4>Seller: {quote.seller || profileData?.nameOfBusiness || 'Jb-1671'}</h4>
                    </div>
                    
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Quote {quote._id.slice(-8)}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(quote)}</span>
                    <span className={styles.cardDate}>{formatDate(quote.createdAt || quote.date)}</span>
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
                    onClick={() => openDeleteModal(quote._id, `Quote ${quote._id.slice(-8)}`)}
                    disabled={!!deletingId}
                    title="Delete Quote"
                  >
                    {deletingId === quote._id ? (
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
        quoteId={deleteModal.quoteId}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default AllQuotes;