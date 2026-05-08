import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Product } from '@/types';

export default function AdminProducts() {
  const { products, setProducts } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = () => {
    if (productToDelete) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Products</h1>
          <p className="text-muted-foreground font-bold">Manage your inventory and menu items.</p>
        </div>
        <Link href="/admin/products/new" className="inline-block">
          <Button size="lg" className="font-black uppercase"><Plus className="w-5 h-5 mr-2" /> Add Product</Button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Badge variant="secondary" className="font-bold">{products.length} Total</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs">Name</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs">Category</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs">Price</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs">Status</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-wider text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="w-12 h-12 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                        {product.category.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {product.price !== null ? `$${product.price.toFixed(2)}` : 'Custom'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {product.isSoldOut && <Badge variant="destructive" className="uppercase text-[10px]">Sold Out</Badge>}
                        {!product.isVisible && <Badge variant="secondary" className="uppercase text-[10px]">Hidden</Badge>}
                        {product.isFeatured && <Badge className="bg-primary hover:bg-primary uppercase text-[10px]">Featured</Badge>}
                        {product.isSeasonal && <Badge className="bg-accent hover:bg-accent uppercase text-[10px]">Seasonal</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${product.id}/edit`} className="inline-flex">
                          <Button variant="ghost" size="icon" className="hover:text-primary">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setProductToDelete(product)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center font-bold text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent className="border-destructive/20 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-wider text-xl">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-base">
              Are you sure you want to delete <span className="text-foreground">"{productToDelete?.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold uppercase">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-wider">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
