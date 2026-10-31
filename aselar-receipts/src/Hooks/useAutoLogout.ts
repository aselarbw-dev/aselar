// hooks/useAutoLogout.ts
import { useEffect, useRef } from 'react';

interface UseAutoLogoutProps {
  timeout?: number;
  warningTime?: number;
  onWarning?: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  enabled?: boolean; // NEW: separate gate, e.g. false during onboarding
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings you may want to change
// ─────────────────────────────────────────────────────────────────────────────

// While a sale is in progress (items on the receipt), the normal idle limit is paused and this
// longer limit applies instead. It stops a forgotten, half-finished sale from keeping the account
// open all day, without kicking the cashier out in the middle of a real sale.
const SALE_IDLE_LIMIT_MS = 30 * 60 * 1000;

// How often the app asks the server whether the login is still valid (only while the app is visible)
const VALIDATE_EVERY_MS = 60 * 1000;

// How often the idle clock is checked
const TICK_MS = 1000;

// true  = time spent in another tab / with the screen off counts as idle, so someone who comes
//         back after longer than the limit is logged out straight away (a forgotten phone no longer
//         keeps its login).
// false = the idle clock only runs while this tab is visible (the old behaviour).
const COUNT_TIME_WHILE_HIDDEN = true;

// ─────────────────────────────────────────────────────────────────────────────
// "A sale is in progress" flag. The selling screen (POSContainer) switches it on while there are
// items on the receipt and off again when it is empty or the screen is closed.
// ─────────────────────────────────────────────────────────────────────────────
let saleInProgress = false;

export const setSaleInProgress = (value: boolean): void => {
  saleInProgress = value;
};

// ─────────────────────────────────────────────────────────────────────────────
// Session check
// ─────────────────────────────────────────────────────────────────────────────

// 'dead'    = the server says the login is no longer valid (401 / 403) -> log out
// 'unknown' = timeout, network problem, server restarting (5xx/503) ... that is NOT proof the
//             session is dead, so nobody is logged out because of it
type SessionState = 'valid' | 'dead' | 'unknown';

const checkSession = async (): Promise<SessionState> => {
  const token = localStorage.getItem('token');
  if (!token) return 'dead';

  try {
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/validate-session`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return data && data.success === false ? 'dead' : 'valid';
    }

    if (response.status === 401 || response.status === 403) return 'dead';

    return 'unknown';
  } catch (error) {
    console.error('Session validation failed:', error);
    return 'unknown';
  }
};

// Everything that counts as the user being active
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'keypress',
  'scroll',
  'touchstart',
  'click',
] as const;

// Once the warning is on screen, only a deliberate action keeps the session alive,
// not a stray mouse movement.
const DELIBERATE_EVENTS = new Set<string>(['mousedown', 'keydown', 'keypress', 'touchstart', 'click']);

export const useAutoLogout = ({ 
  timeout = 4 * 60 * 1000, // 4 minutes
  warningTime = 30 * 1000, // 30 seconds warning
  onWarning,
  onLogout,
  isAuthenticated,
  enabled = true // NEW: defaults to true so existing behavior is unchanged unless explicitly disabled
}: UseAutoLogoutProps) => {
  // The hook should only actually run when BOTH conditions hold:
  // the user is authenticated AND this feature is enabled for the current context.
  const shouldTrack = isAuthenticated && enabled;

  // Always hold the latest props in refs, so the timers and listeners below are set up once
  // per login and are never torn down and restarted by a re-render.
  const timeoutMsRef = useRef(timeout);
  const warningMsRef = useRef(warningTime);
  const onWarningRef = useRef(onWarning);
  const onLogoutRef = useRef(onLogout);
  timeoutMsRef.current = timeout;
  warningMsRef.current = warningTime;
  onWarningRef.current = onWarning;
  onLogoutRef.current = onLogout;

  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef(false);
  const loggingOutRef = useRef(false);
  const validatingRef = useRef(false);

  useEffect(() => {
    if (!shouldTrack) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    loggingOutRef.current = false;

    const endSession = () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      onLogoutRef.current();
    };

    // Compares "how long since the last activity" with the limit. Works from timestamps, so it is
    // correct even if the browser slowed the timers down while the tab was in the background.
    const evaluateIdle = () => {
      if (loggingOutRef.current) return;
      if (document.hidden && !COUNT_TIME_WHILE_HIDDEN) return;

      const idleFor = Date.now() - lastActivityRef.current;
      const limit = saleInProgress
        ? Math.max(SALE_IDLE_LIMIT_MS, timeoutMsRef.current)
        : timeoutMsRef.current;

      if (idleFor >= limit) {
        endSession();
        return;
      }

      if (
        onWarningRef.current &&
        warningMsRef.current < limit &&
        idleFor >= limit - warningMsRef.current &&
        !warningShownRef.current
      ) {
        warningShownRef.current = true;
        onWarningRef.current();
      }
    };

    // Asks the server whether the login is still valid. Only a real 401/403 logs anyone out.
    const validate = async () => {
      if (loggingOutRef.current || validatingRef.current) return;
      if (document.hidden) return;

      validatingRef.current = true;
      try {
        const state = await checkSession();
        if (state === 'dead') endSession();
      } finally {
        validatingRef.current = false;
      }
    };

    const handleActivity = (event: Event) => {
      if (loggingOutRef.current) return;

      if (warningShownRef.current) {
        // The warning is on screen: a stray mouse move must not quietly cancel the countdown
        if (!DELIBERATE_EVENTS.has(event.type)) return;
        warningShownRef.current = false;
      }

      lastActivityRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) return;

      if (!COUNT_TIME_WHILE_HIDDEN) {
        // Old behaviour: coming back starts a fresh idle period
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        return;
      }

      // Coming back after a long time away: log out now if the limit has passed
      // (tab/screen "focus" is deliberately NOT counted as activity, so this check sees the real gap)
      evaluateIdle();
      void validate();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const idleTimer = window.setInterval(evaluateIdle, TICK_MS);
    // A fixed timer: activity no longer postpones it (it used to be restarted by every mouse move)
    const validationTimer = window.setInterval(() => {
      void validate();
    }, VALIDATE_EVERY_MS);

    return () => {
      window.clearInterval(idleTimer);
      window.clearInterval(validationTimer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldTrack]);
};