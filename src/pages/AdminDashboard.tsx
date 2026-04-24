import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Utensils, Calendar, MessageSquare, Plus, Trash2, 
  CheckCircle, XCircle, BarChart3, Settings, User as UserIcon,
  LogOut, Bot, Search, Clock, Mail, Phone, Star, ShoppingBag, Loader2, MapPin, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { settings: globalSettings, refreshSettings } = useSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, orders: 0, reservations: 0, menu: 0, revenue: 0 });
  const [reservations, setReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reservations');
  const prevCounts = useRef({ messages: 0, reservations: 0, orders: 0, users: 0 });

  const [newItem, setNewItem] = useState({ 
    name: '', description: '', price: '', category: 'Main Course', 
    is_veg: true,
    is_spicy: false, 
    image_url: '' 
  });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const [systemSettings, setSystemSettings] = useState<any>({
    restaurantName: 'WAG Luxury Dining',
    restaurantHours: 'Mon-Sun: 5:00 PM - 11:00 PM',
    restaurantPhone: '+977 1 4235678',
    restaurantAddress: 'Thamel, Kathmandu, Nepal',
    taxRate: '13',
    serviceCharge: '10',
    currency: 'USD'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const unreadReservations = reservations.filter(r => !r.is_read).length;

  const currencySymbols: Record<string, string> = {
    USD: '$',
    NPR: 'रु',
    EUR: '€',
    GBP: '£'
  };

  // Load settings from global context
  useEffect(() => {
    if (globalSettings) {
      console.log('🔄 Global settings loaded:', globalSettings);
      setSystemSettings({
        restaurantName: globalSettings.restaurantName || 'WAG Luxury Dining',
        restaurantHours: globalSettings.restaurantHours || 'Mon-Sun: 5:00 PM - 11:00 PM',
        restaurantPhone: globalSettings.restaurantPhone || '+977 1 4235678',
        restaurantAddress: globalSettings.restaurantAddress || 'Thamel, Kathmandu, Nepal',
        taxRate: globalSettings.taxRate || '13',
        serviceCharge: globalSettings.serviceCharge || '10',
        currency: globalSettings.currency || 'USD'
      });
      setMapUrl(globalSettings.map_url || '');
    }
  }, [globalSettings]);

  const fetchData = useCallback(async (isPoll = false) => {
    const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<any> => {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) return null;
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return await res.json();
      } catch (error) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, retries - 1, delay * 2);
        }
        return null;
      }
    };

    try {
      const results = await Promise.allSettled([
        fetchWithRetry('/api/admin/stats'),
        fetchWithRetry('/api/reservations'),
        fetchWithRetry('/api/admin/orders'),
        fetchWithRetry('/api/messages'),
        fetchWithRetry('/api/menu'),
        fetchWithRetry('/api/admin/users'),
        fetchWithRetry('/api/admin/chat-logs'),
        fetchWithRetry('/api/admin/newsletter')
      ]);

      const [statsRes, resRes, ordersRes, msgRes, menuRes, usersRes, chatRes, newsRes] = results;

      // ✅ FIX: Map backend 'menuItems' to frontend 'menu'
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const statsData = statsRes.value;
        setStats(prev => ({ 
          ...prev, 
          ...statsData,
          menu: statsData.menuItems ?? statsData.menu ?? prev.menu
        }));
      }
      if (resRes.status === 'fulfilled' && Array.isArray(resRes.value)) setReservations(resRes.value);
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) setOrders(ordersRes.value);
      if (msgRes.status === 'fulfilled' && Array.isArray(msgRes.value)) setMessages(msgRes.value);
      if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value)) setMenuItems(menuRes.value);
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) setUsers(usersRes.value);
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value)) setChatLogs(chatRes.value);
      if (newsRes.status === 'fulfilled' && Array.isArray(newsRes.value)) setNewsletterSubscribers(newsRes.value);
      
      if (isPoll && resRes.status === 'fulfilled' && Array.isArray(resRes.value) && ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        const resData = resRes.value;
        const orderData = ordersRes.value;
        const msgData = msgRes.status === 'fulfilled' ? msgRes.value : [];
        const userData = usersRes.status === 'fulfilled' ? usersRes.value : [];
        
        const newUnreadMsgs = Array.isArray(msgData) ? msgData.filter((m: any) => !m.is_read).length : 0;
        const newUnreadRes = Array.isArray(resData) ? resData.filter((r: any) => !r.is_read).length : 0;

        if (newUnreadRes > prevCounts.current.reservations && resData.length > 0) {
          toast.success(`New reservation: ${resData[0].name}`, {
            description: `${resData[0].date} at ${resData[0].time}`,
            icon: <Calendar className="h-4 w-4 text-primary" />
          });
        }
        
        if (orderData.length > prevCounts.current.orders && orderData.length > 0) {
          toast.success(`New order: #${orderData[0].id}`, {
            description: `From ${orderData[0].customer_name}`,
            icon: <ShoppingBag className="h-4 w-4 text-green-500" />
          });
        }

        prevCounts.current = { 
          messages: newUnreadMsgs, 
          reservations: newUnreadRes,
          orders: orderData.length,
          users: Array.isArray(userData) ? userData.length : prevCounts.current.users
        };
      } else if (!isPoll) {
        const resData = resRes.status === 'fulfilled' && Array.isArray(resRes.value) ? resRes.value : [];
        const orderData = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? ordersRes.value : [];
        const msgData = msgRes.status === 'fulfilled' && Array.isArray(msgRes.value) ? msgRes.value : [];
        const userData = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : [];

        prevCounts.current = { 
          messages: msgData.filter((m: any) => !m.is_read).length, 
          reservations: resData.filter((r: any) => !r.is_read).length,
          orders: orderData.length,
          users: userData.length
        };
      }
    } catch (error) {
      console.error('Admin Dashboard Sync Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user, fetchData]);

  const markReservationRead = async (id: number) => {
    await fetch(`/api/reservations/${id}/read`, { method: 'PATCH', credentials: 'include' });
    setReservations(reservations.map(r => r.id === id ? { ...r, is_read: 1 } : r));
  };

  const markMessageRead = async (id: number) => {
    await fetch(`/api/messages/${id}/read`, { method: 'PATCH', credentials: 'include' });
    setMessages(messages.map(m => m.id === id ? { ...m, is_read: 1 } : m));
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
        toast.success(`Order #${id} marked as ${status}`);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const updatePaymentStatus = async (id: number, payment_status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payment_status })
      });
      if (res.ok) {
        setOrders(orders.map(o => o.id === id ? { ...o, payment_status } : o));
        toast.success(`Order #${id} payment marked as ${payment_status}`);
      }
    } catch (err) {
      toast.error('Failed to update payment');
    }
  };

  const updateReservationStatus = async (id: number, status: string) => {
    await fetch(`/api/reservations/${id}/status`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    setReservations(reservations.map(r => r.id === id ? { ...r, status } : r));
    toast.success(`Reservation ${status}`);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const payload = {
        ...newItem,
        is_veg: newItem.is_veg ? 1 : 0,
        is_spicy: newItem.is_spicy ? 1 : 0
      };
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Item added successfully');
        setNewItem({ name: '', description: '', price: '', category: 'Main Course', is_veg: true, is_spicy: false, image_url: '' });
        setIsAddDialogOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to add item');
      }
    } catch (error) {
      toast.error('Network error or server unavailable');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsUpdating(true);
    try {
      const payload = {
        ...editingItem,
        is_veg: editingItem.is_veg ? 1 : 0,
        is_spicy: editingItem.is_spicy ? 1 : 0
      };
      const res = await fetch(`/api/menu/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Item updated successfully');
        setIsEditDialogOpen(false);
        setEditingItem(null);
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to update item');
      }
    } catch (error) {
      toast.error('Network error or server unavailable');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      console.log('💾 Saving settings:', systemSettings);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(systemSettings)
      });
      if (res.ok) {
        await refreshSettings();
        const freshRes = await fetch('/api/settings', { credentials: 'include' });
        if (freshRes.ok) {
          const freshSettings = await freshRes.json();
          setSystemSettings(prev => ({ ...prev, ...freshSettings }));
          if (freshSettings.map_url) setMapUrl(freshSettings.map_url);
        }
        toast.success(`System settings updated – currency is now ${systemSettings.currency}`);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  const handleDeleteMenu = async (id: number) => {
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setMenuItems(menuItems.filter((item: any) => item.id !== id));
        toast.success('Item deleted');
        setItemToDelete(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const getDietaryBadges = (item: any) => {
    const badges = [];
    if (item.is_veg === 1) badges.push({ label: '🌱 Veg', className: 'bg-green-500/10 text-green-500 border-green-500/20' });
    else if (item.is_veg === 0) badges.push({ label: '🍖 Non-Veg', className: 'bg-red-500/10 text-red-500 border-red-500/20' });
    if (item.is_spicy === 1) badges.push({ label: '🌶️ Spicy', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' });
    return badges;
  };

  const currentCurrencySymbol = currencySymbols[systemSettings.currency] || '$';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-primary">Admin Dashboard</h1>
            <Button variant="ghost" size="icon" className="mt-1 text-muted-foreground hover:text-primary" onClick={() => fetchData()} disabled={loading}>
              <Clock className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-muted-foreground">Manage your luxury restaurant operations.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold">{user.name}</div>
            <div className="text-xs text-primary uppercase tracking-widest">Administrator</div>
          </div>
          <Button variant="outline" size="icon" onClick={logout} className="border-white/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        <StatCard title="Total Users" value={stats.users} icon={<Users className="h-6 w-6" />} color="text-blue-500" />
        <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingBag className="h-6 w-6" />} color="text-green-500" />
        <StatCard title="Reservations" value={stats.reservations} icon={<Calendar className="h-6 w-6" />} color="text-primary" />
        <StatCard title="Menu Items" value={stats.menu} icon={<Utensils className="h-6 w-6" />} color="text-purple-500" />
        <StatCard title="Total Revenue" value={`${currentCurrencySymbol}${(stats.revenue || 0).toFixed(2)}`} icon={<BarChart3 className="h-6 w-6" />} color="text-orange-500" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="overflow-x-auto pb-4 -mb-4 no-scrollbar">
          <TabsList className="glass border-white/10 p-1 w-fit min-w-full flex-nowrap justify-start">
            <TabsTrigger value="reservations" className="data-[state=active]:gold-gradient whitespace-nowrap relative">
              Reservations
              {unreadReservations > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full text-white">
                  {unreadReservations}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:gold-gradient whitespace-nowrap relative">
              Orders
              {orders.filter((o: any) => o.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[10px] flex items-center justify-center rounded-full text-black font-bold">
                  {orders.filter((o: any) => o.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:gold-gradient whitespace-nowrap">Menu Management</TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:gold-gradient whitespace-nowrap relative">
              Messages
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full text-white">
                  {unreadMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:gold-gradient whitespace-nowrap">Customer Records</TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:gold-gradient whitespace-nowrap">AI Logs</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:gold-gradient whitespace-nowrap">Settings</TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:gold-gradient whitespace-nowrap">My Profile</TabsTrigger>
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <TabsContent value="orders">
              <Card className="glass border-white/10">
                <CardHeader><CardTitle>Active Orders</CardTitle><CardDescription>Monitor and manage real-time culinary orders.</CardDescription></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <div className="min-w-[1000px] space-y-4 pr-4">
                      {orders.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">No orders found.</div>
                      ) : (
                        orders.map((order: any) => (
                          <div key={order.id} className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs text-primary/70">#{order.order_number || order.id}</span>
                                  <Badge variant={order.status === 'pending' ? 'outline' : order.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">
                                    {order.status}
                                  </Badge>
                                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'} className="capitalize">
                                    {order.payment_status}
                                  </Badge>
                                </div>
                                <div className="font-bold">{order.customer_name}</div>
                                <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                  {currentCurrencySymbol}{order.total_amount?.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-white/10">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => { setSelectedOrder(order); setIsOrderDetailsOpen(true); }}>
                                  View Details
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                {order.status === 'pending' && (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-3" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                                    Confirm Order
                                  </Button>
                                )}
                                {order.payment_status !== 'paid' && (
                                  <Button size="sm" variant="ghost" className="text-blue-500 hover:bg-blue-500/10 h-8 px-3" onClick={() => updatePaymentStatus(order.id, 'paid')}>
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* RESERVATIONS TAB */}
          {activeTab === 'reservations' && (
            <TabsContent value="reservations">
              <Card className="glass border-white/10">
                <CardHeader><CardTitle>Recent Reservations</CardTitle><CardDescription>Manage table bookings and guest requests.</CardDescription></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] w-full">
                    <div className="min-w-[800px] pr-4">
                      {reservations.length === 0 ? (
                        <div className="text-center py-24">
                          <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="h-8 w-8 text-muted-foreground opacity-20" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">No Reservations Found</h3>
                          <p className="text-muted-foreground max-w-xs mx-auto">When customers book tables, they will appear here in real-time.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/10 text-muted-foreground text-sm uppercase tracking-widest font-bold">
                              <th className="pb-4 font-bold text-[10px]">Guest Details</th>
                              <th className="pb-4 font-bold text-[10px]">Date & Time</th>
                              <th className="pb-4 font-bold text-[10px]">Party Size</th>
                              <th className="pb-4 font-bold text-[10px]">Status</th>
                              <th className="pb-4 font-bold text-[10px] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {reservations.map((res: any) => (
                              <tr key={res.id} className={`text-sm transition-colors hover:bg-white/5 ${!res.is_read ? 'bg-primary/5' : ''}`} onMouseEnter={() => !res.is_read && markReservationRead(res.id)}>
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    {!res.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                                    <div>
                                      <div className="font-bold flex items-center gap-2">
                                        {res.name}
                                        {res.notes && <Badge variant="outline" className="h-4 px-1 text-[8px] gold-border text-primary">NOTE</Badge>}
                                      </div>
                                      <div className="text-xs text-muted-foreground">{res.email} • {res.phone}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /><span>{res.date}</span></div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><Clock className="h-3.5 w-3.5" /><span>{res.time}</span></div>
                                </td>
                                <td className="py-4"><div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span>{res.guests} Guests</span></div></td>
                                <td className="py-4"><Badge variant="outline" className={res.status === 'pending' ? 'border-yellow-500/30 text-yellow-500' : res.status === 'confirmed' ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}>{res.status.toUpperCase()}</Badge></td>
                                <td className="py-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    {res.status === 'pending' && (
                                      <>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg" onClick={() => updateReservationStatus(res.id, 'confirmed')}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirm</Button>
                                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10 h-8 px-3 rounded-lg" onClick={() => updateReservationStatus(res.id, 'cancelled')}><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                                      </>
                                    )}
                                    <Dialog>
                                      <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 px-3 text-primary hover:bg-primary/10 rounded-lg">View Request</Button></DialogTrigger>
                                      <DialogContent className="glass border-white/10 sm:max-w-md">
                                        <DialogHeader><DialogTitle className="text-xl">Reservation Details</DialogTitle><DialogDescription>Full request information for {res.name}</DialogDescription></DialogHeader>
                                        <div className="space-y-6 pt-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1 text-left"><Label className="text-[10px] uppercase text-muted-foreground tracking-widest">Guest</Label><div className="font-bold">{res.name}</div><div className="text-xs text-muted-foreground underline">{res.email}</div><div className="text-xs text-muted-foreground">{res.phone}</div></div>
                                            <div className="space-y-1 text-right"><Label className="text-[10px] uppercase text-muted-foreground tracking-widest">Schedule</Label><div className="font-bold">{res.date}</div><div className="text-sm font-bold text-primary">{res.time}</div><div className="text-xs text-muted-foreground">{res.guests} Guests</div></div>
                                          </div>
                                          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2"><Label className="text-[10px] uppercase text-muted-foreground tracking-widest block text-left">Special Requests / Notes</Label><p className="text-sm leading-relaxed italic text-white/80 text-left">{res.notes || "No special requests provided."}</p></div>
                                          <div className="flex justify-between items-center pt-4 border-t border-white/5"><div className="text-[10px] text-muted-foreground uppercase">Received: {new Date(res.created_at).toLocaleString()}</div><Badge className={res.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}>{res.status.toUpperCase()}</Badge></div>
                                          {res.status === 'pending' && (<div className="grid grid-cols-2 gap-3 pt-2"><Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateReservationStatus(res.id, 'confirmed')}>Confirm Booking</Button><Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => updateReservationStatus(res.id, 'cancelled')}>Cancel Booking</Button></div>)}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <TabsContent value="menu">
              <Card className="glass border-white/10">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div><CardTitle>Menu Management</CardTitle><CardDescription>View, add, or remove items from your restaurant menu.</CardDescription></div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gold-gradient text-primary-foreground font-bold px-6 h-11 rounded-xl shadow-lg shadow-primary/20 group">
                        <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" /> Add New Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-white/10 sm:max-w-md">
                      <DialogHeader><DialogTitle>Add New Dish</DialogTitle><DialogDescription>Create a new culinary masterpiece for your menu.</DialogDescription></DialogHeader>
                      <form onSubmit={handleAddItem} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>Name</Label><Input required placeholder="e.g. Golden Truffle" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="bg-muted/50 border-white/10" /></div>
                          <div className="space-y-2"><Label>Price ({currentCurrencySymbol})</Label><Input type="number" step="0.01" required placeholder="0.00" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="bg-muted/50 border-white/10" /></div>
                        </div>
                        <div className="space-y-2"><Label>Category</Label>
                          <select className="w-full h-10 rounded-lg border border-white/10 bg-muted/50 px-3 text-sm outline-none focus:border-primary" value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})}>
                            <option value="Appetizer">Appetizer</option><option value="Main Course">Main Course</option><option value="Dessert">Dessert</option><option value="Drinks">Drinks</option>
                          </select>
                        </div>
                        <div className="space-y-2"><Label>Description</Label><Input placeholder="Brief description..." value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="bg-muted/50 border-white/10" /></div>
                        <div className="space-y-2"><Label>Image URL</Label><Input placeholder="https://images.unsplash.com/..." value={newItem.image_url} onChange={(e) => setNewItem({...newItem, image_url: e.target.value})} className="bg-muted/50 border-white/10" /></div>
                        <div className="space-y-2"><Label>Dietary Type</Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="vegType" checked={newItem.is_veg === true} onChange={() => setNewItem({...newItem, is_veg: true})} className="accent-primary" /><span className="text-sm">🌱 Vegetarian</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="vegType" checked={newItem.is_veg === false} onChange={() => setNewItem({...newItem, is_veg: false})} className="accent-primary" /><span className="text-sm">🍖 Non-Veg</span></label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="is_spicy_new" checked={newItem.is_spicy} onChange={(e) => setNewItem({...newItem, is_spicy: e.target.checked})} className="h-4 w-4 rounded border-white/10 bg-muted/50 accent-primary" />
                          <Label htmlFor="is_spicy_new" className="text-xs cursor-pointer">🌶️ Spicy</Label>
                        </div>
                        <Button type="submit" disabled={isAdding} className="w-full gold-gradient text-primary-foreground font-bold h-11">{isAdding ? <Loader2 className="animate-spin h-5 w-5" /> : 'Add to Menu'}</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search menu items..." className="pl-10 bg-muted/50 border-white/10 focus:border-primary" value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} /></div>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {menuItems.filter((item: any) => item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.category.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">{menuSearch ? "No items match your search." : "No menu items found. Start by adding one!"}</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {menuItems.filter((item: any) => item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.category.toLowerCase().includes(menuSearch.toLowerCase())).sort((a, b) => b.id - a.id).map((item: any) => (
                            <div key={item.id} className="group flex items-center gap-4 p-3 glass rounded-2xl border-white/5 hover:border-primary/30 transition-all">
                              <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-gray-800">
                                <img src={item.image_url || 'https://picsum.photos/seed/food/200'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" onError={(e: any) => { e.target.onerror = null; e.target.src = 'https://picsum.photos/seed/food/200'; }} />
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-0.5"><span className="font-bold truncate">{item.name}</span><Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/20 text-primary uppercase tracking-tighter">{item.category}</Badge></div>
                                <div className="text-xs text-muted-foreground line-clamp-1 mb-1">{item.description || 'No description provided.'}</div>
                                <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-bold text-primary">{currentCurrencySymbol}{item.price.toFixed(2)}</span>{getDietaryBadges(item).map((badge, idx) => (<Badge key={idx} variant="outline" className={`text-[10px] h-5 px-1.5 ${badge.className}`}>{badge.label}</Badge>))}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 rounded-xl" onClick={() => { setEditingItem({...item, is_veg: item.is_veg === 1, is_spicy: item.is_spicy === 1}); setIsEditDialogOpen(true); }}><Settings className="h-4 w-4" /></Button>
                                <Dialog open={itemToDelete === item.id} onOpenChange={(open) => !open && setItemToDelete(null)}>
                                  <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-xl" onClick={() => setItemToDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></DialogTrigger>
                                  <DialogContent className="glass border-white/10 max-w-xs"><DialogHeader><DialogTitle>Delete Item?</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader><div className="flex gap-3 pt-4"><Button variant="outline" className="flex-1 border-white/10" onClick={() => setItemToDelete(null)}>Cancel</Button><Button variant="destructive" className="flex-1" onClick={() => handleDeleteMenu(item.id)}>Delete</Button></div></DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'messages' && (
            <TabsContent value="messages">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card className="glass border-white/10">
                    <CardHeader><CardTitle>Guest Messages</CardTitle><CardDescription>Direct inquiries from the contact form.</CardDescription></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                          {messages.length === 0 ? <div className="text-center py-12 text-muted-foreground">No messages yet.</div> : messages.map((msg: any) => (
                            <div key={msg.id} className={`p-6 glass rounded-2xl border border-white/5 transition-all hover:border-primary/30 ${!msg.is_read ? 'bg-primary/5' : ''}`} onMouseEnter={() => !msg.is_read && markMessageRead(msg.id)}>
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${!msg.is_read ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white'}`}>{msg.name[0]}</div><div><div className="font-bold flex items-center gap-2">{msg.name}{!msg.is_read && <Badge className="h-4 text-[8px] px-1 bg-primary">NEW</Badge>}</div><div className="text-xs text-muted-foreground">{msg.email}</div></div></div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(msg.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">{msg.subject}</div>
                              <p className="text-sm text-muted-foreground leading-relaxed bg-black/20 p-4 rounded-xl italic">"{msg.message}"</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-8">
                  <Card className="glass border-white/10">
                    <CardHeader><CardTitle className="text-lg">Newsletter Subs</CardTitle><CardDescription>Direct marketing outreach.</CardDescription></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[520px]">
                        <div className="space-y-3">
                          {newsletterSubscribers.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground italic">No subscribers yet.</p> : newsletterSubscribers.map((sub: any) => (
                            <div key={sub.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all"><div className="min-w-0"><p className="text-xs font-medium truncate">{sub.email}</p><p className="text-[10px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p></div><Mail className="h-3 w-3 text-primary opacity-50 shrink-0 ml-2" /></div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {activeTab === 'users' && (
            <TabsContent value="users">
              <Card className="glass border-white/10">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div><CardTitle>Customer Records</CardTitle><CardDescription>Detailed overview of your registered customers and their activity.</CardDescription></div>
                    <div className="relative w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customers..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10 bg-muted/50 border-white/10 h-9" /></div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse">Retrieving records...</p></div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl bg-white/5"><Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" /><p className="text-muted-foreground font-medium">No customer records found.</p><p className="text-xs text-muted-foreground/60 mt-1">If this persists, your administrative session may have expired.</p><Button variant="outline" size="sm" className="mt-6 gold-border" onClick={() => fetchData()}>Retry Sync</Button></div>
                  ) : (
                    <ScrollArea className="h-[500px] w-full">
                      <table className="w-full text-left min-w-[900px]">
                        <thead>
                          <tr className="border-b border-white/10 text-muted-foreground text-sm">
                            <th className="pb-4 font-medium">Customer (Nickname)</th>
                            <th className="pb-4 font-medium">Customer ID</th>
                            <th className="pb-4 font-medium">Contact</th>
                            <th className="pb-4 font-medium text-center">Orders</th>
                            <th className="pb-4 font-medium text-center">Total Spent</th>
                            <th className="pb-4 font-medium text-center">Loyalty Points</th>
                            <th className="pb-4 font-medium text-right">Joined</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {users.filter((u: any) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.nickname && u.nickname.toLowerCase().includes(userSearch.toLowerCase())) || (u.customer_id && u.customer_id.toLowerCase().includes(userSearch.toLowerCase()))).map((u: any) => (
                            <tr key={u.id} className="text-sm hover:bg-white/5 transition-colors">
                              <td className="py-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">{u.nickname?.[0] || u.name?.[0] || 'U'}</div><div><div className="font-bold">{u.nickname || u.name}</div><div className="text-[10px] text-muted-foreground">{u.name}</div><Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-muted-foreground mt-1">{u.role}</Badge></div></div></td>
                              <td className="py-4 font-mono text-xs text-primary/80">{u.customer_id}</td>
                              <td className="py-4"><div className="flex flex-col"><span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" /> {u.email}</span>{u.phone && <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1"><Phone className="h-3 w-3" /> {u.phone}</span>}</div></td>
                              <td className="py-4 text-center font-bold">{u.order_count || 0}</td>
                              <td className="py-4 text-center"><span className="text-primary font-bold">{currentCurrencySymbol}{(u.total_spent || 0).toFixed(2)}</span></td>
                              <td className="py-4 text-center"><div className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-primary fill-primary transform -translate-y-[0.5px]" /><span className="font-bold">{u.loyalty_points}</span></div></td>
                              <td className="py-4 text-right text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'chat' && (
            <TabsContent value="chat">
              <Card className="glass border-white/10">
                <CardHeader><CardTitle>AI Assistant Logs</CardTitle><CardDescription>Monitor interactions between guests and the AI Concierge.</CardDescription></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {chatLogs.length === 0 ? <div className="text-center py-12 text-muted-foreground">No chat logs yet.</div> : chatLogs.map((log: any) => (
                        <div key={log.id} className="p-4 glass rounded-xl border-white/5 flex gap-4"><div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${log.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>{log.role === 'assistant' ? <Bot size={16} /> : <UserIcon size={16} />}</div><div className="flex-grow"><div className="flex justify-between items-center mb-1"><span className="text-xs font-bold uppercase tracking-widest">{log.role}</span><span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span></div><p className="text-sm text-muted-foreground">{log.content}</p></div></div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'settings' && (
            <TabsContent value="settings">
              <Card className="glass border-white/10">
                <CardHeader><CardTitle>System Settings</CardTitle><CardDescription>Configure global application parameters for WAG.</CardDescription></CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4"><h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em]">General Information</h3><div className="space-y-4"><div className="space-y-2"><Label>Restaurant Name</Label><Input value={systemSettings.restaurantName} onChange={(e) => setSystemSettings({...systemSettings, restaurantName: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Business Hours</Label><Input value={systemSettings.restaurantHours} onChange={(e) => setSystemSettings({...systemSettings, restaurantHours: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Contact Phone</Label><Input value={systemSettings.restaurantPhone} onChange={(e) => setSystemSettings({...systemSettings, restaurantPhone: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Address</Label><Input value={systemSettings.restaurantAddress} onChange={(e) => setSystemSettings({...systemSettings, restaurantAddress: e.target.value})} className="bg-muted/50 border-white/10" /></div></div></div>
                    <div className="space-y-4"><h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Fees & Taxes</h3><div className="space-y-4"><div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={systemSettings.taxRate} onChange={(e) => setSystemSettings({...systemSettings, taxRate: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Service Charge (%)</Label><Input type="number" value={systemSettings.serviceCharge} onChange={(e) => setSystemSettings({...systemSettings, serviceCharge: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Currency</Label>
                        <select value={systemSettings.currency || 'USD'} onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})} className="w-full h-10 rounded-lg border border-white/10 bg-muted/50 px-3 text-sm outline-none focus:border-primary">
                          <option value="USD">USD ($)</option><option value="NPR">NPR (रु)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                      <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full gold-gradient text-primary-foreground font-bold h-11 mt-6">{savingSettings ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save System Settings'}</Button>
                      <div className="pt-8 mt-8 border-t border-white/5"><h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-4">Development Tools</h3><p className="text-xs text-muted-foreground mb-4">Populate your dashboard with realistic sample orders and reservations for testing.</p><Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5 h-11 font-bold" onClick={async () => { const res = await fetch('/api/admin/seed-sample-data', { method: 'POST', credentials: 'include' }); if (res.ok) { toast.success('Sample data seeded successfully'); fetchData(); } else { toast.error('Failed to seed data'); } }}>Seed Sample Data</Button></div>
                    </div></div>
                  </div>
                  <div className="space-y-4 pt-8 border-t border-white/5"><h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Map Configuration</h3><div className="space-y-4"><div className="space-y-2"><Label>Google Maps Embed URL</Label><div className="flex gap-4"><Input placeholder="Paste Google Maps iframe src URL here..." value={mapUrl} onChange={(e) => { setMapUrl(e.target.value); setSystemSettings({...systemSettings, map_url: e.target.value}); }} className="bg-muted/50 border-white/10" /><Button onClick={async () => { setSavingMap(true); try { const res = await fetch('/api/settings/map-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ map_url: mapUrl }) }); if (res.ok) toast.success('Map location updated'); } catch (err) { toast.error('Failed to update map'); } finally { setSavingMap(false); } }} disabled={savingMap} className="gold-gradient text-primary-foreground font-bold">{savingMap ? <Loader2 className="animate-spin" /> : 'Save URL'}</Button></div></div><div className="aspect-video w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">{mapUrl ? <iframe src={mapUrl} width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">No map URL configured.</div>}</div></div></div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {activeTab === 'profile' && (
            <TabsContent value="profile">
              <Card className="glass border-white/10">
                <CardHeader><CardTitle>Administrator Profile</CardTitle><CardDescription>Your personal account details and activity summary.</CardDescription></CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="h-32 w-32 rounded-2xl gold-gradient flex items-center justify-center text-4xl font-bold shadow-xl overflow-hidden ring-4 ring-primary/20">{user?.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-primary-foreground">{user?.name?.[0]}</span>}</div>
                    <div className="space-y-4 flex-grow w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5"><p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Full Name</p><p className="font-bold text-lg">{user?.name}</p></div>
                        <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5"><p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Email Address</p><p className="font-bold text-lg">{user?.email}</p></div>
                        <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5"><p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Loyalty Points</p><p className="font-bold text-lg text-primary flex items-center gap-1.5"><Star className="h-4 w-4 fill-primary transform -translate-y-[0.5px]" /> {user?.loyalty_points} Points</p></div>
                        <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5"><p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Member ID</p><p className="font-bold text-lg font-mono text-primary/80">{user?.customer_id}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5"><Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white group rounded-xl px-6 h-12 font-bold" onClick={() => navigate('/account')}><UserIcon className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Go to Member Portal</Button></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>

      {/* Edit Menu Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) setEditingItem(null); setIsEditDialogOpen(open); }}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Modify existing dish details.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdateItem} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name</Label><Input required value={editingItem.name} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} className="bg-muted/50 border-white/10" /></div><div className="space-y-2"><Label>Price ({currentCurrencySymbol})</Label><Input type="number" step="0.01" required value={editingItem.price} onChange={(e) => setEditingItem({...editingItem, price: e.target.value})} className="bg-muted/50 border-white/10" /></div></div>
              <div className="space-y-2"><Label>Category</Label><select className="w-full h-10 rounded-lg border border-white/10 bg-muted/50 px-3 text-sm outline-none focus:border-primary" value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}><option value="Appetizer">Appetizer</option><option value="Main Course">Main Course</option><option value="Dessert">Dessert</option><option value="Drinks">Drinks</option></select></div>
              <div className="space-y-2"><Label>Description</Label><Input value={editingItem.description} onChange={(e) => setEditingItem({...editingItem, description: e.target.value})} className="bg-muted/50 border-white/10" /></div>
              <div className="space-y-2"><Label>Image URL</Label><Input value={editingItem.image_url} onChange={(e) => setEditingItem({...editingItem, image_url: e.target.value})} className="bg-muted/50 border-white/10" /></div>
              <div className="space-y-2"><Label>Dietary Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editVegType" checked={editingItem.is_veg === true} onChange={() => setEditingItem({...editingItem, is_veg: true})} className="accent-primary" /><span className="text-sm">🌱 Vegetarian</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editVegType" checked={editingItem.is_veg === false} onChange={() => setEditingItem({...editingItem, is_veg: false})} className="accent-primary" /><span className="text-sm">🍖 Non-Veg</span></label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_spicy_edit" checked={editingItem.is_spicy === true} onChange={(e) => setEditingItem({...editingItem, is_spicy: e.target.checked})} className="h-4 w-4 rounded accent-primary" />
                <Label htmlFor="is_spicy_edit" className="text-xs cursor-pointer">🌶️ Spicy</Label>
              </div>
              <Button type="submit" disabled={isUpdating} className="w-full gold-gradient text-primary-foreground font-bold h-11">{isUpdating ? <Loader2 className="animate-spin h-5 w-5" /> : 'Update Dish'}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl font-bold">Order Details</DialogTitle><DialogDescription>Order {selectedOrder?.order_number} • Full Summary</DialogDescription></DialogHeader>
          {selectedOrder && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4"><h3 className="font-bold text-primary flex items-center gap-2"><UserIcon className="h-4 w-4" /> Customer Information</h3><div className="space-y-2 text-sm"><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Name</span><span className="font-medium">{selectedOrder.customer_name}</span></div><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Email</span><span className="font-medium">{selectedOrder.customer_email}</span></div><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Phone</span><span className="font-medium">{selectedOrder.customer_phone || 'N/A'}</span></div></div></div><div className="space-y-4"><h3 className="font-bold text-primary flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping Details</h3><div className="space-y-2 text-sm"><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Recipient</span><span className="font-medium">{selectedOrder.shipping_name || selectedOrder.customer_name}</span></div><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Address</span><span className="font-medium text-right max-w-[150px]">{selectedOrder.shipping_address || 'Walk-in / N/A'}</span></div><div className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted-foreground">Contact</span><span className="font-medium">{selectedOrder.shipping_phone || selectedOrder.customer_phone || 'N/A'}</span></div></div></div></div>
              <div className="space-y-4"><h3 className="font-bold text-primary flex items-center gap-2"><Package className="h-4 w-4" /> Order Items</h3><div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/5">{(selectedOrder.items || []).map((item: any, idx: number) => (<div key={idx} className="flex justify-between text-sm"><span>{item.quantity}x {item.name}</span><span className="font-mono text-xs opacity-70">{currentCurrencySymbol}{(item.price * item.quantity).toFixed(2)}</span></div>))}<div className="pt-4 mt-2 border-t border-white/10 space-y-1"><div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>{currentCurrencySymbol}{selectedOrder.subtotal?.toFixed(2)}</span></div><div className="flex justify-between text-xs text-muted-foreground"><span>Service Charge</span><span>{currentCurrencySymbol}{selectedOrder.service_charge?.toFixed(2)}</span></div><div className="flex justify-between text-xs text-muted-foreground"><span>VAT (13%)</span><span>{currentCurrencySymbol}{selectedOrder.tax?.toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold text-white pt-2"><span>Total</span><span className="text-primary">{currentCurrencySymbol}{selectedOrder.total_amount?.toFixed(2)}</span></div></div></div></div>
              {selectedOrder.order_notes && (<div className="space-y-2"><h3 className="font-bold text-primary text-sm">Order Notes</h3><div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm italic text-muted-foreground">{selectedOrder.order_notes}</div></div>)}
              <div className="flex gap-4"><Button className="flex-1 gold-gradient h-12 font-bold" onClick={() => setIsOrderDetailsOpen(false)}>Close</Button><Button variant="outline" className="h-12 px-6 border-white/10" onClick={() => window.print()}>Print Invoice</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <Card className="glass border-white/10">
    <CardContent className="pt-6">
      <div className="flex justify-between items-center">
        <div><p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">{title}</p><h3 className="text-3xl font-bold">{value}</h3></div>
        <div className={`p-3 rounded-xl bg-white/5 ${color}`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;