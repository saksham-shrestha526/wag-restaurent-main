import React from 'react';
import { motion } from 'motion/react';
import { Award, Users, History, Heart } from 'lucide-react';

import { useSettings } from '@/lib/settings-context';

const AboutPage = () => {
  const { settings } = useSettings();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-24">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="text-center lg:text-left -mt-8 max-w-3xl"
        >
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            A Legacy of <br /><span className="text-primary italic">Excellence</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0"
          >
            Founded in 1998, {settings.restaurantName} began with a simple vision: to redefine luxury dining through 
            uncompromising quality and innovative culinary techniques.
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            Over the decades, we have grown from a boutique bistro into a world-renowned 
            Michelin-starred destination. Our commitment to sourcing the rarest ingredients 
            remains at the heart of everything we do.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-6 flex items-center space-x-2"
          >
            <span className="text-xl font-bold text-primary">25+</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Years of Craft Excellence</span>
          </motion.div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-24">
        <AboutStat icon={<Award className="h-8 w-8" />} title="3 Michelin Stars" desc="Awarded for our culinary innovation." delay={0.1} />
        <AboutStat icon={<Users className="h-8 w-8" />} title="Master Chefs" desc="Led by Chef de Cuisine Julian Vales." delay={0.2} />
        <AboutStat icon={<History className="h-8 w-8" />} title="Rich History" desc="Over two decades of excellence." delay={0.3} />
        <AboutStat icon={<Heart className="h-8 w-8" />} title="Passion" desc="Every dish is a labor of love." delay={0.4} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto"
      >
        <h2 className="text-4xl font-bold mb-8">The <span className="text-primary">{settings.restaurantName.split(' ')[0]}</span> Philosophy</h2>
        <p className="text-muted-foreground text-lg italic leading-relaxed">
          "Cooking is not just about ingredients; it's about capturing a moment in time, 
          a feeling of pure indulgence that stays with you long after the meal is over."
        </p>
        <div className="mt-8 font-bold text-primary uppercase tracking-widest">— Julian Vales, Executive Chef — {settings.restaurantName}</div>
      </motion.div>
    </motion.div>
  );
};

const AboutStat = ({ icon, title, desc, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="text-center p-8 glass rounded-2xl border-white/5"
  >
    <div className="text-primary mb-4 flex justify-center">{icon}</div>
    <h4 className="font-bold text-lg mb-2">{title}</h4>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </motion.div>
);

export default AboutPage;
