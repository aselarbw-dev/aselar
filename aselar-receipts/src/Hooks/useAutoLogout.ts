// hooks/useAutoLogout.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLogoutProps {
  timeout?: number;
  warningTime?: number;
  onWarning?: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
}

export const useAutoLogout = ({ 
  timeout = 4 * 60 * 1000, // 4 minutes
  warningTime = 30 * 1000, // 30 seconds warning
  onWarning,
  onLogout,
  isAuthenticated 
}: UseAutoLogoutProps) => {
  // Use number instead of NodeJS.Timeout for browser environment
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const isActiveRef = useRef(true);
  const lastActivityRef = useRef<number>(Date.now());
  const validationIntervalRef = useRef<number | null>(null);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
  }, []);

  // Validate session with server using cookies
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const token=localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/validate-session`, {
        method: 'POST',
        credentials: 'include', // Important: Include cookies
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Include token in header if needed
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
      
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }, []);

  // Reset the timeout with periodic session validation
  const resetTimeout = useCallback(async () => {
    if (!isAuthenticated) return;
    
    clearTimeouts();
    lastActivityRef.current = Date.now();
    
    // Validate session periodically (every 30 seconds of activity)
    const now = Date.now();
    const timeSinceLastCheck = now - (lastActivityRef.current || 0);
    
    if (timeSinceLastCheck > 30000) { // 30 seconds
      const isValidSession = await validateSession();
      if (!isValidSession) {
        onLogout();
        return;
      }
    }
    
    // Set warning timeout
    if (onWarning && warningTime < timeout) {
      warningRef.current = window.setTimeout(() => {
        if (isAuthenticated && isActiveRef.current) {
          onWarning();
        }
      }, timeout - warningTime);
    }
    
    // Set logout timeout
    timeoutRef.current = window.setTimeout(() => {
      if (isAuthenticated && isActiveRef.current) {
        onLogout();
      }
    }, timeout);

    // Set up periodic validation (every minute)
    if (!validationIntervalRef.current) {
      validationIntervalRef.current = window.setInterval(async () => {
        if (isAuthenticated) {
          const isValidSession = await validateSession();
          if (!isValidSession) {
            onLogout();
          }
        }
      }, 60000); // 1 minute
    }
  }, [timeout, warningTime, onLogout, onWarning, isAuthenticated, clearTimeouts, validateSession]);

  // Events that indicate user activity
  const events = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ] as const;

  // Throttled activity handler - removed unused event parameter
  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    // Throttle activity detection to once per second
    if (now - lastActivityRef.current < 1000) return;
    
    resetTimeout();
  }, [resetTimeout, isAuthenticated]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    isActiveRef.current = !document.hidden;
    
    if (!document.hidden && isAuthenticated) {
      // When tab becomes visible, validate session and reset timeout
      resetTimeout();
    }
  }, [resetTimeout, isAuthenticated]);

  // Handle beforeunload
  const handleBeforeUnload = useCallback(() => {
    clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    // Set initial timeout
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { 
        passive: true, 
        capture: true 
      });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeouts();
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, handleActivity, handleVisibilityChange, handleBeforeUnload, resetTimeout, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);
};