import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// same-tab components using the hook stay in sync through this event
const CHANGE_EVENT = 'aselar-discount-setting-change';

const settingUrl = () =>
  `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/discount-setting`;

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  withCredentials: true,
});

// module-level cache so several components don't each hit the API
let cachedValue: boolean | null = null;
// NEW: which login (token) the cached value belongs to
let cachedToken: string | null = null;

const currentToken = (): string | null => localStorage.getItem('token');

// NEW: if a different account is logged in now, forget the old account's value
const ensureCacheMatchesLogin = () => {
  const token = currentToken();
  if (cachedToken !== token) {
    cachedValue = null;
    cachedToken = token;
  }
};

const fetchSetting = async (): Promise<boolean> => {
  const tokenAtStart = currentToken(); // NEW
  let value = false;
  try {
    const res = await axios.get(settingUrl(), {
      ...authConfig(),
      params: { _t: Date.now() },
    });
    value = !!res.data?.enabled;
  } catch (err) {
    console.error('Failed to load discount setting — keeping discounts locked', err);
    value = false; // fail safe: locked
  }
  // NEW: only keep the result if the same account is still logged in
  if (currentToken() === tokenAtStart) {
    cachedValue = value;
    cachedToken = tokenAtStart;
  }
  return value;
};

export const useDiscountEnabled = (): [boolean, (value: boolean) => Promise<void>, boolean] => {
  // [enabled, setEnabled, loading]
  // NEW: check the login before reading the cache
  const [enabled, setEnabledState] = useState<boolean>(() => {
    ensureCacheMatchesLogin();
    return cachedValue ?? false;
  });
  const [loading, setLoading] = useState<boolean>(() => cachedValue === null);

  useEffect(() => {
    let cancelled = false;

    ensureCacheMatchesLogin(); // NEW

    if (cachedValue === null) {
      fetchSetting().then((value) => {
        if (!cancelled) {
          setEnabledState(value);
          setLoading(false);
        }
      });
    }

    const sync = () => {
      if (cachedValue !== null) setEnabledState(cachedValue);
    };
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const update = useCallback(async (value: boolean) => {
    try {
      const res = await axios.put(settingUrl(), { enabled: value }, authConfig());
      cachedValue = !!res.data?.enabled;
      cachedToken = currentToken(); // NEW
      setEnabledState(cachedValue);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch (err: any) {
      console.error('Failed to save discount setting', err);
      toast.error(err.response?.data?.message || 'Failed to update discount setting');
    }
  }, []);

  return [enabled, update, loading];
};