// services/sessionApi.ts


// Create headers for requests (cookies are sent automatically)
const createHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json'
  };
};

// Create fetch options with credentials to include cookies
const createFetchOptions = (method: string, body?: any): RequestInit => {
  return {
    method,
    credentials: 'include', // This ensures cookies are sent with requests
    headers: createHeaders(),
    ...(body && { body: JSON.stringify(body) })
  };
};

// Lock user session
export const lockUserSession = async (reason: 'inactivity' | 'navigation' = 'inactivity') => {
  try {
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/lock`, 
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
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/status`, 
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
  // Clear the authentication cookie
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
  document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
  
  // Clear any localStorage items you might have
  localStorage.removeItem('token'); // Adjust based on what you store
  
  // Redirect to login page
  window.location.href = '/sign-in'; // Adjust your login route
};

// Enhanced logout function
export const logoutUser = async () => {
  try {
    // Lock session on server
    await lockUserSession('navigation');
    
    // Clear cookies and redirect
    clearSessionAndRedirect();
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if server call fails, clear cookies
    clearSessionAndRedirect();
  }
};
{/* 
  export const unlockUserSession = async () => {
  try {
    const response = await fetch('/api/unlock', 
      createFetchOptions('POST')
    );

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error unlocking session:', error);
    return { success: false, error };
  }
};
  */}
