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

const fetchSetting = async (): Promise<boolean> => {
  try {
    const res = await axios.get(settingUrl(), {
      ...authConfig(),
      params: { _t: Date.now() },
    });
    cachedValue = !!res.data?.enabled;
  } catch (err) {
    console.error('Failed to load discount setting — keeping discounts locked', err);
    cachedValue = false; // fail safe: locked
  }
  return cachedValue;
};

export const useDiscountEnabled = (): [boolean, (value: boolean) => Promise<void>, boolean] => {
  // [enabled, setEnabled, loading]
  const [enabled, setEnabledState] = useState<boolean>(cachedValue ?? false);
  const [loading, setLoading] = useState<boolean>(cachedValue === null);

  useEffect(() => {
    let cancelled = false;

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
      setEnabledState(cachedValue);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch (err: any) {
      console.error('Failed to save discount setting', err);
      toast.error(err.response?.data?.message || 'Failed to update discount setting');
    }
  }, []);

  return [enabled, update, loading];
};