// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAutoLogout } from '../Hooks/useAutoLogout';

export interface User {
  id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  // Add other user properties as needed
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!user;

  const isOnboarding = ONBOARDING_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Handle logout warning
  const handleWarning = () => {
    setShowWarning(true);
  };

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

  // Handle logout (both manual and auto)
  const handleLogout = () => {
    // Clear user data
    setUser(null);
    setShowWarning(false);
    
    // Clear token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    
    // Clear any other auth-related data
    sessionStorage.clear();
    
    // Redirect to login page
    navigate('/sign-in', { replace: true });
    
    // Optional: Show logout message
    console.log('Session expired due to inactivity');
  };

  // Manual logout function
  const logout = () => {
    handleLogout();
  };

  // Login function
  const login = (userData: User, token: string) => {
    setUser(userData);
    setShowWarning(false);
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }
    }
    
    setIsLoading(false);
  }, []);

  // Use auto logout hook with warning support
  // Disabled while on onboarding routes — see ONBOARDING_ROUTES above.
  useAutoLogout({
    timeout: 2 * 60 * 1000, // 2 minutes
    warningTime: 30 * 1000, // 30 seconds warning
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