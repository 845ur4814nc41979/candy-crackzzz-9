import { useState } from 'react';
import { X } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GalleryPage() {
  const { products } = useAppContext();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<{url: string, name: string} | null>(null);

  // Get all unique images from products
  const galleryItems = products
    .filter(p => p.isVisible)
    .filter(p => activeCategory === 'all' || p.category === activeCategory)
    .map(p => ({ id: p.id, url: p.imageUrl, name: p.name, category: p.category }));

  return (
    <PageLayout>
      <div className="bg-card border-b border-border py-12 md:py-20 relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
            THE GALLERY
          </h1>
          <p className="text-xl font-bold text-secondary max-w-2xl mx-auto">
            Feast your eyes.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex justify-center mb-12">
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="w-full max-w-3xl">
            <TabsList className="bg-card h-auto p-1 flex flex-wrap justify-center border border-border">
              <TabsTrigger value="all" className="font-bold uppercase tracking-wider px-6 py-3">All</TabsTrigger>
              <TabsTrigger value="candy-grapes" className="font-bold uppercase tracking-wider px-6 py-3">Grapes</TabsTrigger>
              <TabsTrigger value="candy-pineapple" className="font-bold uppercase tracking-wider px-6 py-3">Pineapple</TabsTrigger>
              <TabsTrigger value="party-trays" className="font-bold uppercase tracking-wider px-6 py-3">Trays</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {galleryItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-2xl"
              onClick={() => setSelectedImage(item)}
            >
              <img 
                src={item.url} 
                alt={item.name} 
                className="w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="font-black text-xl text-white uppercase tracking-wider drop-shadow-lg">{item.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-10 h-10" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage.url} 
              alt={selectedImage.name}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-10 left-0 right-0 text-center">
              <span className="bg-black/50 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                {selectedImage.name}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
