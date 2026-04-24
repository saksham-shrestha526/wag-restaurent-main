import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, ChefHat, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/lib/settings-context';

const Footer = () => {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) {
        setIsSubscribed(true);
        setEmail('');
        toast.success('Successfully subscribed to WAG newsletter!');
      } else {
        toast.error(data.message || 'Subscription failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-muted border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_1fr_1fr] gap-12 items-start">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="h-10 w-10 rounded-lg gold-gradient flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChefHat className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-3xl font-bold text-primary tracking-tighter">{settings.restaurantName.split(' ')[0]}</span>
            </Link>
            <div className="pt-5">
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Culinary artistry meets AI-powered luxury. Experience the pinnacle of gastronomy.
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/share/19bht9PG8H/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/saksham_stha2060?igsh=MWRid3JzeWhubm1oMA==" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://x.com/ShresthaSa50266" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-start">
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-base">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/menu" className="text-muted-foreground hover:text-primary text-sm transition-colors">Our Menu</Link></li>
              <li><Link to="/about" className="text-muted-foreground hover:text-primary text-sm transition-colors">Our Story</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary text-sm transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="flex flex-col items-start">
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-base">Newsletter</h4>
            <p className="text-muted-foreground text-sm mb-6">Subscribe for exclusive events and updates.</p>
            {isSubscribed ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center space-x-3 w-full">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">Thank you for joining!</span>
              </div>
            ) : (
              <form className="flex flex-col gap-3 w-full" onSubmit={handleSubscribe}>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email" 
                  required
                  disabled={isSubmitting}
                  className="bg-background border border-white/10 rounded-lg px-4 py-2.5 text-sm w-full focus:outline-none focus:border-primary transition-all disabled:opacity-50"
                />
                <button 
                  disabled={isSubmitting}
                  className="gold-gradient text-primary-foreground h-[42px] px-6 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity w-full flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Subscribe'}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-start md:pl-2">
            <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-base">Contact Info</h4>
            <ul className="space-y-4 w-full">
              <li className="flex items-start space-x-3 group">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <a 
                  href="https://maps.google.com/?q=Hetauda-07%2C%20Nagswoti" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground text-sm hover:text-primary transition-colors break-words"
                >
                  {settings.restaurantAddress}
                </a>
              </li>
              <li className="flex items-center space-x-3 group">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <a href={`tel:${settings.restaurantPhone}`} className="text-muted-foreground text-sm hover:text-primary transition-colors">
                  {settings.restaurantPhone}
                </a>
              </li>
              <li className="flex items-start space-x-3 group">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <a 
                  href="mailto:sakshamshrestha526@gmail.com" 
                  className="text-muted-foreground text-sm hover:text-primary transition-colors break-words"
                >
                  sakshamshrestha526@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div> {/* Close the grid */}

        {/* Copyright section */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} {settings.restaurantName}. All rights reserved. Designed for Excellence.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;