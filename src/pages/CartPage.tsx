import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const CartPage = () => {
  const { items, removeFromCart, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-8 opacity-20" />
        <h1 className="text-4xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added any delicacies yet.</p>
        <Link to="/menu">
          <Button className="gold-gradient text-primary-foreground font-bold px-8 h-12">
            Browse Menu
          </Button>
        </Link>
      </div>
    );
  }

  const serviceCharge = total * 0.1;
  const grandTotal = total + serviceCharge;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-5xl font-bold mb-12">
        Your <span className="text-primary">Order</span>
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-6 rounded-2xl border-white/5 flex items-center gap-6"
            >
              <img src={item.image_url} alt={item.name} className="w-24 h-24 rounded-xl object-cover" referrerPolicy="no-referrer" />
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-white">{item.name}</h3>
                <p className="text-primary font-bold">${item.price.toFixed(2)}</p>
                <div className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</div>
              </div>
              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFromCart(item.id)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="glass border-white/10 sticky top-32">
            <CardContent className="pt-6 space-y-6">
              <h3 className="text-2xl font-bold text-white mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge (10%)</span>
                  <span>${serviceCharge.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                className="w-full gold-gradient text-primary-foreground font-bold h-14 text-lg" 
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Place Order <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                Secure Payment Powered by Lumière
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CartPage;