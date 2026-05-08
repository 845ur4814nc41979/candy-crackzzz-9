import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layout/PageLayout';
import ProductCard from '@/components/ui/ProductCard';
import CustomerDemoLink from '@/components/demo/CustomerDemoLink';
import logoPath from "@assets/candy_crackzzz_2_1776628492110.png";

export default function HomePage() {
  const { products, settings, reviews } = useAppContext();
  const { toast } = useToast();

  const openOrderHelper = () => {
    if (settings.helperEnabled === false) {
      toast({ title: 'Order Helper is currently turned off' });
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cc-open-helper'));
    }
  };

  const featuredProducts = products.filter(p => p.isFeatured && p.isVisible).slice(0, 4);
  const seasonalProducts = products.filter(p => p.isSeasonal && p.isVisible).slice(0, 4);
  const donutzzzProducts = products.filter(p => p.category === 'donutzzz' && p.isVisible).slice(0, 4);
  const dirtySodazzzProducts = products.filter(p => p.category === 'dirty-sodazzz' && p.isVisible).slice(0, 4);
  const showDonutzzzSection =
    settings.enableDonutzzz && settings.showDonutzzzOnHome && donutzzzProducts.length > 0;
  const showDirtySodazzzSection =
    settings.enableDirtySodazzz && settings.showDirtySodazzzOnHome && dirtySodazzzProducts.length > 0;

  const displayReviews = (() => {
    const featured = reviews.filter(r => r.status === 'approved' && r.isFeatured);
    const approved = reviews.filter(r => r.status === 'approved' && !r.isFeatured);
    const combined = [...featured, ...approved].slice(0, 3);
    return combined;
  })();

  const showReviews = displayReviews.length > 0;

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-accent/20 blur-[100px] rounded-full" />
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="mb-8"
          >
            {settings.showLogo && settings.logoBase64 ? (
              <img src={settings.logoBase64} alt={settings.businessName} className="max-w-[300px] md:max-w-[500px] mx-auto drop-shadow-[0_0_30px_rgba(255,0,255,0.3)]" />
            ) : settings.showLogo ? (
              <img src={logoPath} alt="Candy Crackzzz Logo" className="max-w-[300px] md:max-w-[500px] mx-auto drop-shadow-[0_0_30px_rgba(255,0,255,0.3)]" />
            ) : (
              <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary tracking-tight">
                {settings.businessName}
              </h1>
            )}
          </motion.div>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xl md:text-3xl font-bold text-foreground/90 max-w-2xl mx-auto mb-12 tracking-wide"
          >
            Where Every Bite Cracks with Flavor.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto px-4"
          >
            <Link href="/menu" className="w-full sm:w-auto" data-testid="link-order-menu">
              <Button size="lg" className="w-full sm:w-auto text-lg font-black px-10 py-8 rounded-full shadow-[0_0_20px_rgba(255,0,255,0.5)] hover:shadow-[0_0_40px_rgba(255,0,255,0.8)] transition-all duration-300 hover:scale-105 border-2 border-primary-foreground/20">
                ORDER / MENU
              </Button>
            </Link>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={openOrderHelper}
              data-testid="button-order-helper"
              className="w-full sm:w-auto text-lg font-black px-10 py-8 rounded-full hover:bg-white/10 border-2 transition-all duration-300 hover:scale-105 backdrop-blur-sm bg-background/20"
            >
              <MessageCircle className="w-5 h-5 mr-2" /> ORDER HELPER
            </Button>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6"
          >
            <CustomerDemoLink tour="customer" label="Take the Tour" variant="pill" />
          </motion.div>
        </div>
      </section>

      {/* Featured Items */}
      {settings.enableFeaturedSection && featuredProducts.length > 0 && (
        <section className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-2">HOT SEATS</h2>
                <p className="text-xl text-primary font-bold">Our most craved creations.</p>
              </div>
              <Link href="/menu" className="hidden md:flex items-center gap-2 font-bold hover:text-primary transition-colors uppercase tracking-wider">
                View All <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center md:hidden">
              <Link href="/menu" className="inline-flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                View All Menu Items <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Donutzzz */}
      {showDonutzzzSection && (
        <section className="py-20 md:py-24 bg-background border-y border-border" data-testid="section-donutzzz">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-10">
              <div>
                <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/40 font-black uppercase tracking-wider mb-3">Fresh Drop</Badge>
                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-2">DONUTZZZ</h2>
                <p className="text-xl text-primary font-bold">Glazed, sprinkled, candy-cracked donuts.</p>
              </div>
              <Link href="/menu" className="hidden md:flex items-center gap-2 font-bold hover:text-primary transition-colors uppercase tracking-wider">
                See All <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {donutzzzProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dirty Sodazzz */}
      {showDirtySodazzzSection && (
        <section className="py-20 md:py-24 bg-card border-y border-border" data-testid="section-dirty-sodazzz">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-10">
              <div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black uppercase tracking-wider mb-3">Sip Zone</Badge>
                <h2 className="text-4xl md:text-5xl font-black text-foreground mb-2">DIRTY SODAZZZ</h2>
                <p className="text-xl text-secondary font-bold">Cream, fruit, fizz — built bold.</p>
              </div>
              <Link href="/menu" className="hidden md:flex items-center gap-2 font-bold hover:text-secondary transition-colors uppercase tracking-wider">
                See All <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dirtySodazzzProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seasonal Banner */}
      {settings.enableSeasonalSection && seasonalProducts.length > 0 && (
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary opacity-20" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 text-center max-w-4xl mx-auto shadow-2xl shadow-primary/20">
              <Badge className="bg-white text-black font-black uppercase tracking-wider mb-6 text-lg px-4 py-1">Limited Time</Badge>
              <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-6">
                SEASONAL SPECIALS
              </h2>
              <p className="text-xl md:text-2xl font-bold text-foreground/80 mb-10">
                Catch these flavors before they melt away.
              </p>
              <Link href="/seasonal">
                <Button size="lg" className="text-lg font-black px-10 py-6 rounded-full hover:scale-105 transition-transform">
                  SHOP SEASONAL
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="py-24 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-2">WHAT THEY'RE SAYING</h2>
              <p className="text-primary font-bold text-lg">Real reviews from real customers.</p>
            </div>
            <Link href="/contact#review" className="hidden md:flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
              Leave a Review <Star className="w-4 h-4" />
            </Link>
          </div>

          {showReviews ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayReviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-background border-border/50 h-full">
                    <CardContent className="p-8">
                      <div className="flex gap-1 mb-4 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`w-5 h-5 ${j < review.rating ? 'fill-current' : 'opacity-20'}`} />
                        ))}
                      </div>
                      {review.imageBase64 && (
                        <img
                          src={review.imageBase64}
                          alt={`${review.customerName} review photo`}
                          className="w-full max-h-56 object-cover rounded-xl border border-border mb-4"
                          data-testid={`img-review-${review.id}`}
                        />
                      )}
                      <p className="text-lg italic font-medium mb-5">"{review.text}"</p>
                      <p className="font-black uppercase tracking-wider text-muted-foreground">— {review.customerName}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Fallback placeholder reviews until real ones come in */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Sarah J.", text: "Literally the best candy grapes I've ever had. The crunch is unbelievable!", rating: 5 },
                { name: "Marcus T.", text: "Got the deluxe tray for my wife's birthday. Everyone was obsessed. Gorgeous presentation.", rating: 5 },
                { name: "Chloe M.", text: "The mango habanero pineapple is addictive. Sweet, spicy, perfect. I need more.", rating: 5 }
              ].map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-background border-border/50 h-full">
                    <CardContent className="p-8">
                      <div className="flex gap-1 mb-4 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className="w-5 h-5 fill-current" />
                        ))}
                      </div>
                      <p className="text-lg italic font-medium mb-5">"{review.text}"</p>
                      <p className="font-black uppercase tracking-wider text-muted-foreground">— {review.name}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/contact" className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-wider hover:underline">
              Share Your Experience <Star className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
