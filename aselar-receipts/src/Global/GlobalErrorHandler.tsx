// components/GlobalErrorHandler.tsx
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface ErrorResponse {
  message?: string;
  code?: string;
}

const GlobalErrorHandler: React.FC = () => {
  const navigate = useNavigate();

  const handleAuthError = (message?: string): void => {
    if (message?.includes('invalidated') || message?.includes('logged out')) {
      toast.error("You have been logged out. Please login again to access your account.");
    } else {
      toast.error("Session expired. Please login again.");
    }
    navigate('/sign-in');
  };

  useEffect(() => {
    // 1. INTERCEPT FETCH REQUESTS
    const originalFetch = window.fetch;
    
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      try {
        const response = await originalFetch(...args);
        
        // Clone response to read it without consuming the stream
        const clonedResponse = response.clone();
        
        if (response.status === 401) {
          try {
            const data: ErrorResponse = await clonedResponse.json();
            handleAuthError(data.message);
          } catch (jsonError) {
            handleAuthError(undefined);
          }
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    // 2. INTERCEPT AXIOS REQUESTS (if you use axios anywhere)
    const setupAxiosInterceptor = (): void => {
      // Type assertion for axios global
      const axios = (window as any).axios;
      if (axios) {
        axios.interceptors.response.use(
          (response: any) => response,
          (error: any) => {
            if (error.response?.status === 401) {
              handleAuthError(error.response?.data?.message);
            }
            return Promise.reject(error);
          }
        );
      }
    };

    setupAxiosInterceptor();

    // 3. LISTEN FOR UNHANDLED PROMISE REJECTIONS
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as any;
      if (reason?.response?.status === 401) {
        handleAuthError(reason?.response?.data?.message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [navigate]);

  return null;
};

export default GlobalErrorHandler;