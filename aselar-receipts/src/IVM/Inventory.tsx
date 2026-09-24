import React, { useState, useEffect } from 'react';

import styles from "./Inventory.module.css";

import { useSelector, useDispatch } from 'react-redux';

import Forms from '../Forms/Forms';
import ServiceForm from '../Forms/ServiceForm';
import ExpenseSheet from '../Expenses/ExpenseSheet';

import { FaHome, FaSyncAlt } from "react-icons/fa";

import { Link } from 'react-router-dom';

import { IconContext } from 'react-icons';

import CategoryList from '../CategoryList/CategoryList';
import BulkImportPanel from '../Bulk/BulkImportPanel';
import ServicesList from '../ServiceList/ServiceList';
import InventSummary from '../Summary/InventSummary';

import { RootState, getCategories } from "../Store/store";
import { AppDispatch } from "../Store/store";


const Inventory: React.FC = () => {

  const dispatch = useDispatch<AppDispatch>();

  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expenseShow, setExpenseShow] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [burger, setBurger] = useState(false);

  const categories = useSelector(
    (state: RootState) => state.inventory.categories
  );

  const services = useSelector(
    (state: RootState) => state.services.services
  );

  const hasProducts = categories.length > 0;
  const hasServices = services.length > 0;


  useEffect(() => {
    console.log('Dispatching getCategories from Inventory on mount');
    dispatch(getCategories());
  }, [dispatch]);


  const handleRefreshCategories = () => {
    console.log('Manual refresh from Inventory');
    dispatch(getCategories());
  };


  // Mutually exclusive panel toggles
  const showHandle = () => {
    setShow(!show);
    setVisible(false);
    setExpenseShow(false);
    setShowBulkImport(false);
  };


  const visibleHandle = () => {
    setVisible(!visible);
    setShow(false);
    setExpenseShow(false);
    setShowBulkImport(false);
  };


  const expensesHandle = () => {
    setExpenseShow(!expenseShow);
    setShow(false);
    setVisible(false);
    setShowBulkImport(false);
  };


  const bulkImportHandler = () => {
    setShowBulkImport(!showBulkImport);
    setShow(false);
    setVisible(false);
    setExpenseShow(false);
  };


  const flipBurger = () => {
    setBurger(!burger);
  };


  return (
    <div className={styles.inventory}>

      {/* =========================
          TOP NAVIGATION + SUMMARY
      ========================== */}

      <div className={styles.minNav}>

        <div className={styles.navTop}>

          {/* Hamburger / Home Button */}
          <div className={styles.menuButton}>
            <IconContext.Provider
              value={{ className: styles.icon }}
            >
              <FaHome
                color="#0b5cff"
                onClick={flipBurger}
                size={30}
              />
            </IconContext.Provider>
          </div>


          {/* Burger Navigation */}
          {burger && (
            <div className={styles.links}>

              <Link to="/inside-dashboard">
                <p>Dashboard</p>
              </Link>

              <Link to="/all-receipts">
                <p>Receipts</p>
              </Link>

              <Link to="/pos-receipts">
                <p>POS Receipts</p>
              </Link>

              <Link to="/all-quotes">
                <p>Quotations</p>
              </Link>

              <Link to="/all-invoices">
                <p>Invoices</p>
              </Link>

              <Link to="/total-expenses">
                <p>Expenses</p>
              </Link>

              <Link to="/files-bunker">
                <p>Files Bunker</p>
              </Link>

              <Link to="/ledgers">
                <p>Ledgers</p>
              </Link>

              <Link to="/aging-report">
                <p>Aging Report</p>
              </Link>

              <Link to="/sales-report">
                <p>Sales Report</p>
              </Link>

              <Link to="/recon">
                <p>Reconciliation</p>
              </Link>

              <Link to="/scan-history">
                <p>Scan History</p>
              </Link>

              <Link to="/returns-list">
                <p>Returns List</p>
              </Link>

            </div>
          )}


          {/* Inventory Totals / Summary */}
          <div className={styles.summary}>
            <InventSummary />
          </div>

        </div>


        {/* =========================
            ACTION BUTTONS
        ========================== */}

        <div className={styles.navActions}>

          <button
            className={styles.items}
            onClick={showHandle}
          >
            Add Products
          </button>


          <button
            className={styles.items}
            onClick={bulkImportHandler}
          >
            Bulk Import
          </button>


          {/*
          <button
            className={styles.items}
            onClick={visibleHandle}
          >
            Add Services
          </button>
          */}


          <button
            className={styles.expenseBtn}
            onClick={expensesHandle}
          >
            Expense Sheet
          </button>

        </div>

      </div>


      {/* =========================
          INVENTORY CONTENT
      ========================== */}

      <div className={styles.allForms}>

        <div className={styles.headers}>

          {/* Product + Service Conflict */}
          {hasProducts && hasServices && (

            <div className="notice">

              <p>
                You can only track either products or services, not both.
                Please remove either your product categories or service
                listings to avoid data conflicts.
              </p>

            </div>

          )}


          {/* Products */}
          {hasProducts && !hasServices && (

            <div className={styles.beverage}>
              <CategoryList />
            </div>

          )}


          {/* Services */}
          {hasServices && !hasProducts && (

            <div className={styles.beverage}>
              <ServicesList />
            </div>

          )}


          {/* Empty Inventory */}
          {!hasProducts && !hasServices && (

            <div className={styles.emptyState}>

              <p>
                No data available. Start adding products or services
                to track your business!
              </p>

              <button
                onClick={handleRefreshCategories}
                className={styles.refreshButton}
              >
                <FaSyncAlt />
                Refresh Categories
              </button>

            </div>

          )}

        </div>


        {/* =========================
            FORMS / PANELS
        ========================== */}

        <div className={styles.productPanels}>

          {show && <Forms />}

          {visible && <ServiceForm />}

          {expenseShow && <ExpenseSheet />}

          {showBulkImport && (

            <BulkImportPanel
              onClose={() => setShowBulkImport(false)}
              onImportComplete={handleRefreshCategories}
            />

          )}

        </div>

      </div>

    </div>
  );
};


export default Inventory;