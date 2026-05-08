import { Link, useLocation } from 'wouter';
import { useAppContext } from '../../context/AppContext';
import { ShoppingBag, Menu as MenuIcon, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoPath from "@assets/candy_crackzzz_2_1776628492110.png";

export default function Navbar() {
  const [location] = useLocation();
  const { cart, settings } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    ...(settings.enableMerch ? [{ href: '/merch', label: 'Merch' }] : []),
    ...(settings.enableRewards ? [{ href: '/rewards', label: 'Rewards' }] : []),
    ...(settings.enableSeasonalSection ? [{ href: '/seasonal', label: 'Seasonal' }] : []),
    ...(settings.enableCustomOrders ? [{ href: '/custom-orders', label: 'Custom Orders' }] : []),
    ...(settings.enableGallery ? [{ href: '/gallery', label: 'Gallery' }] : []),
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            {settings.showLogo && settings.logoBase64 ? (
              <img src={settings.logoBase64} alt={settings.businessName} className="h-10 object-contain" />
            ) : settings.showLogo ? (
              <img src={logoPath} alt="Candy Crackzzz Logo" className="h-10 object-contain" />
            ) : (
              <span className="font-black text-xl text-primary tracking-tight font-sans">
                {settings.businessName}
              </span>
            )}
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-bold tracking-wide uppercase hover:text-primary transition-colors ${location === link.href ? 'text-primary' : 'text-foreground/80'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/admin" className="hidden md:block text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
            Admin
          </Link>

          <Link href="/cart" className="relative p-2 text-foreground hover:text-primary transition-colors flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
            <AnimatePresence>
              {cartItemsCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center"
                >
                  {cartItemsCount}
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <MenuIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col pt-20 px-6 md:hidden"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-8 h-8" />
            </Button>

            <nav className="flex flex-col gap-6 items-center text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-2xl font-black uppercase tracking-wider ${location === link.href ? 'text-primary' : 'text-foreground'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px w-16 bg-border my-4" />
              <Link
                href="/admin"
                className="text-lg font-bold text-muted-foreground uppercase"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin Panel
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
