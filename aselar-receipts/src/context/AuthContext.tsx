// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAutoLogout } from '../Hooks/useAutoLogout';

export interface User {
  id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  scanOnlyMode?: boolean; // NEW
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
  extendSession: () => void;
  showWarning: boolean;
  dismissWarning: () => void;
  updateUser: (updates: Partial<User>) => void; // NEW
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// NEW: idle auto-logout settings (the idle limit is now 4 minutes, warning 30 seconds before)
const IDLE_TIMEOUT_MS = 4 * 60 * 1000;
const WARNING_MS = 30 * 1000;

// NEW: should an idle auto-logout also forget today's seller name, so the next login asks for it again?
// true  = the seller popup appears after every login (safest on a shared till)
// false = an idle auto-logout keeps the seller name (manual logout and expired logins always clear it)
const CLEAR_SELLER_ON_AUTO_LOGOUT = true;

// Routes that are part of the onboarding flow — auto-logout should be
// suspended on these, since there's nothing sensitive to protect yet
// and a user reading/typing for more than 2 minutes shouldn't get bounced
// mid-signup. Adjust these paths to match your actual router config exactly.
const ONBOARDING_ROUTES = [
  
  '/get-started',
  '/sign-up',
  "/create-passcode",
  '/banking',
  '/user-agreements',
  
];

// NEW: pages anyone can open without being logged in (besides onboarding and the home page).
// Used to decide whether a missing or expired login should send the visitor to /sign-in.
// IMPORTANT: check this against your router and add any other public page.
const EXTRA_PUBLIC_ROUTES = [
  '/sign-in',
  '/forgot-password',
  '/reset-password',
  '/goodbye',
];

// NEW: exported so GlobalErrorHandler can use the same list
export const isPublicPath = (pathname: string): boolean =>
  pathname === '/' ||
  ONBOARDING_ROUTES.some((route) => pathname.startsWith(route)) ||
  EXTRA_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

// NEW: reads the expiry (in ms) from the token payload. This only READS the token;
// the server still verifies the signature on every request.
const getTokenExpiryMs = (token: string): number | null => {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

// NEW: a token is usable only if we can read it and its expiry is still in the future
const isTokenUsable = (token: string): boolean => {
  const expiryMs = getTokenExpiryMs(token);
  return expiryMs !== null && expiryMs > Date.now();
};

// NEW: forget the seller name(s) remembered on this device
const clearSellerKeys = (): void => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('sellerName_'))
      .forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.warn('Could not clear seller names', err);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // NEW: always point at the latest navigate, so the callbacks below can stay stable
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const isAuthenticated = !!user;

  const isOnboarding = ONBOARDING_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Handle logout warning
  // CHANGED: stable function. It used to be re-created on every render, so when the warning
  // appeared (a state change -> re-render) the idle timers restarted and the 30-second countdown
  // was never honoured.
  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  // Dismiss warning
  const dismissWarning = () => {
    setShowWarning(false);
  };

  // Extend session (reset the auto-logout timer)
  const extendSession = () => {
    setShowWarning(false);
    // The useAutoLogout hook will automatically reset when there's activity
    // You could also trigger a manual session extension API call here if needed
    console.log('Session extended');
  };

  // CHANGED: one place that ends the session (stable, so the idle timers aren't disturbed)
  const endSession = useCallback((reason: 'auto_logout' | 'manual_logout') => {
    const token = localStorage.getItem('token');

    // NEW: tell the server so this token is blacklisted and can't be reused. Fire-and-forget:
    // if it fails, this browser is still logged out locally. Skipped when the token is already
    // dead (expired / invalid), since there is nothing left to cancel.
    if (token && isTokenUsable(token)) {
      fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, timestamp: new Date().toISOString() }),
      }).catch(() => {
        /* offline or server down */
      });
    }

    // Clear user data
    setUser(null);
    setShowWarning(false);

    // Clear token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');

    // NEW: forget the seller name so the next person at this device is asked who they are
    if (reason !== 'auto_logout' || CLEAR_SELLER_ON_AUTO_LOGOUT) {
      clearSellerKeys();
    }

    // Clear any other auth-related data
    sessionStorage.clear();

    // Redirect to login page
    navigateRef.current('/sign-in', { replace: true });

    console.log(reason === 'auto_logout' ? 'Session ended due to inactivity' : 'Logged out');
  }, []);

  // Used by the idle auto-logout
  const handleLogout = useCallback(() => endSession('auto_logout'), [endSession]);

  // Manual logout function (also used when a session is found to be dead)
  const logout = useCallback(() => endSession('manual_logout'), [endSession]);

  // Login function
  const login = (userData: User, token: string) => {
    setUser(userData);
    setShowWarning(false);
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };
// Inside AuthProvider, alongside login/logout:
const updateUser = (updates: Partial<User>) => {
  setUser(prev => {
    if (!prev) return prev;
    const updated = { ...prev, ...updates };
    localStorage.setItem('userData', JSON.stringify(updated));
    return updated;
  });
};
  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      if (!isTokenUsable(token)) {
        // NEW: an old login was left behind (for example the phone was asleep when the idle
        // logout was due). Treat it as logged out right away, so SignIn doesn't bounce the user
        // into the dashboard and the seller popup doesn't appear with a dead session.
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        clearSellerKeys();

        if (!isPublicPath(location.pathname)) {
          toast.error('Session expired. Please login again.', { toastId: 'session-expired' });
          navigateRef.current('/sign-in', { replace: true });
        }
      } else {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
        }
      }
    }
    
    setIsLoading(false);
  }, []);

  // NEW: if the login is cleared in ANOTHER tab (logout there), log out here too.
  // The browser only fires this event in the other tabs, never in the tab that made the change.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const loginCleared = event.key === null || (event.key === 'token' && !event.newValue);
      if (!loginCleared) return;

      setUser(null);
      setShowWarning(false);
      navigateRef.current('/sign-in', { replace: true });
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Use auto logout hook with warning support
  // Disabled while on onboarding routes — see ONBOARDING_ROUTES above.
  useAutoLogout({
    timeout: IDLE_TIMEOUT_MS,
    warningTime: WARNING_MS,
    onWarning: handleWarning,
    onLogout: handleLogout,
    isAuthenticated,
    enabled: !isOnboarding,
  });

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    isLoading,
    extendSession,
    showWarning,
    dismissWarning,
     updateUser, // NEW
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};