import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import ProductCard from '@/components/ui/ProductCard';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuPage() {
  const { products, settings } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'candy-grapes', label: 'Candy Grapes' },
    { id: 'candy-pineapple', label: 'Candy Pineapple' },
    { id: 'party-trays', label: 'Party Trays' },
    ...(settings.enableDonutzzz && settings.showDonutzzzInMenu ? [{ id: 'donutzzz', label: 'Donutzzz' }] : []),
    ...(settings.enableDirtySodazzz && settings.showDirtySodazzzInMenu ? [{ id: 'dirty-sodazzz', label: 'Dirty Sodazzz' }] : []),
    ...(settings.enableSeasonalSection ? [{ id: 'seasonal', label: 'Seasonal' }] : []),
    ...(settings.enableCustomOrders ? [{ id: 'custom', label: 'Custom Orders' }] : [])
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Only show visible products
      if (!product.isVisible) return false;
      
      // Filter by category
      if (activeCategory !== 'all' && product.category !== activeCategory) {
        // Special case for seasonal - match either category='seasonal' or isSeasonal flag
        if (activeCategory === 'seasonal' && !product.isSeasonal && product.category !== 'seasonal') return false;
        if (activeCategory !== 'seasonal' && product.category !== activeCategory) return false;
      }
      
      // Filter by search
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !product.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <PageLayout>
      <div className="bg-card border-b border-border py-12 md:py-20 relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
            THE MENU
          </h1>
          <p className="text-xl font-bold text-primary max-w-2xl mx-auto">
            Pick your poison. Everything is coated, crunched, and crafted to order.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
          <div className="w-full md:w-auto overflow-x-auto pb-2 scrollbar-hide">
            <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="bg-card h-auto p-1 border border-border">
                {categories.map((cat) => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id}
                    className="font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 px-6 rounded-xl transition-all"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Search flavors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 bg-card border-border rounded-xl font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-card rounded-3xl border border-border border-dashed mt-8"
          >
            <h3 className="text-3xl font-black mb-2 text-muted-foreground">Nothing found</h3>
            <p className="text-xl font-bold text-muted-foreground/60">Try a different search or category.</p>
            <Button 
              variant="outline" 
              className="mt-6 font-bold"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              Clear Filters
            </Button>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
}
