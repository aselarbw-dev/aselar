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
import styles from './AllCategoryReceipts.module.css'; // Assume a similar CSS module for category receipts

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  totalPrice: number;
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
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  cashPaid: number;
  change: number;
  receiptsNumber?: string;
  createdAt?: string;
  status?: string;
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
          <p>Are you sure you want to delete this category receipt?</p>
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

const AllCategoryReceipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}/api/receipts`, {
        withCredentials: true,
      });
      
      console.log('Fetched receipts data:', response.data); // Debug log
      setReceipts(response.data.receipts || response.data);
      setTotalReceipts(response.data?.length || 0);
    } catch (error: any) {
      console.error('Fetch receipts error:', error);
      // Handle 404 gracefully (no receipts) - no toast for empty state
      if (error.response?.status === 404) {
        console.log('No receipts found (404) - treating as empty');
        setReceipts([]);
        setTotalReceipts(0);
      } else {
        toast.error('Failed to fetch receipts');
      }
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
    doc.text('RECEIPT', 105, 70, { align: 'center' });
    const receiptDate = receipt.createdAt;
    if (receiptDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(receiptDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Receipt #: ${receipt.receiptsNumber || receipt._id.slice(-6)}`, 105, 85, { align: 'center' });
    if (receipt.status) {
      doc.text(`Status: ${receipt.status.toUpperCase()}`, 105, 90, { align: 'center' });
    }
    
    // Items Table
    let yPosition = 100;
    doc.setFontSize(14);
    doc.text('Item', 14, yPosition);
    doc.text('Qty', 60, yPosition);
    doc.text('Price (P)', 80, yPosition);
    doc.text('Total (P)', 120, yPosition);
    
    yPosition += 5;
    receipt.items?.forEach((item) => {
      doc.setFontSize(10);
      doc.text(item.name, 14, yPosition);
      doc.text(item.quantity.toString(), 60, yPosition);
      doc.text(item.price.toFixed(2), 80, yPosition);
      doc.text(item.totalPrice.toFixed(2), 120, yPosition);
      yPosition += 7;
    });
    
    // Totals Section
    const totalY = yPosition + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, totalY - 2, 195, totalY - 2); // Divider line
    
    yPosition = totalY + 5;
    doc.setFontSize(12);
    doc.text(`Subtotal: BWP ${receipt.subtotal.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Discount: -BWP ${receipt.discount.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`VAT: BWP ${receipt.vat.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Total: BWP ${receipt.total.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Cash Paid: BWP ${receipt.cashPaid.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Change: BWP ${receipt.change.toFixed(2)}`, 100, yPosition, { align: 'right' });
    
    // Footer
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `CategoryReceipt_${receipt.receiptsNumber || receipt._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handleDownload = (index: number) => {
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
      await axios.delete(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}/api/receipts/${receiptId}`, {
        withCredentials: true,
      });
      toast.success('Receipt deleted successfully!');
      fetchReceipts();
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete receipt: ${error.response?.data?.message || error.message}`);
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

  const formatFileSize = (receipt: ReceiptData) => {
    const itemCount = receipt.items?.length || 0;
    const baseSize = 2.5;
    const itemSize = itemCount * 0.3;
    return `${(baseSize + itemSize).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your category receipts...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Category Receipts Manager</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalReceipts}</span>
              <span className={styles.statLabel}>Total Category Receipts</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/quick-category-receipt">
            <button className={styles.buttonReceipt}>New Category Receipt</button>
          </Link>
          <Link to="/category-receipt-template">
            <button className={styles.buttonRecent}>Recent Category Receipt</button>
          </Link>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>💸</div>
          <h3>No category receipts found</h3>
          <p>You haven't created any category receipts yet.</p>
          <Link to="/quick-category-receipt">
            <button className={styles.createButton}>Create Your First Category Receipt</button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.receiptsGrid}>
            {receipts.map((receipt, index) => (
              <div key={receipt._id} className={styles.receiptCard}>
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

                    <div className={styles.receiptHeader}>
                      <h3>CATEGORY RECEIPT</h3>
                      {receipt.createdAt && (
                        <h4>Date: {formatDate(receipt.createdAt)}</h4>
                      )}
                      {receipt.status && (
                        <h4 className={styles.statusText}>Status: {receipt.status.toUpperCase()}</h4>
                      )}
                      <h4>Receipt ID: {receipt.receiptsNumber || receipt._id.slice(-6)}</h4>
                    </div>
            
                    <div className={styles.items}>
                      <h4>Item</h4>
                      <h4>Qty</h4>
                      <h4>Price(P)</h4>
                      <h4>Total(P)</h4>
                    </div>
            
                    {receipt.items && receipt.items.length > 0 ? (
                      <div className={styles.itemsContainer}>
                        {receipt.items.map((item, itemIndex) => (
                          <div key={itemIndex} className={styles.contentsOfReceipts}>
                            <div className={styles.productName}>{item.name}</div>
                            <div className={styles.quantity}>{item.quantity}</div>
                            <div className={styles.price}>{item.price.toFixed(2)}</div>
                            <div className={styles.totalPrice}>{item.totalPrice.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noProducts}>No items found.</p>
                    )}
            
                    <div className={styles.divider}></div>
                    
                    <div className={styles.adding}>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Subtotal-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.subtotal.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Discount-P</h4>
                        <div className={styles.totalAmount}>-BWP {receipt.discount.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Vat-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.vat.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Total-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.total.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Cash Paid</h4>
                        <div className={styles.totalAmount}>BWP {receipt.cashPaid.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Change</h4>
                        <div className={styles.totalAmount}>BWP {receipt.change.toFixed(2)}</div>
                      </div>
                    </div>
            
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Category Receipt {receipt.receiptsNumber || receipt._id.slice(-8)}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(receipt)}</span>
                    <span className={styles.cardDate}>{formatDate(receipt.createdAt)}</span>
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
                    onClick={() => openDeleteModal(receipt._id, `Category Receipt ${receipt.receiptsNumber || receipt._id.slice(-8)}`)}
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

export default AllCategoryReceipts;