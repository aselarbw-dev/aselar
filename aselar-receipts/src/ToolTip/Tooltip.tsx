import React, { ReactNode } from 'react';
import styles from './Tooltip.module.css'

// Define the props type
interface TooltipProps {
  header: string;
  paragraph: string;
  children: ReactNode; // The element that triggers the tooltip
}

const Tooltip: React.FC<TooltipProps> = ({ children, header, paragraph }) => {
  return (
    <div className={styles.tooltipContainer}>
      {children} {/* This is the element that triggers the tooltip */}
      <div className={styles.tooltipContent}>
        <h5>{header}</h5>
        <p>{paragraph}</p>
      </div>
    </div>
  );
};

export default Tooltip;