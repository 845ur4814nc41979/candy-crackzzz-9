import { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import NativeShareButton from '@/components/share/NativeShareButton';

export default function ProductDetailPage() {
  const [, params] = useRoute('/menu/:slug');
  const [, setLocation] = useLocation();
  const { products, settings, addToCart } = useAppContext();
  
  const product = products.find(p => p.slug === params?.slug);
  
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [eventType, setEventType] = useState('');
  const [colorThemeNotes, setColorThemeNotes] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  if (!product) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-black mb-4">Product Not Found</h1>
          <Link href="/menu" className="inline-block">
            <Button size="lg" className="font-bold">Back to Menu</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
      specialInstructions,
      eventType: product.isCustomEligible ? eventType : undefined,
      colorThemeNotes: product.isCustomEligible ? colorThemeNotes : undefined,
    });
    
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Link href="/menu" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-bold uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Menu
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="aspect-square rounded-[2rem] overflow-hidden bg-card border-4 border-border relative">
              {product.isSoldOut && settings.showSoldOutItems && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-destructive text-destructive-foreground font-black text-3xl md:text-5xl uppercase tracking-widest py-4 px-8 border-y-4 border-black rotate-[-15deg] shadow-2xl">
                    Sold Out
                  </div>
                </div>
              )}
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Badges */}
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
              {product.isFeatured && (
                <Badge className="bg-secondary text-secondary-foreground font-black uppercase tracking-wider px-4 py-2 text-sm shadow-xl">Featured</Badge>
              )}
              {product.isSeasonal && (
                <Badge className="bg-accent text-accent-foreground font-black uppercase tracking-wider px-4 py-2 text-sm shadow-xl">Seasonal</Badge>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="mb-2">
              <Badge variant="outline" className="font-black uppercase tracking-wider text-muted-foreground border-border bg-transparent mb-4">
                {product.category.replace('-', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
                {product.name}
              </h1>
              <NativeShareButton
                title={product.name}
                text={`Check out this Candy CrackZZZ item: ${product.name}`}
                label="Share"
                variant="outline"
                size="sm"
                iconOnly
                fallbackTitle={`Share ${product.name}`}
                className="shrink-0 mt-2"
              />
            </div>

            {settings.showPricesPublicly && (
              <div className="text-3xl md:text-5xl font-black text-primary mb-8 drop-shadow-[0_0_15px_rgba(255,0,255,0.3)]">
                {product.price !== null ? `$${product.price.toFixed(2)}` : 'Custom Price'}
              </div>
            )}

            <div className="prose prose-invert max-w-none mb-8">
              <p className="text-xl md:text-2xl text-foreground/80 font-medium leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 bg-card p-6 rounded-2xl border border-border">
              <div>
                <h4 className="font-black uppercase text-xs text-muted-foreground tracking-wider mb-1">Flavor Profile</h4>
                <p className="font-bold text-lg">{product.flavorNotes || 'Sweet & Crunchy'}</p>
              </div>
              <div>
                <h4 className="font-black uppercase text-xs text-muted-foreground tracking-wider mb-1">Colors</h4>
                <p className="font-bold text-lg">{product.colorThemeNotes || 'Standard'}</p>
              </div>
            </div>

            {/* Customization Fields */}
            {product.isCustomEligible && (
              <div className="space-y-6 mb-8 p-6 bg-primary/10 rounded-2xl border border-primary/30">
                <h3 className="font-black text-xl uppercase tracking-wider text-primary">Customization Options</h3>
                <div className="space-y-2">
                  <Label className="font-bold">Event Type</Label>
                  <Input 
                    placeholder="e.g., Birthday, Baby Shower, Wedding" 
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Color/Theme Preferences</Label>
                  <Input 
                    placeholder="e.g., Pink & Gold, Spiderman colors" 
                    value={colorThemeNotes}
                    onChange={(e) => setColorThemeNotes(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            )}

            {settings.enableOrdering && !product.isSoldOut && (
              <div className="mt-auto space-y-8">
                <div className="space-y-2">
                  <Label className="font-bold">Special Instructions</Label>
                  <Textarea 
                    placeholder="Any special requests? Let us know..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="resize-none h-24 bg-card border-border"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                  <div className="flex items-center bg-card border border-border rounded-xl h-16 w-full sm:w-auto overflow-hidden">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-16 h-full flex items-center justify-center hover:bg-muted/50 transition-colors text-foreground"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-full flex items-center justify-center font-black text-2xl border-x border-border">
                      {quantity}
                    </div>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-16 h-full flex items-center justify-center hover:bg-muted/50 transition-colors text-foreground"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <Button 
                    size="lg" 
                    className="h-16 flex-grow w-full text-xl font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.8)] transition-all duration-300 relative overflow-hidden"
                    onClick={handleAddToCart}
                    disabled={isAdded}
                  >
                    <AnimatePresence mode="wait">
                      {isAdded ? (
                        <motion.div
                          key="added"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex items-center justify-center gap-2 absolute inset-0 bg-green-500"
                        >
                          <Check className="w-6 h-6" /> ADDED TO CART
                        </motion.div>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                        >
                          ADD TO CART • {product.price !== null ? `$${(product.price * quantity).toFixed(2)}` : 'Custom'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>
            )}

            {!settings.enableOrdering && (
              <div className="mt-8 p-6 bg-card border border-border rounded-2xl text-center">
                <p className="font-bold text-xl uppercase tracking-wider text-muted-foreground">Not currently accepting online orders.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
