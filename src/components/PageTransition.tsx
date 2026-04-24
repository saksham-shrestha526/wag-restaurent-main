import React from 'react';
import { motion } from 'motion/react';

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;