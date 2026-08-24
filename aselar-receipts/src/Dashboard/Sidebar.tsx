import { useState, useRef, useEffect } from "react";
import sideStyles from "./Sidebar.module.css";
import { RiMenu3Line, RiCloseLine } from "react-icons/ri";
import { MdAccountBox, MdInventory2 } from "react-icons/md";
import { MdOutlineReceiptLong } from "react-icons/md";
import { FaUser } from "react-icons/fa";
//import SessionExpiredModal from "../Sessions/SessionExpiredModal";
//import { useActivityTracker } from '../Hooks/userActivityTracker';
//import { lockUserSession, clearSessionAndRedirect } from '../Sessions/SessionApi';

import {
  FaReceipt,
  FaAddressBook,
  FaMountain,
  FaWallet,
  FaRobot,
  FaMoneyCheck,
  FaChevronRight,
  FaLock,
} from "react-icons/fa";
import { FaMoneyCheckAlt } from "react-icons/fa";
import { FaNewspaper } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { MdRequestQuote } from "react-icons/md";
import { MdPayments } from "react-icons/md";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
interface SidebarLink {
  title: string;
  path: string;
  icon: React.ReactNode;
  protected?: boolean;
  badge?: string;
}

const links: SidebarLink[] = [
  {
    title: "Dashboard",
    path: "/inside-dashboard",
    icon: <RiMenu3Line />,
  },
   {
    title: "Start Selling",
    path: "/generative-scanner",
    icon: <MdOutlineReceiptLong />,
  },
   {
    title: "Place Order",
    path: "/orders",
    icon: <FaReceipt />,
    protected:true
  },
  {
    title: "Receipt",
    path: "/quick-receipt",
    icon: <FaReceipt />,
  },
  {
    title: "Quotation",
    path: "/quote",
    icon: <MdRequestQuote />,
  },
  {
    title: "Invoice",
    path: "/invoice",
    icon: <FaWallet />,
  },
  {
    title: "Ledger",
    path: "/ledger",
    icon: <FaAddressBook />,
  },
  {
    title: "Administration",
    path: "/manage-inventory",
    icon: <MdInventory2 />,
    protected: true,
  },
  {
    title: "Income Statement",
    path: "/generate-statement",
    icon: <FaNewspaper />,
  },
  {
    title: "Debt Collection",
    path: "/debt-note",
    icon: <FaMoneyCheckAlt />,
    protected: true,
  },
  {
    title: "Aselar AI",
    path: "/aselar-chat-ai",
    icon: <FaRobot />,
    badge: "NEW",
  },
  {
    title: "Payslip",
    path: "/pay-slip",
    icon: <MdPayments />,
    protected: true,
  },
  {
    title: "Payments",
    path: "/payments",
    icon: <FaMoneyCheck />,
    protected: true,
  },
  {
    title: "Account",
    path: "/user-profiles",
    icon: <MdAccountBox />,
     protected: true,
  },
];

interface SidebarProps {
  children: React.ReactNode;
  isCollapsed: boolean;           // ← NEW
  setIsCollapsed: (collapsed: boolean) => void;  // ← NEW
   
}

const Sidebar: React.FC<SidebarProps> = ({ 
  children, 
  isCollapsed, 
  setIsCollapsed 
}) => {
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // On mobile, labels should show fully whenever the drawer is open —
  // the icon-only "collapsed" rail styling is a desktop-only concept.
  const showLabels = isMobile ? mobileMenuOpen : !isCollapsed;

  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  // Don't close if clicking the toggle button itself
  if (sidebarRef.current && !sidebarRef.current.contains(target)) {
    const btn = document.querySelector(`.${sideStyles.mobileMenuButton}`);
    if (btn && btn.contains(target)) return; // ← add this
    setMobileMenuOpen(false);
  }
};

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleProtectedLinkClick = (path: string, isProtected: boolean = false) => {
    if (isProtected && !isPasscodeVerified) {
      setRedirectTo(path);
      setIsPasscodeModalOpen(true);
    } else {
      navigate(path);
      if (isMobile) {
        setMobileMenuOpen(false);
      }
    }
  };
