import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Printer, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface OrderDetails {
  id: number;
  order_number: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/user/orders/${id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-primary text-2xl font-bold italic serif"
        >
          Preparing your receipt...
        </motion.div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Order Not Found</h1>
        <Link to="/menu">
          <Button variant="outline" className="border-white/10">Return to Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/20 text-primary mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Order Confirmed</h1>
        <p className="text-muted-foreground">Thank you for choosing WAG luxury dining.</p>
        <p className="text-sm font-mono mt-4 text-primary">ID: {order.order_number}</p>
      </motion.div>

      <Card className="glass border-white/10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="serif italic text-2xl">Official Receipt</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => window.print()} className="hover:bg-primary/10">
            <Printer className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Issued To</p>
              <p className="font-bold">Valued Guest</p>
              <p className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Payment Status</p>
              <p className={`font-bold uppercase ${order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                {order.payment_status}
              </p>
              <p className="text-muted-foreground text-xs">WAG-POS-V5</p>
            </div>
          </div>

          <div className="h-px bg-white/5 my-2" />

          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex gap-4 items-center">
                  <span className="text-primary font-mono w-4">{item.quantity}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/5 my-2" />

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Service Charge (10%)</span>
              <span>${order.service_charge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (13%)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-white/10">
              <span>Grand Total</span>
              <span className="gold-text">${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-white/5 border-t border-white/5 flex flex-col gap-4 p-8">
          <div className="text-center w-full space-y-1">
            <p className="text-xs text-muted-foreground">Our concierge will contact you shortly to confirm delivery.</p>
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Lumière Hospitality Group</p>
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <Link to="/menu" className="w-full">
          <Button variant="outline" className="w-full border-white/10 h-14 rounded-2xl group">
            <ShoppingBag className="mr-2 h-5 w-5 group-hover:text-primary transition-colors" /> Order More
          </Button>
        </Link>
        <Link to="/account" className="w-full">
          <Button className="w-full gold-gradient text-primary-foreground font-bold h-14 rounded-2xl">
            My Account <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
      
      <Link to="/">
        <Button variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-white">
          <Home className="mr-2 h-4 w-4" /> Back to Entrance
        </Button>
      </Link>
    </div>
  );
};

export default OrderSuccess;
