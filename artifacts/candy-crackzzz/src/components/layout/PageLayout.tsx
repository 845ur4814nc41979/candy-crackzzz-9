import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileNav from './MobileNav';
import AddToHomeScreenPrompt from './AddToHomeScreenPrompt';
import { motion } from 'framer-motion';
import LocalCandyHelper from '@/components/customer/LocalCandyHelper';

export default function PageLayout({ children, className = "" }: { children: ReactNode, className?: string }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary">
      <Navbar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex-grow ${className}`}
      >
        {children}
      </motion.main>
      <AddToHomeScreenPrompt />
      <LocalCandyHelper />
      <Footer />
      <MobileNav />
    </div>
  );
}
