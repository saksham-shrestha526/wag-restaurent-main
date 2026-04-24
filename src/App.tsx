import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { SettingsProvider, useSettings } from './lib/settings-context';
import { CartProvider } from './lib/cart-context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MenuPage from './pages/MenuPage';
import ReservationPage from './pages/ReservationPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccess from './pages/OrderSuccess';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AccountPage from './pages/AccountPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import NotFound from './pages/NotFound';
import Chatbot from './components/Chatbot';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';

// Component that uses hooks and shows loading spinner
function AppContent() {
  const { isLoading: authLoading } = useAuth();
  const { isLoading: settingsLoading } = useSettings();
  const location = useLocation();

  // Show a full-screen loader while auth or settings are initializing
  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-20">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/reservations" element={<ReservationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:id" element={<OrderSuccess />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Chatbot />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
          <ErrorBoundary>
            <Router>
              <ScrollToTop />
              <AppContent />
            </Router>
          </ErrorBoundary>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;