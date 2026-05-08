import { Link } from 'wouter';
import { Product } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { settings } = useAppContext();

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden border-2 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 bg-card rounded-2xl group flex flex-col relative">
        
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {product.isSoldOut && settings.showSoldOutItems && (
            <Badge variant="destructive" className="font-black uppercase tracking-wider shadow-lg">Sold Out</Badge>
          )}
          {product.isFeatured && (
            <Badge className="bg-secondary text-secondary-foreground font-black uppercase tracking-wider shadow-lg">Featured</Badge>
          )}
          {product.isSeasonal && (
            <Badge className="bg-accent text-accent-foreground font-black uppercase tracking-wider shadow-lg">Seasonal</Badge>
          )}
        </div>

        <Link href={`/menu/${product.slug}`} className="block overflow-hidden relative aspect-square bg-muted/20">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${product.isSoldOut && settings.showSoldOutItems ? 'opacity-50 grayscale' : ''}`}
          />
          {/* Candy glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        <CardContent className="p-5 flex-grow flex flex-col">
          <div className="mb-2 flex justify-between items-start gap-2">
            <h3 className="font-black text-xl leading-tight line-clamp-2 text-foreground">{product.name}</h3>
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-grow">
            {product.shortDescription}
          </p>

          {settings.showPricesPublicly && (
            <div className="text-primary font-black text-2xl mt-auto">
              {product.price !== null ? `$${product.price.toFixed(2)}` : 'Custom Price'}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-5 pt-0">
          <Link href={`/menu/${product.slug}`} className="w-full">
            <Button 
              className="w-full font-black uppercase tracking-wider rounded-xl hover:shadow-[0_0_15px_rgba(255,0,255,0.5)] transition-all duration-300" 
              variant={product.isSoldOut ? "secondary" : "default"}
            >
              {product.isSoldOut ? 'View Details' : 'View Item'}
            </Button>
          </Link>
        </CardFooter>

      </Card>
    </motion.div>
  );
}
