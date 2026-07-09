// services/sessionApi.ts

// Create headers for requests (adds Bearer token; cookies still sent as fallback)
const createHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Create fetch options with credentials to include cookies
const createFetchOptions = (method: string, body?: any): RequestInit => {
  return {
    method,
    credentials: 'include',
    headers: createHeaders(),
    ...(body && { body: JSON.stringify(body) })
  };
};

// Lock user session
export const lockUserSession = async (reason: 'inactivity' | 'navigation' = 'inactivity') => {
  try {
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/lock`,
      createFetchOptions('POST', { reason })
    );

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error locking session:', error);
    return { success: false, error };
  }
};

// Check session status
export const checkSessionStatus = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/status`,
      createFetchOptions('GET')
    );

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error checking session status:', error);
    return { success: false, error };
  }
};

// Clear cookies and redirect to login
export const clearSessionAndRedirect = () => {
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
  document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
  localStorage.removeItem('token');
  window.location.href = '/sign-in';
};

// Enhanced logout function
export const logoutUser = async () => {
  try {
    await lockUserSession('navigation');
    clearSessionAndRedirect();
  } catch (error) {
    console.error('Error during logout:', error);
    clearSessionAndRedirect();
  }
};