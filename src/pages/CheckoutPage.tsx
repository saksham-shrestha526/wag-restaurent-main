import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/cart-context';
import { useSettings } from '@/lib/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CreditCard, Wallet, Truck, CheckCircle2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  const taxRatePercent = parseFloat(settings.taxRate) / 100;
  const serviceChargePercent = parseFloat(settings.serviceCharge) / 100;

  const subtotal = total;
  const serviceCharge = subtotal * serviceChargePercent;
  const tax = (subtotal + serviceCharge) * taxRatePercent;
  const finalTotal = subtotal + serviceCharge + tax;

  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    notes: ''
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    const id = toast.loading('Initializing secure checkout...');
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
          subtotal,
          tax,
          service_charge: serviceCharge,
          total_amount: finalTotal,
          payment_method: paymentMethod,
          shipping_info: shippingInfo
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.checkoutUrl) {
          toast.loading('Redirecting to secure gateway...', { id });
          window.location.href = data.checkoutUrl;
        } else {
          toast.success('Order placed successfully!', { id });
          clearCart();
          navigate(`/order-success/${data.orderId}`);
        }
      } else {
        toast.error(data.message || 'Failed to initialize order', { id });
      }
    } catch (error) {
      toast.error('Network Error. Please try again.', { id });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/menu');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-12">
        <Button variant="ghost" onClick={() => navigate('/cart')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-4xl font-bold italic serif text-white">Checkout</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Shipping & Payment */}
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Truck className="h-5 w-5 text-primary" /> Delivery Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Full Name</Label>
                <Input 
                  required
                  placeholder="John Doe" 
                  className="bg-muted/50 border-white/10 text-white"
                  value={shippingInfo.name}
                  onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <Input 
                  required
                  type="email"
                  placeholder="john@example.com" 
                  className="bg-muted/50 border-white/10 text-white"
                  value={shippingInfo.email}
                  onChange={e => setShippingInfo({...shippingInfo, email: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-white/80">Delivery Address</Label>
                <Input 
                  required
                  placeholder="Street, Suite, Road..." 
                  className="bg-muted/50 border-white/10 text-white"
                  value={shippingInfo.address}
                  onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Phone Number</Label>
                <Input 
                  required
                  placeholder="+977 98..." 
                  className="bg-muted/50 border-white/10 text-white"
                  value={shippingInfo.phone}
                  onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Order Notes (Optional)</Label>
                <Input 
                  placeholder="Allergies, door code..." 
                  className="bg-muted/50 border-white/10 text-white"
                  value={shippingInfo.notes}
                  onChange={e => setShippingInfo({...shippingInfo, notes: e.target.value})}
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5 text-primary" /> Payment Method
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <CreditCard className="h-8 w-8 text-white" />
                <span className="font-medium text-white">Credit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('khalti')}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  paymentMethod === 'khalti' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Wallet className="h-8 w-8 text-white" />
                <span className="font-medium text-white">Khalti / eSewa</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Truck className="h-8 w-8 text-white" />
                <span className="font-medium text-white">Cash on Delivery</span>
              </button>
            </div>
            
            {paymentMethod === 'card' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-3xl glass border border-primary/20 bg-primary/5 space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CreditCard className="h-24 w-24" />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Secure Stripe Gateway</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  You will be securely redirected to our verified Stripe payment page to complete your luxury transaction. No card data is stored on our servers.
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <div className="h-8 w-12 bg-white/10 rounded flex items-center justify-center border border-white/10">
                     <span className="text-[8px] font-bold text-white">VISA</span>
                  </div>
                  <div className="h-8 w-12 bg-white/10 rounded flex items-center justify-center border border-white/10">
                     <span className="text-[8px] font-bold text-white">MASTER</span>
                  </div>
                  <div className="h-8 w-12 bg-white/10 rounded flex items-center justify-center border border-white/10">
                     <span className="text-[8px] font-bold text-white">AMEX</span>
                  </div>
                </div>
              </motion.div>
            )}
          </section>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-4">
          <Card className="glass border-white/10 sticky top-32">
            <CardHeader>
              <CardTitle className="serif italic text-white">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-white/5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge ({settings.serviceCharge}%)</span>
                  <span>${serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT ({settings.taxRate}%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-white/10">
                  <span className="text-white">Total</span>
                  <span className="text-primary">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit"
                disabled={loading}
                className="w-full gold-gradient text-primary-foreground font-bold h-14"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Place Order
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;