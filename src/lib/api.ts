const API_BASE_URL = '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  return data as T;
}

export const api = {
  // ============ AUTHENTICATION ============
  login: (email: string, password: string) =>
    request<{ success: boolean; user: any }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  logout: () => request('/api/logout', { method: 'POST' }),
  
  getMe: () => request('/api/me'),
  
  register: (name: string, email: string, password: string, recaptchaToken: string) =>
    request<{ success: boolean; message: string }>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, recaptchaToken }),
    }),
  
  // ============ PASSWORD RESET / OTP ============
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  verifyResetCode: (email: string, code: string) =>
    request<{ success: boolean; message: string }>('/api/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  
  resetPassword: (email: string, code: string, password: string) =>
    request<{ success: boolean; message: string }>('/api/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, password }),
    }),
  
  resendVerification: (email: string) =>
    request<{ success: boolean; message: string }>('/api/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  resendResetCode: (email: string) =>
    request<{ success: boolean; message: string }>('/api/resend-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  
  // ============ MENU ============
  getMenu: () => request('/api/menu'),
  
  // ============ ADMIN ============
  getAdminStats: () => request('/api/admin/stats'),
  getReservations: () => request('/api/reservations'),
  getAdminOrders: () => request('/api/admin/orders'),
  getAdminUsers: () => request('/api/admin/users'),
  getAdminChatLogs: () => request('/api/admin/chat-logs'),
  getAdminNewsletter: () => request('/api/admin/newsletter'),
  
  // ============ RESERVATIONS ============
  createReservation: (data: any) => request('/api/reservations', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  
  // ============ MESSAGES & CONTACT ============
  getMessages: () => request('/api/messages'),
  contact: (data: any) => request('/api/contact', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  
  // ============ CHAT & AI ============
  chat: (message: string) => request('/api/chat', { 
    method: 'POST', 
    body: JSON.stringify({ message }) 
  }),
  
  concierge: (messages: any[], userName?: string) =>
    request('/api/concierge', { 
      method: 'POST', 
      body: JSON.stringify({ messages, userName }) 
    }),
  
  // ============ HEALTH CHECK ============
  health: () => request('/api/health'),
};

export default api;