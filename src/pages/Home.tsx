import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, Utensils, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Home = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setNewsletterLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Successfully subscribed to newsletter!');
        setNewsletterEmail('');
      } else {
        toast.error(data.message || 'Subscription failed');
      }
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden pt-12 pb-24">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2000" 
            alt="Luxury Dining" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full -mt-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-xs uppercase tracking-widest font-bold">
                Est. 1998 • Michelin Starred
              </Badge>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
            >
              The Art of <br />
              <span className="text-primary italic">Exquisite</span> Dining
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0"
            >
              Indulge in a symphony of flavors crafted by world-renowned chefs. 
              Where every dish tells a story of passion, precision, and luxury.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/menu" className="w-full sm:w-auto">
                <Button className="gold-gradient text-primary-foreground h-14 px-10 text-base font-bold w-full rounded-full hover:opacity-90 transition-all duration-300">
                  Explore Menu <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/reservations" className="w-full sm:w-auto">
                <Button variant="outline" className="h-14 px-10 text-base font-bold border-white/20 hover:bg-white/5 w-full rounded-full transition-all duration-300">
                  Book a Table
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 right-10 hidden lg:flex space-x-12 glass p-8 rounded-2xl border-white/10">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">4.9/5</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">15k+</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Guests</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">3</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Michelin Stars</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Features />

      {/* Gallery Preview */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Visual <span className="text-primary">Masterpieces</span></h2>
            <p className="text-muted-foreground">A glimpse into our culinary world.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square rounded-2xl overflow-hidden group"
              >
                <img 
                  src={`https://picsum.photos/seed/food${i}/400/400`} 
                  alt="Food" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <Button variant="outline" className="border-white text-white text-xs md:text-sm">View Detail</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Guest <span className="text-primary">Experiences</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'James Wilson', role: 'Food Critic', text: 'The most refined dining experience in the city. The truffle pasta is life-changing.' },
              { name: 'Elena Rodriguez', role: 'Regular Guest', text: 'WAG never fails to impress. The atmosphere and the AI assistant make everything so easy.' },
              { name: 'David Chen', role: 'Tech CEO', text: 'A perfect blend of traditional luxury and modern technology. Truly a smart restaurant.' },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 glass rounded-2xl border-white/5 italic relative group hover:border-primary/20 transition-all flex flex-col h-full"
              >
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-primary text-primary transform -translate-y-[0.5px]" />
                  ))}
                </div>
                <p className="text-base md:text-lg mb-8 leading-relaxed flex-grow">"{t.text}"</p>
                <div>
                  <div className="font-bold text-white tracking-tight">{t.name}</div>
                  <div className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER SECTION - Replaces FAQ */}
      <section className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass p-12 rounded-3xl border border-primary/20 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Mail className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 text-primary mb-6">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Subscribe to Our <span className="text-primary">Newsletter</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get exclusive updates about special events, new menu items, and offers delivered to your inbox.
              </p>
              <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  className="bg-muted/50 border-white/20 focus:border-primary h-12 flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={newsletterLoading}
                  className="gold-gradient text-primary-foreground font-bold h-12 px-8 whitespace-nowrap"
                >
                  {newsletterLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Subscribe Now'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-6">
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

const Features = () => {
  const features = [
    { icon: <Utensils className="h-8 w-8" />, title: 'Master Chefs', desc: 'Our kitchen is led by world-class culinary masters.' },
    { icon: <Star className="h-8 w-8" />, title: 'Michelin Quality', desc: 'Consistently awarded for excellence in taste and service.' },
    { icon: <Clock className="h-8 w-8" />, title: 'Perfect Timing', desc: 'Every dish is served at its absolute peak of flavor.' },
    { icon: <ShieldCheck className="h-8 w-8" />, title: 'Pure Ingredients', desc: 'We source only the finest organic and local produce.' },
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: i * 0.05,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
              className="p-8 glass rounded-2xl border-white/5 hover:border-primary/30 transition-shadow hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group overflow-hidden"
            >
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="text-primary mb-6 shrink-0"
              >
                {f.icon}
              </motion.div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Home;