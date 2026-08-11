import { useState } from 'react';
import styles from './DashboardLayout.module.css';
import Sidebar from '../Dashboard/Sidebar';
import Banner from '../Utils/Banner';
import { Outlet } from 'react-router-dom';
import SellerNameProvider from "../Sellers/SellerNameProvider";
import WhatsAppNotification from '../Notification/WhatsAppNotification';
import FeedbackButton from '../Componets/FeedbackButton'
const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SellerNameProvider>
      <div className={styles.dashboardLayout}>
        {/* Pass the state to Banner */}
        <WhatsAppNotification />
        <Banner isCollapsed={isCollapsed} />
        <FeedbackButton />
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}   
        >
          <div className={styles.content}>
            <Outlet />
          </div>
        </Sidebar>
      </div>
    </SellerNameProvider>
  );
};

export default DashboardLayout;
