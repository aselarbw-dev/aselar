import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../Store/store";
import { setTotalExpenses } from "../Store/store"; // Import the action
import { Category } from "../Store/store";
import { Service } from "../Store/store";
import styles from "./InventSummary.module.css";
import { formatCurrency } from "../Helperfunctions/formatNumbers";
const InventSummary: React.FC = () => {
  const dispatch = useDispatch();

  // Select categories, services, and expenses from the Redux store
  const categories: Category[] = useSelector((state: RootState) => state.inventory.categories);
  const services: Service[] = useSelector((state: RootState) => state.services.services);
  const totalExpenses = useSelector((state: RootState) => state.expenses.totalExpenses);

  // Fetch expenses when the component mounts
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Fetch expenses from the backend
  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/get-expenses`, {
        credentials: 'include', // For cookie-based auth
      });

      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data = await response.json();
      dispatch(setTotalExpenses(data.totalExpenses)); // Dispatch the action
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  };

  // Calculate totals for products
  const totalProductCost = categories.reduce((acc: number, category: Category) => {
    return (
      acc +
      category.items.reduce((sum: number, item) => sum + item.costPrice * item.quantity, 0)
    );
  }, 0);

  const estimatedProductSales = categories.reduce((acc: number, category: Category) => {
    return (
      acc +
      category.items.reduce((sum: number, item) => sum + item.sellingPrice * item.quantity, 0)
    );
  }, 0);

  const estimatedProductProfits = estimatedProductSales - totalProductCost - totalExpenses;

  // Calculate totals for services
  const totalServiceCost = services.reduce(
    (acc: number, service: Service) => acc + service.expenses,
    0
  );

  const estimatedServiceSales = services.reduce(
    (acc: number, service: Service) => acc + service.sales,
    0
  );

  const estimatedServiceProfits = estimatedServiceSales - totalServiceCost;

  // Determine what to render based on the data presence
  const hasProducts = categories.length > 0;
  const hasServices = services.length > 0;

  return (
    <div>
      {hasProducts && (
        <div className={styles.summary}>
  
          <div className={styles.allItems}>
            <h4 className={styles.itemsHeader}>Total Cost:</h4>
            <h4 className={styles.itemsValue}>Bwp {totalProductCost.toFixed(2)}</h4>
            <div className={styles.estimatedProfits}>
              <h4 className={styles.valuation}>Total Sales:</h4>
              <h4 className={styles.valuationHeader}>Bwp {estimatedProductSales.toFixed(2)}</h4>
            </div>
            <div className={styles.valuation}>
              <h4 className={styles.profitsTitle}>Profits:</h4>
              <h4 className={styles.profitsValue}>Bwp {estimatedProductProfits.toFixed(2)}</h4>
            </div>
          </div>
        </div>
      )}

      {hasServices && (
        <div className={styles.summary}>
        
          <div className={styles.allItems}>
            <h4 className={styles.itemsHeader}>Total Cost:</h4>
            <h4 className={styles.itemsValue}>BWP {formatCurrency(totalServiceCost)}</h4>
            <div className={styles.estimatedProfits}>
              <h4 className={styles.valuation}>Total Sales:</h4>
              <h4 className={styles.valuationHeader}>BWP {formatCurrency(estimatedServiceSales)}</h4>
            </div>
            <div className={styles.valuation}>
              <h4 className={styles.profitsTitle}>Estimated Profits:</h4>
              <h4 className={styles.profitsValue}>BWP {formatCurrency(estimatedServiceProfits)}</h4>
            </div>
          </div>
        </div>
      )}

      {!hasProducts && !hasServices && (
        <p>No data available. Start adding products or services to track your business!</p>
      )}
    </div>
  );
};

export default InventSummary;