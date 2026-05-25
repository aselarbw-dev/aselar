import { ReactNode, useState, useEffect } from 'react';

// Type definitions
interface AuthComponentProps {
  children: ReactNode;
}

// Option 1: Cookie-based authentication
const useAuthFromCookie = (): boolean => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Check for auth token in cookies
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    const authToken = getCookie('token'); // Replace 'authToken' with your cookie name
    setIsLoggedIn(!!authToken);
  }, []);

  return isLoggedIn;
};
export const ShowOnLogin: React.FC<AuthComponentProps> = ({ children }) => {
  const isLoggedIn = useAuthFromCookie(); // or useAuthFromAPI()

  if (isLoggedIn) {
    return <>{children}</>;
  }
  return null;
};

export const ShowOnLogout: React.FC<AuthComponentProps> = ({ children }) => {
  const isLoggedIn = useAuthFromCookie(); // or useAuthFromAPI()

  if (!isLoggedIn) {
    return <>{children}</>;
  }
  return null;
};
