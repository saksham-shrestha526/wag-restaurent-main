// src/lib/api.ts
// Use RELATIVE URLs – rely on Vite proxy (backend runs on port 3010)
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
    const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return data as T;
}

export const api = {
  // ========== AUTH ==========
  login: async (email: string, password: string) =>
    request('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: async () => request('/api/logout', { method: 'POST' }),

  getMe: async () => request('/api/me'),

  // ========== CONTACT / MESSAGES ==========
  contact: async (data: any) => request('/api/contact', { method: 'POST', body: JSON.stringify(data) }),
  sendMessage: async (data: any) => request('/api/send-message', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: async () => request('/api/messages'),

  // ========== RESERVATIONS ==========
  getReservations: async () => request('/api/reservations'),
  createReservation: async (data: any) => request('/api/reservations', { method: 'POST', body: JSON.stringify(data) }),

  // ========== MENU ==========
  getMenu: async () => request('/api/menu'),

  // ========== ADMIN DASHBOARD ==========
  getAdminStats: async () => request('/api/admin/stats'),
  getAdminOrders: async () => request('/api/admin/orders'),
  getAdminUsers: async () => request('/api/admin/users'),
  getAdminChatLogs: async () => request('/api/admin/chat-logs'),
  getAdminNewsletter: async () => request('/api/admin/newsletter'),

  // ========== CHATBOT ==========
  chat: async (message: string) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  concierge: async (messages: any[], userName?: string) =>
    request('/api/concierge', { method: 'POST', body: JSON.stringify({ messages, userName }) }),

  // ========== UTILITIES ==========
  health: async () => request('/api/health'),
};

export default api;