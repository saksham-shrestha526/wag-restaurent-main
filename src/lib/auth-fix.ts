// Add this interceptor to handle 401 errors globally
export const setupAuthInterceptor = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    // If we get a 401 on /api/me, clear auth
    if (response.status === 401 && args[0]?.toString().includes('/api/me')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-logout'));
    }
    
    return response;
  };
};