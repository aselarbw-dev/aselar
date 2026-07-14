import React, { useState, useEffect } from 'react'
import styles from "./Inventory.module.css"
import { useSelector, useDispatch } from 'react-redux';
import Forms from '../Forms/Forms'
import ServiceForm from '../Forms/ServiceForm';
//import Scanner from '../Scans/Scanner';
import ExpenseSheet from '../Expenses/ExpenseSheet';
import { FaHome, FaSyncAlt } from "react-icons/fa";  // Added refresh icon
import { Link } from 'react-router-dom'
import { IconContext } from 'react-icons'
import CategoryList from '../CategoryList/CategoryList'
//import BulkUpload from '../Bulk/BulkUpload';
import ServicesList from '../ServiceList/ServiceList';
import InventSummary from '../Summary/InventSummary'
import { RootState, getCategories } from "../Store/store"  // Added getCategories import
import { AppDispatch } from "../Store/store";  // For typed dispatch

const Inventory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();  // Added dispatch
  const [show, setShow] = useState(false)
  const [visible, setVisible] = useState(false)
  const [expenseShow, setExpenseShow] = useState(false)
 // const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [burger, setBurger] = useState(false)
  const categories = useSelector((state: RootState) => state.inventory.categories);
  const services = useSelector((state: RootState) => state.services.services);
  // Determine which type of data exists

  const hasProducts = categories.length > 0;
  const hasServices = services.length > 0;

  // NEW: Fetch categories on mount (forces initial load)
  useEffect(() => {
    console.log('Dispatching getCategories from Inventory on mount');
    dispatch(getCategories());
  }, [dispatch]);

  // NEW: Manual refresh handler
  const handleRefreshCategories = () => {
    console.log('Manual refresh from Inventory');
    dispatch(getCategories());
  };

  const showHandle = () => {
    setShow(!show)
  }
  {/*  const handleScan = (data: string) => {
    console.log("Scanned QR Code:", data);
    alert(`Scanned QR Code: ${data}`);
  };*/}

  const visibleHandle = () => {
    setVisible(!visible)
  }
  const expensesHandle = () => {
    setExpenseShow(!expenseShow)
  }
  {/*  const bulkUploadHandler = () => {
    setShowBulkUpload(true)
  }*/}
 
  const flipBurger = () => {
    setBurger(!burger)
  }
  return (
    <div className={styles.inventory}>
      <div className={styles.minNav}>
        <IconContext.Provider value={{ className: styles.icon }}>
          <FaHome color="#0b5cff" onClick={flipBurger} size={30} />
        </IconContext.Provider>

        {burger ? <div className={styles.links}>
          <Link to="/inside-dashboard"><p>Dashboard</p></Link>
          <Link to="/all-receipts"><p>Receipts</p></Link>
          <Link to="/all-quotes"><p>Quotations</p></Link>
          <Link to="/all-invoices"><p>Invoices</p></Link>
          <Link to="/total-expenses"><p>Expenses</p></Link>
          <Link to="/files-bunker"><p>Payments</p></Link>
          <Link to="/ledgers"><p>Ledgers</p></Link>
          <Link to="/aging-report"><p>Aging Report</p>
          <Link to="/recon"><p>Reconciliation</p>
          </Link>
          </Link>
          
          {/* <Link to="/inventory-receipts"><p>Receipts from Inventory</p>

          </Link>*/}
        {/* <Link to="/use-scanner"><p>Scanner</p>

          </Link>*/}  
        </div>
          : null
        }
        <InventSummary />

        <button className={styles.items} onClick={showHandle}>Add Products</button>
        {/* <button className={styles.items} onClick={bulkUploadHandler}>Bulk Upload</button> */}
       
        <button className={styles.items} onClick={visibleHandle}>Add Services</button>
        <button className={styles.expenseBtn} onClick={expensesHandle}>Expense Sheet</button>
      </div>
      <div className={styles.allForms}>
        <div className={styles.headers}>
          {hasProducts && hasServices && (
            <div className="notice">
              <p>
                You can only track either products or services, not both. Please remove either your
                product categories or service listings to avoid data conflicts.
              </p>
            </div>
          )}
          {hasProducts && !hasServices && (
            <div className={styles.beverage}>
              <CategoryList />

            </div>
          )}
          {hasServices && !hasProducts && (
            <div className={styles.beverage}>
              <ServicesList />

            </div>
          )}

          {!hasProducts && !hasServices && (
            <div className={styles.emptyState}>  {/* NEW: Wrapped for styling/button */}
              <p>No data available. Start adding products or services to track your business!</p>
              {/* NEW: Refresh button in empty state */}
              <button onClick={handleRefreshCategories} className={styles.refreshButton}>
                <FaSyncAlt /> Refresh Categories
              </button>
            </div>
          )}


        </div>
        <div className={styles.productPanels}>
          {show ? <Forms /> : null}
          {visible ? <ServiceForm /> : null}
          {expenseShow ? <ExpenseSheet /> : null}
          {/*  {showBulkUpload && <BulkUpload onClose={() => setShowBulkUpload(false)} />}*/}
         
        </div>

      </div>


    </div>
  )
}

export default Inventory