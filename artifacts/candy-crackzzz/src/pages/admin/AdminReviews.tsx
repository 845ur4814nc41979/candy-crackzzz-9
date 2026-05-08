import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Review } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, EyeOff, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  hidden: 'bg-muted text-muted-foreground border-border',
};

export default function AdminReviews() {
  const { reviews, setReviews } = useAppContext();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');

  const filtered = reviews.filter(r => filter === 'all' || r.status === filter);

  const updateReview = (id: string, changes: Partial<Review>) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  };

  const deleteReview = (id: string) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    toast({ title: "Review deleted." });
  };

  const approve = (id: string) => {
    updateReview(id, { status: 'approved' });
    toast({ title: "Review approved and now visible publicly." });
  };

  const hide = (id: string) => {
    updateReview(id, { status: 'hidden', isFeatured: false });
    toast({ title: "Review hidden." });
  };

  const toggleFeatured = (r: Review) => {
    if (r.status !== 'approved') return;
    updateReview(r.id, { isFeatured: !r.isFeatured });
    toast({ title: r.isFeatured ? "Removed from featured." : "Marked as featured on homepage." });
  };

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    hidden: reviews.filter(r => r.status === 'hidden').length,
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Reviews</h1>
        <p className="text-muted-foreground font-bold">Approve, hide, or feature customer reviews.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'pending', 'approved', 'hidden'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider border transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground font-bold text-lg">No reviews in this category.</p>
          <p className="text-sm text-muted-foreground mt-2">Reviews submitted by customers appear here for moderation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-black text-lg">{review.customerName}</span>
                    <div className="flex gap-0.5 text-yellow-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'opacity-30'}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${STATUS_COLORS[review.status]}`}>
                      {review.status}
                    </span>
                    {review.isFeatured && (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full border bg-primary/20 text-primary border-primary/30 uppercase tracking-wider">Featured</span>
                    )}
                  </div>
                  <p className="text-foreground/80 font-medium mb-2 italic">"{review.text}"</p>
                  {review.imageBase64 && (
                    <a
                      href={review.imageBase64}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mb-3"
                      data-testid={`link-review-image-${review.id}`}
                    >
                      <img
                        src={review.imageBase64}
                        alt={`${review.customerName} review photo`}
                        className="max-h-40 rounded-xl border border-border object-cover"
                      />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex flex-wrap gap-2 md:flex-col md:items-end shrink-0">
                  {review.status !== 'approved' && (
                    <Button size="sm" onClick={() => approve(review.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold h-9">
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  )}
                  {review.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleFeatured(review)}
                      className={`font-bold h-9 ${review.isFeatured ? 'border-primary text-primary' : ''}`}
                    >
                      <Star className="w-4 h-4 mr-1" /> {review.isFeatured ? 'Unfeature' : 'Feature'}
                    </Button>
                  )}
                  {review.status !== 'hidden' && (
                    <Button size="sm" variant="outline" onClick={() => hide(review.id)} className="font-bold h-9">
                      <EyeOff className="w-4 h-4 mr-1" /> Hide
                    </Button>
                  )}
                  {review.status === 'hidden' && (
                    <Button size="sm" onClick={() => approve(review.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold h-9">
                      <CheckCircle className="w-4 h-4 mr-1" /> Restore
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => deleteReview(review.id)} className="font-bold h-9">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
