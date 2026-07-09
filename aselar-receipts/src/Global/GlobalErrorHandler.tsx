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

  let isRedirecting = false;

const handleAuthError = (message?: string): void => {
  if (isRedirecting) return;
  isRedirecting = true;

  if (message?.includes('invalidated') || message?.includes('logged out')) {
    toast.error("You have been logged out. Please login again to access your account.");
  } else {
    toast.error("Session expired. Please login again.");
  }
  navigate('/sign-in');

  setTimeout(() => { isRedirecting = false; }, 3000);
};

  useEffect(() => {
    // 1. INTERCEPT FETCH REQUESTS
    const originalFetch = window.fetch;
   window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
  const [resource] = args;
  const url = typeof resource === 'string' ? resource : (resource as Request).url;

  try {
    const response = await originalFetch(...args);
    const clonedResponse = response.clone();

    if (response.status === 401) {
      // Don't treat the passcode-setting request itself as a "kick out" trigger
      // if it's part of onboarding — a stale token here just means retry, not logout
      const isOnboardingRequest = url.includes('/api/set-passcode') || url.includes('/api/banking');

      try {
        const data: ErrorResponse = await clonedResponse.json();
        if (!isOnboardingRequest) {
          handleAuthError(data.message);
        }
      } catch {
        if (!isOnboardingRequest) {
          handleAuthError(undefined);
        }
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