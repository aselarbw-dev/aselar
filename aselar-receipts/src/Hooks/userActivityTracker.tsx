// hooks/useActivityTracker.ts
import { useEffect, useRef, useCallback } from 'react';

interface ActivityTrackerOptions {
  timeoutMinutes?: number;
  onInactivity: () => void;
  onBeforeUnload: () => void;
  enabled?: boolean;
}

export const useActivityTracker = ({
  timeoutMinutes = 2,
  onInactivity,
  onBeforeUnload,
  enabled = true
}: ActivityTrackerOptions) => {
  const timeoutRef = useRef<number | null>(null);
  const isActiveRef = useRef(true);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        onInactivity();
      }
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, onInactivity, enabled]);

  const handleActivity = useCallback(() => {
    if (!enabled) return;
    isActiveRef.current = true;
    resetTimer();
  }, [resetTimer, enabled]);

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!enabled) return;
    
    // Call the callback immediately for navigation
    onBeforeUnload();
    
    // Optional: Show confirmation dialog
    // event.preventDefault();
    // event.returnValue = '';
  }, [onBeforeUnload, enabled]);

  const handlePopState = useCallback(() => {
    if (!enabled) return;
    onBeforeUnload();
  }, [onBeforeUnload, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Activity events
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Set up activity listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up navigation listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Start the timer
    resetTimer();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleActivity, handleBeforeUnload, handlePopState, resetTimer, enabled]);

  const stopTracking = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { stopTracking, resetTimer };
};