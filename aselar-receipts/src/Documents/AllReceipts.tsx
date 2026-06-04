import React, { useState, useEffect, useRef} from 'react';
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
import styles from './AllReceipts.module.css';

interface ReceiptItem {
  field1: number;
  field2: number | string;
  field3: string;
  field4: string;
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

interface ReceiptData {
  _id: string;
  inputs: ReceiptItem[];
  grandTotal: string;
  change: string;
  cash: string;
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
  receiptId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  receiptId,
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
          <p>Are you sure you want to delete this receipt?</p>
          <p className={styles.receiptId}>Receipt ID: {receiptId.slice(-8)}</p>
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
                <span>Delete Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AllReceipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalReceipts, setTotalReceipts] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    receiptId: string;
    receiptName: string;
  }>({
    isOpen: false,
    receiptId: '',
    receiptName: ''
  });
  
  const receiptRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch business and profile data once on mount
  useEffect(() => {
    const fetchBusinessAndProfile = async () => {
      try {
        const token=localStorage.getItem('token');
        const [businessResponse, profileResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, {
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
            withCredentials: true,
          }),
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
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
    fetchReceipts(currentPage);
  }, [currentPage]);

  const fetchReceipts = async (page: number) => {
    try {
      
      const response = await axios.get(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/all-receipts`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` },
        params: { page, limit: 8 },
        withCredentials: true,
      });
      
      setReceipts(response.data.receipts || response.data);
      setTotalPages(response.data.totalPages || Math.ceil((response.data.total || response.data.length) / 8));
      setTotalReceipts(response.data.total || response.data.length);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  };

  const exportReceiptToPDF = (receipt: ReceiptData, profile: ProfileData | null, business: BusinessData | null) => {
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
    
    // Receipt Header
    doc.setFontSize(18);
    doc.text('SALES RECEIPT', 105, 70, { align: 'center' });
    const receiptDate = receipt.date || receipt.createdAt;
    if (receiptDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(receiptDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Receipt ID: ${receipt._id.slice(-6)}`, 105, 85, { align: 'center' });
    
    // Items Table
    doc.setFontSize(14);
    doc.text('Product', 14, 100);
    doc.text('Qty', 80, 100);
    doc.text('Price (P)', 100, 100);
    doc.text('Unit', 140, 100);
    
    let yPosition = 105;
    receipt.inputs?.forEach((item) => {
      doc.setFontSize(10);
      doc.text(item.field3, 14, yPosition);
      doc.text(item.field1.toString(), 80, yPosition);
      doc.text(item.field4 === 'na' ? '-' : item.field4, 100, yPosition);
      doc.text(typeof item.field2 === 'string' ? item.field2 : item.field2.toFixed(2), 140, yPosition);
      yPosition += 7;
    });
    
    // Totals Section
    const totalY = yPosition + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, totalY - 2, 195, totalY - 2); // Divider line
    
    yPosition = totalY + 5;
    doc.setFontSize(12);
    doc.text(`Total-P: BWP ${parseFloat(receipt.grandTotal || '0').toFixed(2)}`, 140, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Paid-P: BWP ${parseFloat(receipt.cash || '0').toFixed(2)}`, 140, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Balance-P: BWP ${parseFloat(receipt.change || '0').toFixed(2)}`, 140, yPosition, { align: 'right' });
    
    // Security
    yPosition += 10;
    doc.text(`RefNo: ${receipt.refNo || '123356'}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Seller: ${receipt.seller || profile?.nameOfBusiness || 'Jb-1671'}`, 14, yPosition);
    
    // Footer
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `Receipt_${receipt._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = (index: number) => {
    const receipt = receipts[index];
    if (!receipt || !profileData || !businessData) {
      toast.error('Missing receipt or business data');
      return;
    }
    
    exportReceiptToPDF(receipt, profileData, businessData);
    toast.success('PDF downloaded!');
  };

  const openDeleteModal = (receiptId: string, receiptName: string) => {
    setDeleteModal({
      isOpen: true,
      receiptId,
      receiptName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      receiptId: '',
      receiptName: ''
    });
  };

  const handleDelete = async () => {
    const { receiptId } = deleteModal;
    setDeletingId(receiptId);
    
    try {
      await axios.delete(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/receipts/${receiptId}`, {
        withCredentials: true,
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Receipt deleted successfully!');
      fetchReceipts(currentPage);
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete receipt: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const formatFileSize = (receipt: ReceiptData) => {
    const itemCount = receipt.inputs?.length || 0;
    const baseSize = 2.5;
    const itemSize = itemCount * 0.3;
    return `${(baseSize + itemSize).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your receipts...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Receipt Manager</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalReceipts}</span>
              <span className={styles.statLabel}>Total Receipts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{currentPage}</span>
              <span className={styles.statLabel}>Current Page</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/quick-receipt">
            <button className={styles.buttonReceipt}>New Receipt</button>
          </Link>
          <Link to="/receipt-template">
            <button className={styles.buttonRecent}>Recent Receipt</button>
          </Link>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>📄</div>
          <h3>No receipts found</h3>
          <p>You haven't created any receipts yet.</p>
          <Link to="/quick-receipt">
            <button className={styles.createButton}>Create Your First Receipt</button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.receiptsGrid}>
            {receipts.map((receipt, index) => (
              <div key={receipt._id} className={styles.receiptCard}>
                <div className={styles.cardPreview}>
                  <div 
                    ref={el => receiptRefs.current[index] = el}
                    className={styles.wrapper}
                  >
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

                    <div className={styles.receiptHeader}>
                      <h3>SALES RECEIPT</h3>
                      {receipt.date && (
                        <h4>Date: {formatDate(receipt.date)}</h4>
                      )}
                      <h4>Receipt ID: {receipt._id.slice(-6)}</h4>
                    </div>
            
                    <div className={styles.items}>
                      <h4>Product</h4>
                      <h4>Qty</h4>
                  
                      <h4>Unit</h4>
                      <h4>Price(P)</h4>
                    </div>
            
                    {receipt.inputs && receipt.inputs.length > 0 ? (
                      <div className={styles.itemsContainer}>
                        {receipt.inputs.map((item, itemIndex) => (
                          <div key={item._id || `item-${itemIndex}`} className={styles.contentsOfReceipts}>
                            <div className={styles.productName}>{item.field3}</div>
                            <div className={styles.quantity}>{item.field1}</div>
                            <div className={styles.unit}>{item.field2}</div>
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
                        <h4 className={styles.totalHeader}>Total-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.grandTotal || '0'}</div>
                      </div>
            
                      <div className={styles.cashPaid}>
                        <h4>Paid-P</h4>
                        <div className={styles.paidAmount}>BWP {receipt.cash || '0'}</div>
                      </div>
            
                      <div className={styles.balance}>
                        <h4>Balance-P</h4>
                        <div className={styles.balanceAmount}>BWP {receipt.change || '0'}</div>
                      </div>
                    </div>
            
                    <div className={styles.security}>
                      <h4>{receipt.refNo || 'RefNo.123356'}</h4>
                      <h4>Seller: {receipt.seller || profileData?.nameOfBusiness || 'Jb-1671'}</h4>
                    </div>
                    
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Receipt {receipt._id.slice(-8)}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(receipt)}</span>
                    <span className={styles.cardDate}>{formatDate(receipt.createdAt || receipt.date)}</span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={() => handlePrint(index)}
                    title="Download PDF"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => openDeleteModal(receipt._id, `Receipt ${receipt._id.slice(-8)}`)}
                    disabled={!!deletingId}
                    title="Delete Receipt"
                  >
                    {deletingId === receipt._id ? (
                      <ClipLoader size={16} color="#fff" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className={styles.pageInfo}>
                <span className={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </span>
                <span className={styles.pageText}>
                  of {totalPages} pages
                </span>
              </div>

              <button
                className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        receiptId={deleteModal.receiptId}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default AllReceipts;