import { useState, useEffect, useCallback } from 'react';

const SMS_LIMIT = 10;
const RESET_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'aselar_sms_usage';

interface SMSUsageRecord {
  count: number;
  windowStart: number; // timestamp in ms when the current window started
}

interface UseSMSLimitReturn {
  smsCount: number;
  smsLimit: number;
  isLimitReached: boolean;
  remainingSMS: number;
  msUntilReset: number;
  timeUntilReset: string; // human-readable e.g. "18h 42m"
  canSendSMS: () => boolean;
  recordSMS: () => boolean; // returns false if limit reached, true if recorded
  resetInfo: SMSUsageRecord | null;
}

const readUsage = (): SMSUsageRecord => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, windowStart: Date.now() };
    return JSON.parse(raw) as SMSUsageRecord;
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
};

const writeUsage = (record: SMSUsageRecord): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    console.error('[useSMSLimit] Failed to write SMS usage to localStorage.');
  }
};

const isWindowExpired = (windowStart: number): boolean => {
  return Date.now() - windowStart >= RESET_DURATION_MS;
};

const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const useSMSLimit = (): UseSMSLimitReturn => {
  const [usage, setUsage] = useState<SMSUsageRecord>(() => {
    const stored = readUsage();
    // Auto-reset on first read if window expired
    if (isWindowExpired(stored.windowStart)) {
      const fresh = { count: 0, windowStart: Date.now() };
      writeUsage(fresh);
      return fresh;
    }
    return stored;
  });

  // Tick every minute to keep timeUntilReset fresh in the UI
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = readUsage();
      if (isWindowExpired(stored.windowStart)) {
        const fresh = { count: 0, windowStart: Date.now() };
        writeUsage(fresh);
        setUsage(fresh);
      } else {
        // Trigger re-render so timeUntilReset updates
        setUsage({ ...stored });
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const canSendSMS = useCallback((): boolean => {
    const stored = readUsage();
    if (isWindowExpired(stored.windowStart)) return true; // window expired, reset allowed
    return stored.count < SMS_LIMIT;
  }, []);

  const recordSMS = useCallback((): boolean => {
    const stored = readUsage();

    // Window expired — reset then record
    if (isWindowExpired(stored.windowStart)) {
      const fresh: SMSUsageRecord = { count: 1, windowStart: Date.now() };
      writeUsage(fresh);
      setUsage(fresh);
      return true;
    }

    // Limit already reached
    if (stored.count >= SMS_LIMIT) {
      return false;
    }

    // Record the send
    const updated: SMSUsageRecord = { ...stored, count: stored.count + 1 };
    writeUsage(updated);
    setUsage(updated);
    return true;
  }, []);

  const msUntilReset = Math.max(
    0,
    RESET_DURATION_MS - (Date.now() - usage.windowStart)
  );

  return {
    smsCount: usage.count,
    smsLimit: SMS_LIMIT,
    isLimitReached: usage.count >= SMS_LIMIT,
    remainingSMS: Math.max(0, SMS_LIMIT - usage.count),
    msUntilReset,
    timeUntilReset: formatTimeRemaining(msUntilReset),
    canSendSMS,
    recordSMS,
    resetInfo: usage,
  };
};

export default useSMSLimit;