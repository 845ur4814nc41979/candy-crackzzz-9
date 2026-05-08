import { useEffect } from 'react';
import { Link } from 'wouter';
import { Check } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { motion } from 'framer-motion';

export default function OrderSuccessRewards() {
  const { clearCart, settings } = useAppContext();

  useEffect(() => {
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center container mx-auto px-4 text-center py-20">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
          className="w-32 h-32 md:w-40 md:h-40 bg-primary/20 border-4 border-primary rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,0,255,0.4)]"
        >
          <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <Check className="w-16 h-16 md:w-20 md:h-20 text-primary drop-shadow-lg" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-primary"
        >
          IT&apos;S OFFICIAL!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-foreground font-bold max-w-2xl mx-auto mb-4"
        >
          Your order request has been submitted.
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-muted-foreground font-medium max-w-xl mx-auto mb-12"
        >
          We&apos;ll review the details and contact you within 24 hours to confirm everything and arrange payment.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto"
        >
          {settings.enableRewards && (
            <Link href="/rewards" className="inline-block w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg font-black rounded-xl bg-card border-border">
                GO TO REWARDS
              </Button>
            </Link>
          )}
          <Link href="/menu" className="inline-block w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-black rounded-xl">BACK TO MENU</Button>
          </Link>
          <Link href="/gallery" className="inline-block w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg font-black rounded-xl bg-card border-border">VIEW GALLERY</Button>
          </Link>
        </motion.div>
      </div>
    </PageLayout>
  );
}
