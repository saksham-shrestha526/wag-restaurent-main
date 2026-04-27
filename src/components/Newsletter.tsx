import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          subscribed: true,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (response.status === 400) {
        const error = await response.json();
        // Check if already subscribed
        if (error.message?.includes('already')) {
          toast.info('This email is already subscribed to our newsletter!');
        } else {
          toast.error(error.message || 'Invalid email address');
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error('Subscription failed');
      }
      
      toast.success('Successfully subscribed to our newsletter!');
      setEmail('');
    } catch (error) {
      console.error('Newsletter error:', error);
      toast.error('Failed to subscribe. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="flex gap-2">
      <Input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-white/10 border-white/20 text-white"
        required
      />
      <Button 
        type="submit" 
        disabled={loading}
        className="gold-gradient text-black font-semibold"
      >
        {loading ? 'Subscribing...' : 'Subscribe'}
      </Button>
    </form>
  );
};