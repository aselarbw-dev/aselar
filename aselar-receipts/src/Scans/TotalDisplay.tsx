import React from "react"
import styles from "./TotalDisplay.module.css"

interface TotalsDisplayProps {
    totalSales: number;
    totalProfits: number;
    totalCost: number;
    totalQuantity: number;
  }
  
  const TotalsDisplay: React.FC<TotalsDisplayProps> = ({ totalSales, totalProfits, totalCost, totalQuantity }) => {
    const formatNumber = (number: number): string => {
        return number.toLocaleString(); // This will format the number with commas
      };
      
      
    return (
      <div className={styles.display}>
        <h3>Bar code Scanner</h3>
        <p><strong>Total Sales:</strong> P{formatNumber(totalSales)}</p>
        <p><strong>Total Profits:</strong> P{formatNumber(totalProfits)}</p>
        <p><strong>Total Cost:</strong> P{formatNumber(totalCost)}</p>
        <p><strong>Total Quantity:</strong> {totalQuantity}</p>
      </div>
    );
  };
  
  export default TotalsDisplay;