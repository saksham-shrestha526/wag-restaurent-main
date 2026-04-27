import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/cart-context';
import { useSettings } from '@/lib/settings-context';
import { toast } from 'sonner';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_veg: number;
  is_spicy: number;
}

const MenuPage = () => {
  const { settings } = useSettings();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [filteredMenu, setFilteredMenu] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  const categories = ['All', 'Appetizer', 'Main Course', 'Dessert', 'Drinks'];

  const currencySymbols: Record<string, string> = {
    USD: '$',
    NPR: 'रु',
    EUR: '€',
    GBP: '£'
  };
  const currency = settings?.currency || 'USD';
  const symbol = currencySymbols[currency] || '$';

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/menu');
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        setMenu(data);
        setFilteredMenu(data);
      } catch (err) {
        console.error('Menu fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
        toast.error('Failed to load menu. Please refresh or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  useEffect(() => {
    let result = menu;
    if (search) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category !== 'All') {
      result = result.filter(item => item.category === category);
    }
    setFilteredMenu(result);
  }, [search, category, menu]);

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    toast.success(`${item.name} added to cart!`);
  };

  const getDietaryBadges = (item: MenuItem) => {
    const badges = [];
    if (item.is_veg === 1) {
      badges.push({ label: '🌱 Veg', className: 'bg-green-500/80 text-white border-green-500' });
    } else if (item.is_veg === 0) {
      badges.push({ label: '🍖 Non-Veg', className: 'bg-red-500/80 text-white border-red-500' });
    }
    if (item.is_spicy === 1) {
      badges.push({ label: '🌶️ Spicy', className: 'bg-orange-500/80 text-white border-orange-500' });
    }
    return badges;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our <span className="text-primary">Culinary</span> Menu</h1>
          <p className="text-muted-foreground">Loading our delicious selections...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="glass p-12 rounded-2xl max-w-md mx-auto">
          <p className="text-red-400 mb-4">⚠️ {error}</p>
          <p className="text-muted-foreground mb-6">The menu could not be loaded. This might be a temporary issue.</p>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (menu.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="glass p-12 rounded-2xl max-w-md mx-auto">
          <p className="text-muted-foreground mb-4">No menu items available at the moment.</p>
          <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our <span className="text-primary">Culinary</span> Menu</h1>
        <p className="text-muted-foreground">Savor the finest selections from WAG.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dishes..."
            className="pl-10 bg-muted/50 border-white/10 focus:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              className={category === cat ? 'gold-gradient text-primary-foreground' : 'border-white/10'}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {filteredMenu.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No dishes match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredMenu.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Card className="glass border-white/5 overflow-hidden group h-full flex flex-col">
                  <div className="relative h-56 overflow-hidden bg-gray-800">
                    <img
                      src={item.image_url || 'https://picsum.photos/seed/food/400'}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e: any) => {
                        e.target.src = 'https://picsum.photos/seed/food/400';
                      }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      {getDietaryBadges(item).map((badge, idx) => (
                        <Badge key={idx} className={badge.className}>
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold">{item.name}</CardTitle>
                      <span className="text-primary font-bold">{symbol}{item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <Button
                      className="w-full grow gold-gradient text-primary-foreground font-bold"
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart - {symbol}{item.price.toFixed(2)}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default MenuPage;