import { useCallback, useEffect, useState } from 'react';

export const DISCOUNT_ENABLED_KEY = 'aselar_discount_enabled';
// same-tab changes don't fire the browser's "storage" event, so we dispatch our own
const CHANGE_EVENT = 'aselar-discount-setting-change';

// default is OFF — only an explicit "true" turns discounts on
const readSetting = (): boolean => {
  try {
    return localStorage.getItem(DISCOUNT_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const useDiscountEnabled = (): [boolean, (value: boolean) => void] => {
  const [enabled, setEnabled] = useState<boolean>(readSetting);

  useEffect(() => {
    const sync = () => setEnabled(readSetting());
    window.addEventListener('storage', sync); // other tabs
    window.addEventListener(CHANGE_EVENT, sync); // this tab
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const update = useCallback((value: boolean) => {
    try {
      localStorage.setItem(DISCOUNT_ENABLED_KEY, String(value));
    } catch (err) {
      console.warn('Failed to persist discount setting', err);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, update];
};