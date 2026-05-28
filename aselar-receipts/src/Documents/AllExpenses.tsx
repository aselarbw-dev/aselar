// AllExpenses.tsx (mirrored from AllQuotes.tsx, adapted for expenses)
// Save as src/components/AllExpenses.tsx (or your path)
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
import styles from './AllExpenses.module.css'; // Create/adapt CSS module similar to AllQuotes.module.css

interface ExpenseItem {
  _id: string;
  name: string;
  amount: number;
  createdAt?: string;
}
{
  /* 
  
  interface ExpensesResponse {
  expenses: ExpenseItem[];
  totalExpenses: number;
}
*/
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
  expenseId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  expenseId,
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
          <p>Are you sure you want to delete this expense?</p>
          <p className={styles.expenseId}>Expense ID: {expenseId.slice(-8)}</p>
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
                <span>Delete Expense</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AllExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    expenseId: string;
    expenseName: string;
  }>({
    isOpen: false,
    expenseId: '',
    expenseName: ''
  });

  // Fetch business and profile data once on mount (mirrored)
  useEffect(() => {
    const fetchBusinessAndProfile = async () => {
      try {
        const [businessResponse, profileResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }),
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
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
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Adjust port/endpoint to your expenses server (e.g., 5007/api/expenses—update as needed)
      const response = await axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-expenses`, {  // ← Mirror: Update port/path
        withCredentials: true,
      });
      
      console.log('Fetched expenses data:', response.data); // Debug log
      setExpenses(response.data.expenses || []);
      setTotalExpenses(response.data.totalExpenses || 0);
    } catch (error: any) {
      console.error('Fetch expenses error:', error);
      // Handle 404 gracefully (no expenses) - no toast for empty state
      if (error.response?.status === 404) {
        console.log('No expenses found (404) - treating as empty');
        setExpenses([]);
        setTotalExpenses(0);
      } else {
        toast.error('Failed to fetch expenses');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportExpenseToPDF = (expense: ExpenseItem, profile: ProfileData | null, business: BusinessData | null) => {
    const doc = new jsPDF();
    
    // Company Header (mirrored from quotes)
    const companyName = profile?.nameOfBusiness || 'TeX-Technology Extreme';
    const logoUrl = profile?.profilePicture || '/default-logo.png';
    const address1 = business?.place || 'Plot 1234';
    const address2 = business?.businessDescription || 'Box 3456, Phakalane';
    const email = profile?.emailBusiness || 'tex@robotics.bw';
    const location = business?.businessNature || 'Fair Grounds';
    
    // Add logo if available
    if (logoUrl && logoUrl !== '/default-logo.png') {
      doc.addImage(logoUrl, 'PNG', 14, 20, 30, 30);
    }
    
    doc.setFontSize(16);
    doc.text(companyName, 50, 25);
    doc.setFontSize(10);
    doc.text(address1, 50, 35);
    doc.text(address2, 50, 40);
    doc.text(email, 50, 45);
    doc.text(location, 50, 50);
    
    // Expense Header (adapted)
    doc.setFontSize(18);
    doc.text('EXPENSE RECORD', 105, 70, { align: 'center' });
    const expenseDate = expense.createdAt;
    if (expenseDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(expenseDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Expense ID: ${expense._id.slice(-6)}`, 105, 85, { align: 'center' });
    
    // Expense Details (simple table-like, since no sub-items)
    doc.setFontSize(14);
    doc.text('Description', 14, 100);
    doc.text('Amount (P)', 140, 100);
    
    let yPosition = 105;
    doc.setFontSize(10);
    doc.text(expense.name, 14, yPosition);
    doc.text(`BWP ${expense.amount.toFixed(2)}`, 140, yPosition, { align: 'right' });
    
    // Totals Section (single expense, so just amount)
    const totalY = yPosition + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, totalY - 2, 195, totalY - 2); // Divider line
    
    yPosition = totalY + 5;
    doc.setFontSize(12);
    doc.text(`Total Expense: BWP ${expense.amount.toFixed(2)}`, 140, yPosition, { align: 'right' });
    
    // Security/Ref
    yPosition += 10;
    doc.text(`RefNo: ${expense._id.slice(-6)}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Seller: ${profile?.nameOfBusiness || 'Admin' }`, 14, yPosition);
    
    // Footer (mirrored)
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `Expense_${expense._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  const handleDownload = (index: number) => {
    const expense = expenses[index];
    if (!expense || !profileData || !businessData) {
      toast.error('Missing expense or business data');
      return;
    }
    
    exportExpenseToPDF(expense, profileData, businessData);
    toast.success('PDF downloaded!');
  };

  const openDeleteModal = (expenseId: string, expenseName: string) => {
    setDeleteModal({
      isOpen: true,
      expenseId,
      expenseName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      expenseId: '',
      expenseName: ''
    });
  };

  const handleDelete = async () => {
    const { expenseId } = deleteModal;
    setDeletingId(expenseId);
    
    try {
      // Adjust endpoint/port to match your expenses server
      await axios.delete(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/expenses/${expenseId}`, {  // ← Mirror: Update port/path
        withCredentials: true,
      });
      toast.success('Expense deleted successfully!');
      fetchExpenses();  // Refresh list and total
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete expense: ${error.response?.data?.message || error.message}`);
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

  const formatFileSize = (expense: ExpenseItem) => {
    // Simple calc for expense (no sub-items, so fixed-ish)
    console.log(expense)
    return '1.2 KB';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your expenses...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Expense Manager</h2>  {/* ← Adapted title */}
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{expenses.length}</span>  {/* ← Count items */}
              <span className={styles.statLabel}>Total Expenses</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>BWP {totalExpenses.toFixed(2)}</span>  {/* ← Total amount */}
              <span className={styles.statLabel}>Grand Total</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/expenses">  {/* ← Adapt link to your new expense form */}
            <button className={styles.buttonQuote}>New Expense</button>  {/* ← Adapted button */}
          </Link>
          {/* Optional: Recent if you have a template */}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>💰</div>  {/* ← Expense emoji */}
          <h3>No expenses found</h3>
          <p>You haven't recorded any expenses yet.</p>
          <Link to="/create-expense">  {/* ← Adapt link */}
            <button className={styles.createButton}>Record Your First Expense</button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.expensesGrid}>  {/* ← Renamed grid */}
            {expenses.map((expense, index) => (
              <div key={expense._id} className={styles.expenseCard}>  {/* ← Renamed card */}
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

                    <div className={styles.expenseHeader}>  {/* ← Adapted header */}
                      <h3>EXPENSE</h3>  {/* ← Changed title */}
                      {expense.createdAt && (
                        <h4>Date: {formatDate(expense.createdAt)}</h4>
                      )}
                      <h4>Expense ID: {expense._id.slice(-6)}</h4>
                    </div>
            
                    <div className={styles.items}>  {/* ← Simple items for expense */}
                      <h4>Description</h4>
                      <h4>Amount (P)</h4>
                    </div>
            
                    <div className={styles.itemsContainer}>  {/* ← Single row */}
                      <div className={styles.contentsOfExpenses}>  {/* ← Adapted class */}
                        <div className={styles.productName}>{expense.name}</div>
                        <div className={styles.price}>{`BWP ${expense.amount.toFixed(2)}`}</div>
                      </div>
                    </div>
            
                    <div className={styles.divider}></div>
                    
                    <div className={styles.security}>
                      <h4>Ref: {expense._id.slice(-6)}</h4>
                      <h4>Seller: {profileData?.nameOfBusiness || 'Admin'}</h4>
                    </div>
                    
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Expense {expense._id.slice(-8)}</h4>  {/* ← Adapted title */}
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(expense)}</span>
                    <span className={styles.cardDate}>{formatDate(expense.createdAt)}</span>
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
                    onClick={() => openDeleteModal(expense._id, expense.name)}
                    disabled={!!deletingId}
                    title="Delete Expense"
                  >
                    {deletingId === expense._id ? (
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
        expenseId={deleteModal.expenseId}  
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default AllExpenses;