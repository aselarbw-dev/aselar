// components/GlobalErrorHandler.tsx
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth, isPublicPath } from '../context/AuthContext';

interface ErrorResponse {
  message?: string;
  code?: string;
}

// Requests whose 401 must never be treated as "session expired".
// These are part of onboarding — a stale token here just means retry, not logout.
const isOnboardingUrl = (url?: string): boolean =>
  !!url && (url.includes('/api/set-passcode') || url.includes('/api/banking'));

// 401 = not logged in / token rejected. Some services answer 403 for a rejected token instead,
// so both statuses trigger the same check (which asks the auth server before logging anyone out).
const isAuthStatus = (status?: number): boolean => status === 401 || status === 403;

// Reads the expiry (in ms) from the token payload. This only reads the token;
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

const GlobalErrorHandler: React.FC = () => {
  const { logout, isAuthenticated } = useAuth();

  // Refs, so the fetch/axios hooks below always see the latest values
  // without being torn down and re-installed on every render.
  const logoutRef = useRef(logout);
  const isAuthenticatedRef = useRef(isAuthenticated);
  logoutRef.current = logout;
  isAuthenticatedRef.current = isAuthenticated;

  // One session check at a time, however many requests fail together
  const checkingRef = useRef<Promise<void> | null>(null);

  // When a check last found the session alive (used to avoid re-checking on every 403)
  const lastAliveAtRef = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch;

    // Is the session REALLY over? A 401 alone is not proof: a wrong passcode,
    // a signup error or a third-party service can all answer 401 as well.
    const sessionIsDead = async (): Promise<boolean> => {
      const token = localStorage.getItem('token');

      if (!token) {
        // No token, but the app thinks someone is signed in -> the login was cleared
        // somewhere else (another tab). If nobody is signed in, only treat this as a dead
        // session on pages that need a login; public pages (login, signup, forgot-password...)
        // have no session to expire.
        return isAuthenticatedRef.current || !isPublicPath(window.location.pathname);
      }

      // Fast path: the token's own expiry time has passed
      const expiryMs = getTokenExpiryMs(token);
      if (expiryMs !== null && expiryMs <= Date.now()) return true;

      // Otherwise ask the auth server. Uses the ORIGINAL fetch so this check
      // can't trigger the interceptor again.
      try {
        const res = await originalFetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        return res.status === 401 || res.status === 403;
      } catch {
        // Network problem: that is not proof the session is dead
        return false;
      }
    };

    const handleAuthError = (message?: string, status?: number): Promise<void> => {
      if (checkingRef.current) return checkingRef.current;

      // A check a moment ago found the session alive, so a 403 that follows is a permission
      // problem (for example "discounts are turned off"), not an expiry. Skip re-checking.
      if (status === 403 && Date.now() - lastAliveAtRef.current < 10000) {
        return Promise.resolve();
      }

      const run = (async () => {
        let ended = false;
        try {
          if (await sessionIsDead()) {
            ended = true;
            if (message?.includes('invalidated') || message?.includes('logged out')) {
              toast.error('You have been logged out. Please login again to access your account.', {
                toastId: 'session-expired',
              });
            } else {
              toast.error('Session expired. Please login again.', { toastId: 'session-expired' });
            }
            // Clears the token, user data and state, then goes to /sign-in.
            // Because the stale login is gone, SignIn no longer bounces you back.
            logoutRef.current();
          } else {
            lastAliveAtRef.current = Date.now();
          }
        } finally {
          if (ended) {
            // short cool-down so a burst of failing calls doesn't repeat this
            setTimeout(() => {
              checkingRef.current = null;
            }, 3000);
          } else {
            checkingRef.current = null;
          }
        }
      })();

      checkingRef.current = run;
      return run;
    };

    // 1. INTERCEPT FETCH REQUESTS
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const [resource] = args;
      const url =
        typeof resource === 'string'
          ? resource
          : resource instanceof URL
          ? resource.href
          : (resource as Request).url;

      const response = await originalFetch(...args);

      if (isAuthStatus(response.status) && !isOnboardingUrl(url)) {
        // Don't hold the caller up: read the message and check the session in the background
        const status = response.status;
        response
          .clone()
          .json()
          .then((data: ErrorResponse) => handleAuthError(data?.message, status))
          .catch(() => handleAuthError(undefined, status));
      }

      return response;
    };

    // 2. INTERCEPT AXIOS REQUESTS (the default axios instance, as used with axios.get / axios.post)
    const axiosInterceptorId = axios.interceptors.response.use(
      (response) => response,
      (error: any) => {
        if (isAuthStatus(error?.response?.status) && !isOnboardingUrl(error?.config?.url)) {
          void handleAuthError(error.response?.data?.message, error.response?.status);
        }
        return Promise.reject(error);
      }
    );

    // 3. LISTEN FOR UNHANDLED PROMISE REJECTIONS
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as any;
      if (isAuthStatus(reason?.response?.status) && !isOnboardingUrl(reason?.config?.url)) {
        void handleAuthError(reason?.response?.data?.message, reason?.response?.status);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      axios.interceptors.response.eject(axiosInterceptorId);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
};

export default GlobalErrorHandler;