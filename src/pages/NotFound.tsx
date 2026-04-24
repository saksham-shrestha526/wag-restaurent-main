import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Compass } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[url('https://picsum.photos/seed/luxury/1920/1080?blur=10')] bg-cover bg-fixed">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full glass p-12 rounded-[2rem] border border-white/10 text-center"
      >
        <div className="mb-10">
          <motion.h1 
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="text-[120px] font-serif gold-text leading-none mb-2"
          >
            404
          </motion.h1>
          <div className="h-[1px] w-24 gold-gradient mx-auto my-6" />
        </div>
        
        <h2 className="text-3xl font-serif text-white mb-6 tracking-tight">Pathway Not Found</h2>
        <p className="text-muted-foreground mb-12 text-lg font-light leading-relaxed max-w-sm mx-auto">
          This page doesn't exist at WAG. Even in luxury, one sometimes wanders away 
          from the main entrance.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <Button 
            onClick={() => navigate('/')} 
            className="h-14 gold-gradient px-10 text-black font-bold rounded-2xl shadow-xl hover:scale-[1.05] transition-transform"
          >
            <Home className="mr-2 h-5 w-5" />
            Return to Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="h-12 border-white/10 text-white hover:bg-white/5 rounded-xl px-8"
          >
            <Compass className="mr-2 h-4 w-4" />
            Previous Page
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
