import { Link, useLocation } from 'wouter';
import { Home, Grid, ShoppingBag, Phone, Settings } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileNav() {
  const [location] = useLocation();
  const { cart } = useAppContext();
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/menu', icon: Grid, label: 'Menu' },
    { href: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartItemsCount },
    { href: '/contact', icon: Phone, label: 'Contact' },
    { href: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <AnimatePresence>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1 right-2 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center"
                  >
                    {item.badge}
                  </motion.div>
                </AnimatePresence>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
