import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Package, Calendar, Settings, LogOut, ChevronRight, 
  Star, Mail, Clock, MapPin, CreditCard, Bell, ShieldCheck,
  MessageSquare, ArrowRight, CheckCircle, Plus, Trash2, Wallet, X, Loader2, LayoutDashboard, Globe
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Order {
  id: number;
  total_amount: number;
  status: string;
  points_earned: number;
  created_at: string;
  items: { name: string; quantity: number; price: number }[];
}

interface Reservation {
  id: number;
  date: string;
  time: string;
  guests: number;
  status: string;
  created_at: string;
}

const AccountPage = () => {
  const { user, logout, login, checkAuth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [addingCard, setAddingCard] = useState(false);
  
  const [formData, setFormData] = useState({
    nickname: user?.nickname || user?.name || '',
    avatar_url: user?.avatar_url || ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Poll notifications every 10 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/user/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleEditStart = () => {
    if (user) {
      setFormData({
        nickname: user.nickname || user.name,
        avatar_url: user.avatar_url || ''
      });
      setAvatarPreview(user.avatar_url || null);
      setSelectedFile(null);
    }
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size too large. Maximum is 2MB.');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile) return formData.avatar_url || null;

    const formDataUpload = new FormData();
    formDataUpload.append('avatar', selectedFile);

    try {
      // Use the dedicated avatar endpoint (same as /api/upload but more specific)
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formDataUpload
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }
      const data = await res.json();
      if (data.success && data.avatar_url) {
        toast.success('Photo uploaded successfully');
        return data.avatar_url;
      }
      throw new Error('Upload response invalid');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      return null;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let newAvatarUrl = formData.avatar_url;
      if (selectedFile) {
        setUploading(true);
        const uploadedUrl = await uploadAvatar();
        setUploading(false);
        if (uploadedUrl) newAvatarUrl = uploadedUrl;
        else {
          setSaving(false);
          return;
        }
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname: formData.nickname, avatar_url: newAvatarUrl })
      });
      
      if (res.status === 401) {
        const isValid = await checkAuth();
        if (!isValid) {
          toast.error('Session expired. Please log in again.');
          navigate('/login');
          return;
        }
      }

      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully');
        // Update the auth context with new user data
        login(data.user);
        // Update local state
        setFormData({ nickname: data.user.nickname, avatar_url: data.user.avatar_url });
        setAvatarPreview(data.user.avatar_url);
        setSelectedFile(null);
        setIsEditing(false);
        // No need to reload the page
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('An error occurred while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || user.name,
        avatar_url: user.avatar_url || ''
      });
      setAvatarPreview(user.avatar_url || null);
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/account-details', { credentials: 'include' });
      if (res.status === 401) {
        const isValid = await checkAuth();
        if (!isValid) {
          console.warn('AccountPage: Session sync lost.');
        }
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setReservations(Array.isArray(data.reservations) ? data.reservations : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setPaymentMethods(Array.isArray(data.paymentMethods) ? data.paymentMethods : []);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast.error('Failed to sync account data');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/user/notifications/${id}/read`, { 
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.status === 401) {
        logout();
        return;
      }
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/user/notifications/read-all', { 
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.status === 401) {
        logout();
        return;
      }
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      toast.success('All marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deletePaymentMethod = async (id: number) => {
    try {
      const res = await fetch(`/api/user/payment-methods/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.status === 401) {
        logout();
        return;
      }
      setPaymentMethods(paymentMethods.filter(p => p.id !== id));
      toast.success('Payment method removed');
    } catch (error) {
      toast.error('Failed to remove payment method');
    }
  };

  const setDefaultPaymentMethod = async (id: number) => {
    try {
      const res = await fetch(`/api/user/payment-methods/${id}/default`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        setPaymentMethods(paymentMethods.map(m => ({ ...m, is_default: m.id === id ? 1 : 0 })));
        toast.success('Default payment method updated');
      } else {
        toast.error('Could not set as default');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const openStripePortal = async () => {
    setAddingCard(true);
    const id = toast.loading('Connecting to secure payment gateway...');
    try {
      const res = await fetch('/api/user/portal-session', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.status === 401) {
        toast.error('Session expired. Please log in again.', { id });
        setAddingCard(false);
        return;
      }

      const data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, '_blank');
        toast.success('Secure payment portal opened in new tab', { id });
      } else {
        toast.error(data.message || 'Failed to open payment portal', { id });
      }
    } catch (error) {
      toast.error('Connection error', { id });
    } finally {
      setAddingCard(false);
    }
  };

  if (authLoading) return null;
  if (!user && !loading) {
    return (
      <div className="min-h-screen py-20 px-4 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 glass border-white/10 rounded-[2rem] text-center">
            <div className="h-20 w-20 rounded-2xl bg-red-500/10 mx-auto mb-8 flex items-center justify-center">
              <LogOut className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">Session Disconnected</h2>
            <p className="text-muted-foreground mb-10 leading-relaxed max-w-sm mx-auto">
              Your luxury credentials could not be synchronized with our servers.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/login')} className="gold-gradient px-8 py-6 h-14 font-bold rounded-xl shadow-xl">
                Login
              </Button>
              <Button 
                variant="outline" 
                onClick={async () => {
                  const isValid = await checkAuth();
                  if (isValid) {
                    toast.success('Session restored successfully');
                    fetchData();
                  } else {
                    window.location.reload();
                  }
                }} 
                className="px-8 py-6 h-14 font-bold rounded-xl border-white/10"
              >
                Refresh Sync
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen py-12 pb-20 px-4 sm:px-6 lg:px-8 bg-black"
    >
      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-12">
          <div className="h-48 w-full rounded-3xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-white/5">
            <div className="absolute inset-0 backdrop-blur-3xl opacity-50" />
          </div>
          
          <div className="absolute -bottom-16 sm:-bottom-8 left-0 right-0 sm:left-8 sm:right-auto flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:space-x-6 px-4">
            <div className="relative group">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden border-4 border-black bg-zinc-900 shadow-2xl mx-auto">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="pb-4 sm:pb-8 flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{user.nickname || user.name}</h1>
                <Badge variant="outline" className="gold-border text-primary font-bold px-3 text-[10px] sm:text-xs h-6">
                  {user.customer_id}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-4 text-xs sm:text-sm text-white/50">
                <span className="flex items-center"><User className="h-3.5 w-3.5 mr-1.5 opacity-70" /> {user.name}</span>
                <span className="h-1 w-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center"><Mail className="h-3.5 w-3.5 mr-1.5 opacity-70" /> {user.email}</span>
                <span className="h-1 w-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center font-bold text-primary">
                  <Star className="h-3.5 w-3.5 mr-1.5 fill-primary transform -translate-y-[1px]" /> 
                  {user.loyalty_points} Points
                </span>
              </div>
            </div>
          </div>
          
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {user.role === 'admin' && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary hover:text-primary/80 hover:bg-primary/5 transition-all duration-300 h-9 px-4 rounded-xl font-bold"
                onClick={() => navigate('/admin')}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/10 hover:bg-white/5 gold-border transition-all duration-300 h-9 px-4 rounded-xl"
              onClick={handleEditStart}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Sidebar and Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="glass border-white/10 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg flex items-center">
                  <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
                  Loyalty Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-primary mb-2">{user.loyalty_points}</div>
                  <div className="text-sm text-muted-foreground uppercase tracking-widest">Available Points</div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Next Reward</span>
                      <span className="text-xs text-primary">75% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-3/4 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Earn 250 more points for a complimentary dessert.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <button onClick={() => setShowNotifications(true)} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group text-left">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-4">
                      <Bell className="h-5 w-5 text-blue-500" />
                      {notifications.some(n => !n.is_read) && <span className="absolute top-3 left-10 h-2 w-2 bg-blue-500 rounded-full border border-black" />}
                    </div>
                    <div>
                      <div className="font-medium">Notifications</div>
                      <div className="text-xs text-muted-foreground">Manage your alerts</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                </button>
                <button onClick={() => setShowPaymentMethods(true)} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group text-left">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mr-4">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium">Payment Methods</div>
                      <div className="text-xs text-muted-foreground">Saved cards & wallets</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                </button>
                <button onClick={logout} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-500/10 transition-colors group">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center mr-4">
                      <LogOut className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-red-500">Logout</div>
                      <div className="text-xs text-red-500/60">Sign out of your account</div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
                <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package className="h-4 w-4 mr-2" /> Order History
                </TabsTrigger>
                <TabsTrigger value="reservations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Calendar className="h-4 w-4 mr-2" /> My Reservations
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <MessageSquare className="h-4 w-4 mr-2" /> AI Concierge
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat">
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle>AI Concierge History</CardTitle>
                    <CardDescription>Your past conversations with our digital assistant.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChatHistoryView />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Your culinary journey with us.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      {!Array.isArray(orders) || orders.length === 0 ? (
                        <div className="text-center py-20">
                          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground">No orders yet. Start your journey today.</p>
                          <Link to="/menu" className="mt-2 block"><Button variant="link" className="text-primary">View Menu</Button></Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => (
                            <div key={order.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center space-x-3 mb-1">
                                    <span className="font-bold text-lg">{`Order #${order.id}`}</span>
                                    <Badge variant="outline" className={order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : order.status === 'preparing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : order.status === 'ready' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}>
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center">
                                    <div className="flex items-center mr-4"><Clock className="h-3 w-3 mr-1" />{new Date(order.created_at).toLocaleDateString()}</div>
                                    <Link to={`/order-success/${order.id}`} className="text-primary hover:underline flex items-center">View Receipt <ArrowRight className="h-3 w-3 ml-1" /></Link>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-primary">${order.total_amount.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">+{order.points_earned} pts earned</div>
                                </div>
                              </div>
                              <div className="space-y-2 border-t border-white/5 pt-4">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground"><span className="text-white font-medium">{item.quantity}x</span> {item.name}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reservations">
                <Card className="glass border-white/10">
                  <CardHeader>
                    <CardTitle>My Reservations</CardTitle>
                    <CardDescription>Upcoming and past dining experiences.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      {!Array.isArray(reservations) || reservations.length === 0 ? (
                        <div className="text-center py-20">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground">No reservations found.</p>
                          <Link to="/reservations" className="mt-2 block"><Button variant="link" className="text-primary">Book a Table</Button></Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reservations.map((res) => (
                            <div key={res.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all flex items-center justify-between">
                              <div className="flex items-center space-x-6">
                                <div className="h-16 w-16 rounded-xl bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                                  <span className="text-xs font-bold text-primary uppercase">{new Date(res.date).toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-2xl font-bold">{new Date(res.date).getDate()}</span>
                                </div>
                                <div>
                                  <div className="font-bold text-lg mb-1">{res.time}</div>
                                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                                    <span className="flex items-center"><User className="h-3 w-3 mr-1" /> {res.guests} Guests</span>
                                    <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> Main Dining Room</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={res.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}>{res.status}</Badge>
                                <div className="mt-2"><Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-red-500">Cancel</Button></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Payment Methods Modal */}
      <AnimatePresence>
        {showPaymentMethods && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowPaymentMethods(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl glass border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div><h2 className="text-2xl font-bold">Payment Methods</h2><p className="text-sm text-muted-foreground">Manage your secure payment options.</p></div>
                  <button onClick={() => setShowPaymentMethods(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10"><CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No saved payment methods found.</p></div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div key={method.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-16 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                            {method.provider === 'visa' ? <Globe className="h-6 w-6 text-blue-400" /> : method.provider === 'mastercard' ? <CreditCard className="h-6 w-6 text-orange-400" /> : <CreditCard className="h-6 w-6 text-primary" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold capitalize">{method.provider || 'Card'} •••• {method.last4}</span>
                              {method.is_default === 1 && <Badge className="bg-primary/20 text-primary text-[10px] h-4">Default</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">Expires {method.expiry}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {method.is_default !== 1 && (<Button variant="ghost" size="sm" onClick={() => setDefaultPaymentMethod(method.id)} className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-all">Set as default</Button>)}
                          <Button variant="ghost" size="icon" onClick={() => deletePaymentMethod(method.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <Button variant="outline" className="h-14 rounded-2xl border-white/10 bg-white/5 flex flex-col items-center justify-center hover:bg-white/10 transition-all font-bold gap-1" onClick={openStripePortal}><CreditCard className="h-5 w-5 mb-1" /><span>Add Credit Card</span></Button>
                    <Button variant="outline" className="h-14 rounded-2xl border-white/10 bg-white/5 flex flex-col items-center justify-center hover:bg-white/10 transition-all font-bold gap-1" onClick={() => toast.info('Digital wallets coming soon')}><Wallet className="h-5 w-5 mb-1" /><span>Digital Wallet</span></Button>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground mt-6">Secure payments powered by Stripe. Your card details are never stored on our servers.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative h-full w-full max-w-sm bg-zinc-950 border-l border-white/10 shadow-2xl z-10 flex flex-col">
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div><h2 className="text-xl font-bold flex items-center"><Bell className="h-5 w-5 mr-3 text-primary" />Alerts</h2><p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Notification Center</p></div>
                  <button onClick={() => setShowNotifications(false)} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-all"><X className="h-4 w-4" /></button>
                </div>
                {notifications.some(n => !n.is_read) && (<button onClick={markAllAsRead} className="mb-6 w-full py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-all flex items-center justify-center group"><CheckCircle className="h-3.5 w-3.5 mr-2 group-hover:scale-110 transition-transform" />Mark all as read</button>)}
                <ScrollArea className="flex-grow -mx-2 px-2">
                  <div className="space-y-3 pb-8">
                    {!Array.isArray(notifications) || notifications.length === 0 ? (
                      <div className="text-center py-20"><div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"><Bell className="h-6 w-6 text-muted-foreground opacity-20" /></div><p className="text-muted-foreground text-sm font-medium">You're all caught up!</p><p className="text-[10px] text-muted-foreground/50 mt-1">No new notifications</p></div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} onClick={() => markAsRead(notif.id)} className={`p-4 rounded-xl border transition-all cursor-pointer group ${notif.is_read ? 'bg-transparent border-white/5 opacity-60 hover:opacity-100' : 'bg-white/5 border-white/10 shadow-sm'}`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1 min-w-0">
                              <h4 className={`text-sm font-bold flex items-center truncate ${!notif.is_read ? 'text-white' : 'text-muted-foreground'}`}>{!notif.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2 shrink-0 animate-pulse" />}{notif.title}</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{notif.message}</p>
                              <div className="text-[9px] text-muted-foreground/40 pt-1 font-mono">{new Date(notif.created_at).toLocaleDateString()}</div>
                            </div>
                            {!notif.is_read && <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] h-4 leading-none px-1.5 uppercase" variant="outline">New</Badge>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="mt-auto pt-6 border-t border-white/5"><Button variant="ghost" className="w-full text-muted-foreground hover:text-white rounded-xl h-11 text-xs" onClick={() => setShowNotifications(false)}>Close Center</Button></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal (fixed) */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditing(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-lg glass border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden">
              <button onClick={() => setIsEditing(false)} className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-all z-10"><X className="h-5 w-5" /></button>
              <div className="p-6 sm:p-8">
                <div className="mb-8"><h2 className="text-2xl font-bold text-white mb-1">Edit Profile</h2><p className="text-sm text-muted-foreground">Update your personal preferences.</p></div>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2"><Label htmlFor="nickname" className="text-xs font-medium text-white/50 ml-1">Nickname</Label><Input id="nickname" value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} className="bg-white/5 border-white/10 focus:border-primary h-12 rounded-xl px-5 text-sm transition-all hover:bg-white/10" placeholder="Your Nickname" /><p className="text-[10px] text-muted-foreground ml-1">Used by our AI Concierge.</p></div>
                    <div className="space-y-2"><Label className="text-xs font-medium text-white/50 ml-1 opacity-50">Locked Registration Info</Label><div className="bg-white/5 border border-white/5 h-12 rounded-xl px-5 flex items-center text-muted-foreground text-xs"><User className="h-3.5 w-3.5 mr-2 opacity-50" />{user.name} • Registered User</div></div>
                  </div>
                  <div className="space-y-3"><Label className="text-xs font-medium text-white/50 ml-1">Profile Photo</Label>
                    <div className="flex items-center gap-5 p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
                        {uploading ? <div className="h-full w-full flex items-center justify-center bg-white/5"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : avatarPreview ? <img src={avatarPreview} alt="Profile Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="h-full w-full flex items-center justify-center bg-white/5 text-muted-foreground"><User className="h-8 w-8" /></div>}
                      </div>
                      <div className="flex-grow"><Button type="button" variant="outline" size="sm" className="border-white/10 hover:bg-white/5 rounded-lg h-9 px-4 text-xs font-bold w-full" onClick={() => fileInputRef.current?.click()}><Plus className="h-4 w-4 mr-2" /> Change Profile Photo</Button></div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>
                  <div className="pt-2"><Button type="submit" disabled={saving || uploading} className="gold-gradient h-12 rounded-xl font-bold text-sm shadow-lg w-full">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}</Button></div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ChatHistoryView = () => {
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chat', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setHistory(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;

  return (
    <ScrollArea className="h-[500px] pr-4">
      {history.length === 0 ? (
        <div className="text-center py-20"><MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No chat history found.</p></div>
      ) : (
        <div className="space-y-4">
          {history.map((msg, idx) => (
            <div key={idx} className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-primary/10 border border-primary/20 ml-auto' : 'bg-white/5 border border-white/10 mr-auto'}`}>
              <div className="text-[10px] uppercase tracking-widest mb-1 opacity-50">{msg.role === 'user' ? 'You' : 'AI Concierge'}</div>
              <div className="text-sm leading-relaxed">{msg.content}</div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
};

export default AccountPage;