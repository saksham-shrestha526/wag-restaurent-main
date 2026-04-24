import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSettings } from '@/lib/settings-context';

const ContactPage = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitted(false);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Message sent successfully! We will get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setSubmitted(true);
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in <span className="text-primary">Touch</span></h1>
        <p className="text-muted-foreground">We are here to answer any questions you may have.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info */}
        <div className="space-y-6">
          <ContactInfoCard 
            icon={<Phone className="h-6 w-6" />} 
            title="Phone" 
            content={settings.restaurantPhone} 
            subContent={settings.restaurantHours}
            href={`tel:${settings.restaurantPhone}`}
          />
          <ContactInfoCard 
            icon={<Mail className="h-6 w-6" />} 
            title="Email" 
            content="sakshamshrestha526@gmail.com" 
            subContent="We reply within 24 hours"
            href="mailto:sakshamshrestha526@gmail.com"
          />
          <ContactInfoCard 
            icon={<MapPin className="h-6 w-6" />} 
            title="Location" 
            content={settings.restaurantAddress} 
            subContent="Valet parking available"
            href={`https://maps.google.com/?q=${encodeURIComponent(settings.restaurantAddress)}`}
          />
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card className="glass border-white/10 p-8">
            {submitted && (
              <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-3">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Thank you! Your message has been sent. We'll reply within 24 hours.</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Your Name</Label>
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
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  required 
                  className="bg-muted/50 border-white/10"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  required 
                  className="bg-muted/50 border-white/10 min-h-[150px]"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto gold-gradient text-primary-foreground font-bold h-12 px-10" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Map Embed */}
      <div className="mt-24 h-[400px] rounded-3xl overflow-hidden border border-white/10">
        <iframe 
          src={settings.map_url} 
          width="100%" 
          height="100%" 
          style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} 
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </motion.div>
  );
};

const ContactInfoCard = ({ icon, title, content, subContent, href }: any) => (
  <a 
    href={href} 
    target={href.startsWith('http') ? '_blank' : undefined}
    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    className="flex items-center space-x-6 p-6 glass rounded-2xl border-white/5 hover:border-primary/30 transition-all group"
  >
    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{title}</h4>
      <div className="font-bold text-base md:text-lg group-hover:text-primary transition-colors break-words">
        {content}
      </div>
      <div className="text-[10px] text-muted-foreground">{subContent}</div>
    </div>
  </a>
);

export default ContactPage;