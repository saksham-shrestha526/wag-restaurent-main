import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';

const ReservationPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    date: '',
    time: '',
    guests: '2',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      date: '',
      time: '',
      guests: '2',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('Reservation request sent!');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to book reservation');
      }
    } catch (error) {
      toast.error('Failed to book reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setSubmitted(false);
    resetForm();
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle2 className="h-24 w-24 text-primary mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4">Reservation Confirmed</h1>
          <p className="text-muted-foreground mb-8">
            Thank you, {formData.name}. We have received your request for {formData.date} at {formData.time}. 
            A confirmation email has been sent to {formData.email}.
          </p>
          <Button className="gold-gradient text-primary-foreground" onClick={handleNewBooking}>
            Make Another Booking
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-5xl font-bold mb-6">Reserve Your <span className="text-primary">Table</span></h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Secure your place at WAG. Whether it's an intimate dinner or a grand celebration, 
            our team is dedicated to making your evening unforgettable.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold">Opening Hours</h4>
                <p className="text-sm text-muted-foreground">{settings.restaurantHours}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold">Private Events</h4>
                <p className="text-sm text-muted-foreground">Available for groups up to 50 guests.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Card className="glass border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Please fill in the form to request a reservation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    required 
                    className="bg-muted/50 border-white/10" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    required 
                    className="bg-muted/50 border-white/10"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    type="tel" 
                    required 
                    className="bg-muted/50 border-white/10"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Guests</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20" 
                    required 
                    className="bg-muted/50 border-white/10"
                    value={formData.guests}
                    onChange={(e) => setFormData({...formData, guests: e.target.value})}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                    <Input 
                      type="date" 
                      required 
                      className="bg-muted/50 border-white/10 pl-10 text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white z-10 pointer-events-none" />
                    <Input 
                      type="time" 
                      required 
                      className="bg-muted/50 border-white/10 pl-10 text-white"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Special Requests / Notes</Label>
                <textarea 
                  className="w-full min-h-[100px] bg-muted/50 border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-white"
                  placeholder="Tell us about allergies, special occasions, or table preferences..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold h-12" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Confirm Reservation
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ReservationPage;