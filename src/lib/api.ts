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
  login: (email: string, password: string) =>
    request<{ success: boolean; user: any }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getMe: () => request('/api/me'),
  getMenu: () => request('/api/menu'),
  getAdminStats: () => request('/api/admin/stats'),
  getReservations: () => request('/api/reservations'),
  createReservation: (data: any) => request('/api/reservations', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: () => request('/api/messages'),
  getAdminOrders: () => request('/api/admin/orders'),
  getAdminUsers: () => request('/api/admin/users'),
  getAdminChatLogs: () => request('/api/admin/chat-logs'),
  getAdminNewsletter: () => request('/api/admin/newsletter'),
  contact: (data: any) => request('/api/contact', { method: 'POST', body: JSON.stringify(data) }),
  chat: (message: string) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  concierge: (messages: any[], userName?: string) =>
    request('/api/concierge', { method: 'POST', body: JSON.stringify({ messages, userName }) }),
  health: () => request('/api/health'),
};

export default api;