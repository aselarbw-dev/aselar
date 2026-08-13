// hooks/useAutoLogout.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLogoutProps {
  timeout?: number;
  warningTime?: number;
  onWarning?: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  enabled?: boolean; // NEW: separate gate, e.g. false during onboarding
}

export const useAutoLogout = ({ 
  timeout = 2 * 60 * 1000, // 4 minutes
  warningTime =30 * 1000, // 30 seconds warning
  onWarning,
  onLogout,
  isAuthenticated,
  enabled = true // NEW: defaults to true so existing behavior is unchanged unless explicitly disabled
}: UseAutoLogoutProps) => {
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const isActiveRef = useRef(true);
  const lastActivityRef = useRef<number>(Date.now());
  const validationIntervalRef = useRef<number | null>(null);

  // The hook should only actually run when BOTH conditions hold:
  // the user is authenticated AND this feature is enabled for the current context.
  const shouldTrack = isAuthenticated && enabled;

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

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/validate-session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const resetTimeout = useCallback(async () => {
    if (!shouldTrack) return;
    
    clearTimeouts();
    lastActivityRef.current = Date.now();
    
    const now = Date.now();
    const timeSinceLastCheck = now - (lastActivityRef.current || 0);
    
    if (timeSinceLastCheck > 30000) {
      const isValidSession = await validateSession();
      if (!isValidSession) {
        onLogout();
        return;
      }
    }
    
    if (onWarning && warningTime < timeout) {
      warningRef.current = window.setTimeout(() => {
        if (shouldTrack && isActiveRef.current) {
          onWarning();
        }
      }, timeout - warningTime);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      if (shouldTrack && isActiveRef.current) {
        onLogout();
      }
    }, timeout);

    if (!validationIntervalRef.current) {
      validationIntervalRef.current = window.setInterval(async () => {
        if (shouldTrack) {
          const isValidSession = await validateSession();
          if (!isValidSession) {
            onLogout();
          }
        }
      }, 60000);
    }
  }, [timeout, warningTime, onLogout, onWarning, shouldTrack, clearTimeouts, validateSession]);

  const events = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ] as const;

  const handleActivity = useCallback(() => {
    if (!shouldTrack) return;
    
    const now = Date.now();
    if (now - lastActivityRef.current < 1000) return;
    
    resetTimeout();
  }, [resetTimeout, shouldTrack]);

  const handleVisibilityChange = useCallback(() => {
    isActiveRef.current = !document.hidden;
    
    if (!document.hidden && shouldTrack) {
      resetTimeout();
    }
  }, [resetTimeout, shouldTrack]);

  const handleBeforeUnload = useCallback(() => {
    clearTimeouts();
  }, [clearTimeouts]);

  useEffect(() => {
    if (!shouldTrack) {
      clearTimeouts();
      return;
    }

    resetTimeout();

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
  }, [shouldTrack, handleActivity, handleVisibilityChange, handleBeforeUnload, resetTimeout, clearTimeouts]);

  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);
};