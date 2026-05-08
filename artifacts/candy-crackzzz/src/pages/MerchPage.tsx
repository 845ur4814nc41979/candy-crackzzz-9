import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import PageLayout from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Star, Tag, Package, Shirt, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MerchCategory, MerchItem } from '@/types';
import NativeShareButton from '@/components/share/NativeShareButton';

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  'coming-soon': 'Coming Soon',
  'out-of-stock': 'Sold Out',
  limited: 'Limited',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500/20 text-green-400 border-green-500/40',
  'coming-soon': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'out-of-stock': 'bg-red-500/20 text-red-400 border-red-500/40',
  limited: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
};

const CATEGORY_LABELS: Record<MerchCategory | 'all', string> = {
  all: 'All',
  apparel: 'Apparel',
  accessories: 'Accessories',
  drinkware: 'Drinkware',
  stickers: 'Stickers',
  home: 'Home',
  vendor: 'Vendor',
  other: 'Other',
};

function MerchCard({ item }: { item: MerchItem }) {
  const { addToCart, settings } = useAppContext();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState(item.sizes[0] ?? '');
  const [selectedColor, setSelectedColor] = useState(item.colors[0] ?? '');

  const effectivePrice = item.salePrice != null ? item.salePrice : item.price;
  const isOrderable = item.status === 'available' || item.status === 'limited';

  const handleAddToCart = () => {
    addToCart({
      productId: item.id,
      name: item.name,
      price: effectivePrice,
      quantity: 1,
      imageUrl: item.imageUrl || '',
      itemType: 'merch',
      selectedSize: selectedSize || undefined,
      selectedColor: selectedColor || undefined,
    });
    toast({
      title: 'Added to Cart',
      description: `${item.name}${selectedSize ? ` — ${selectedSize}` : ''}${selectedColor ? ` / ${selectedColor}` : ''}`,
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,0,255,0.12)]">
      <div className="aspect-square bg-muted/30 relative overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
            <Shirt className="w-16 h-16" />
            <span className="text-xs font-bold uppercase tracking-wide">No Image</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${STATUS_COLORS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
          {item.isFeatured && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border bg-primary/20 text-primary border-primary/40">
              Featured
            </span>
          )}
          {item.salePrice != null && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border bg-red-500/20 text-red-400 border-red-500/40">
              Sale
            </span>
          )}
        </div>
        {item.showInventory && item.inventory > 0 && item.inventory <= 10 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded-full">
            {item.inventory} left
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {CATEGORY_LABELS[item.category as MerchCategory] ?? item.category}
          </p>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-lg leading-tight">{item.name}</h3>
            <NativeShareButton
              title={item.name}
              text={`Check out this Candy CrackZZZ merch: ${item.name}`}
              label="Share"
              variant="ghost"
              size="icon"
              iconOnly
              fallbackTitle={`Share ${item.name}`}
              className="shrink-0 -mt-1 -mr-1 h-8 w-8"
            />
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
          )}
        </div>

        {item.sizes.length > 1 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {item.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    selectedSize === size
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.colors.length > 1 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {item.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    selectedColor === color
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-border/60 flex items-end justify-between gap-3">
          <div>
            {settings.showPricesPublicly && effectivePrice != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">${effectivePrice.toFixed(2)}</span>
                {item.salePrice != null && item.price != null && (
                  <span className="text-sm font-bold text-muted-foreground line-through">${item.price.toFixed(2)}</span>
                )}
              </div>
            ) : effectivePrice == null ? (
              <span className="text-sm font-bold text-muted-foreground">Contact for price</span>
            ) : null}
            {settings.enableRewards && item.allowPoints && item.pointsRequired > 0 && (
              <p className="text-[11px] font-bold text-primary/70 flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3" />
                {item.allowFullPointsPurchase
                  ? `${item.pointsRequired} pts`
                  : `Up to ${item.maxPointsAllowed} pts off`}
              </p>
            )}
          </div>

          {isOrderable ? (
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="font-black uppercase tracking-wider shrink-0"
            >
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="font-black uppercase tracking-wider shrink-0 text-muted-foreground">
              {item.status === 'coming-soon' ? 'Soon' : 'Sold Out'}
            </Button>
          )}
        </div>

        {item.pickupShippingNote && (
          <p className="text-[11px] text-muted-foreground font-medium flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            {item.pickupShippingNote}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MerchPage() {
  const { merch, settings } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<MerchCategory | 'all'>('all');

  const activeItems = merch
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const categories = ['all' as const, ...Array.from(new Set(activeItems.map(m => m.category as MerchCategory)))];

  const filteredItems = activeCategory === 'all'
    ? activeItems
    : activeItems.filter(m => m.category === activeCategory);

  const featuredItems = activeItems.filter(m => m.isFeatured && m.status !== 'coming-soon');

  if (!settings.enableMerch) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Merch Coming Soon</h1>
          <p className="text-muted-foreground font-bold">Check back soon for exclusive Candy Crackzzz gear.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/40 font-black uppercase tracking-wider px-4 py-1.5">
            <Shirt className="w-3.5 h-3.5 mr-2" />
            Official Merch
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-3">
            Candy Crackzzz Gear
          </h1>
          <p className="text-muted-foreground font-bold text-lg max-w-xl mx-auto">
            Rock the brand. Bold drip designs for the culture.
          </p>
          {settings.enableRewards && (
            <p className="text-sm font-bold text-primary/70 mt-3 flex items-center justify-center gap-2">
              <Star className="w-4 h-4" />
              Loyalty members can redeem points on select items
            </p>
          )}
        </div>

        {featuredItems.length > 0 && activeCategory === 'all' && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Featured Drops</h2>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredItems.slice(0, 3).map(item => (
                <MerchCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {categories.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider border transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map(item => (
              <MerchCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold text-lg">No merch in this category yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Check back soon for new drops.</p>
          </div>
        )}

        <div className="mt-16 bg-card border border-border rounded-2xl p-8 text-center">
          <Tag className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-black uppercase tracking-tight mb-2">Custom or Bulk Orders</h3>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto">
            Need merch for your event or crew? Reach out for custom orders, bundles, and wholesale pricing.
          </p>
          <Button
            variant="outline"
            className="mt-5 font-black uppercase tracking-wider border-primary/40 hover:bg-primary/10"
            onClick={() => window.location.href = '/contact'}
          >
            Contact Us
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
