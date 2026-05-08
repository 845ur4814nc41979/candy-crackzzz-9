import PageLayout from '@/components/layout/PageLayout';
import ProductCard from '@/components/ui/ProductCard';
import { useAppContext } from '@/context/AppContext';
import { motion } from 'framer-motion';

export default function SeasonalPage() {
  const { products } = useAppContext();
  
  const seasonalProducts = products.filter(p => p.isVisible && p.isSeasonal);

  return (
    <PageLayout>
      <div className="bg-card border-b border-border py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/10" />
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            <span className="inline-block py-2 px-6 bg-accent text-accent-foreground font-black uppercase tracking-widest rounded-full mb-6 text-sm md:text-base shadow-xl">
              Limited Availability
            </span>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              SEASONAL SPECIALS
            </h1>
            <p className="text-xl md:text-2xl font-bold text-foreground/80 max-w-2xl mx-auto">
              Get them before they melt away. These exclusive flavors are here for a good time, not a long time.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {seasonalProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {seasonalProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
            <h3 className="text-3xl font-black mb-4">No Seasonal Items Right Now</h3>
            <p className="text-xl text-muted-foreground font-bold">Check back soon for our next limited drop!</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