const handleVerifyPasscode = async (enteredPasscode: string) => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error("Session expired. Please log in again.");
      logout();
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/verify-passcode`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ passcode: enteredPasscode }),
      credentials: "include",
    });

    const data = await response.json();

    if (response.status === 404) {
      toast.info("Please set up your passcode first.");
      setIsPasscodeModalOpen(false);
      navigate("/create-passcode", { state: { redirectTo } });
      return;
    }

    if (data.success) {
      toast.success("Passcode verified!");
      setIsPasscodeVerified(true);
      setIsPasscodeModalOpen(false);
      navigate(redirectTo);
    } else {
      toast.error("Invalid passcode. Please try again.");
    }

  } catch (error) {
    console.error("Error verifying passcode:", error);
    toast.error("An error occurred. Please try again.");
  }
};

const signOut = async (): Promise<void> => {
  try {
     const token=localStorage.getItem('token');
    // Call backend logout with proper payload
    await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/logout`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reason: 'manual_logout',
        timestamp: new Date().toISOString(),
        userId: user?.id
      })
    });
    
    toast.success("Successfully logged out.");
  } catch (error: any) {
    console.log("Backend logout error:", error.message);
    toast.error("Logout completed with issues");
  } finally {
    // Always clear frontend state regardless of backend response
    logout(); // This handles navigation to /business-login
  }
};

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button 
          className={sideStyles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <RiMenu3Line size={24} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div className={sideStyles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />
      )}

      <div 
        ref={sidebarRef}
        className={`${sideStyles.container} ${!isMobile && isCollapsed ? sideStyles.collapsed : ''} ${
          isMobile ? (mobileMenuOpen ? sideStyles.mobileOpen : sideStyles.mobileHidden) : ''
        }`}
      >
        <div className={sideStyles.sidebarContent}>
          {/* Header */}
          <div className={sideStyles.header}>
            <div className={sideStyles.logoSection}>
              <div className={sideStyles.logoContainer}>
                <FaMountain className={sideStyles.logoIcon} size={32} />
              </div>
              {showLabels && (
                <div className={sideStyles.brandInfo}>
                  <Link to="/sign-in" className={sideStyles.brandLink}>
                    <h1 className={sideStyles.brandName}>
                      <span className={sideStyles.brandAccent}>A</span>selar
                    </h1>
                  </Link>
                  <p className={sideStyles.tagline}>Business with Prudence</p>
                </div>
              )}
            </div>
            
            {/* Collapse Toggle */}
           {/* Collapse Toggle */}
{!isMobile && (
  <button
    className={sideStyles.collapseButton}
    onClick={() => setIsCollapsed(!isCollapsed)}   // ← now uses prop
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    <FaChevronRight 
      className={`${sideStyles.collapseIcon} ${isCollapsed ? sideStyles.rotated : ''}`} 
    />
  </button>
)}
          </div>

          {/* Navigation */}
          <nav className={sideStyles.navigation}>
            {showLabels && <h4 className={sideStyles.sectionTitle}>MAIN MENU</h4>}
            
            <ul className={sideStyles.navList}>
              {links.map((link) => (
                <li key={link.title} className={sideStyles.navItem}>
                  <button
                    className={`${sideStyles.navLink} ${
                      isActiveLink(link.path) ? sideStyles.active : ''
                    } ${link.protected && !isPasscodeVerified ? sideStyles.protected : ''}`}
                    onClick={() => handleProtectedLinkClick(link.path, link.protected)}
                    title={!isMobile && isCollapsed ? link.title : ''}
                  >
                    <span className={sideStyles.navIcon}>
                      {link.icon}
                      {link.protected && !isPasscodeVerified && (
                        <FaLock className={sideStyles.lockBadge} size={10} />
                      )}
                    </span>
                    
                    {showLabels && (
                      <>
                        <span className={sideStyles.navText}>{link.title}</span>
                        {link.badge && (
                          <span className={sideStyles.badge}>{link.badge}</span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Footer */}
        <div className={sideStyles.footer}>
          <button 
            className={sideStyles.logoutButton}
            onClick={signOut}
            title={!isMobile && isCollapsed ? "Logout" : ''}
          >
            <FaUser/>
            <span className={sideStyles.logoutIcon}></span>
            {showLabels && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Passcode Modal */}
      {isPasscodeModalOpen && (
        <PasscodeModal
          onVerify={handleVerifyPasscode}
          onClose={() => setIsPasscodeModalOpen(false)}
        />
      )}{/* Session Expired Modal 
       <SessionExpiredModal
        isOpen={showSessionModal}
        onLoginRedirect={handleLoginRedirect}
        reason={sessionExpiredReason}
      />
      
      */}
        

      {/* Main Content */}
      <main className={`${sideStyles.mainContent} ${isCollapsed ? sideStyles.mainExpanded : ''}`}>
        {children}
      </main>
    </>
  );
};

// Enhanced Passcode Modal Component
interface PasscodeModalProps {
  onVerify: (passcode: string) => void;
  onClose: () => void;
}

const PasscodeModal: React.FC<PasscodeModalProps> = ({ onVerify, onClose }) => {
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.length < 4) {
      toast.error("Passcode must be at least 4 characters long.");
      return;
    }
    setIsLoading(true);
    await onVerify(passcode);
    setIsLoading(false);
  };

  return (
  
<div className={sideStyles.modalOverlay} onClick={onClose}>
      <div className={sideStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={sideStyles.modalHeader}>
          <h2 className={sideStyles.modalTitle}>
            <FaLock className={sideStyles.modalIcon} />
            Enter Passcode
          </h2>
          <button 
            className={sideStyles.closeButton} 
            onClick={onClose}
            aria-label="Close modal"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={sideStyles.modalForm}>
          <div className={sideStyles.inputGroup}>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter your passcode"
              className={sideStyles.passcodeInput}
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className={sideStyles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  
    
  );
};
export default Sidebar;