import { useState } from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';
import GuidedTour from '@/components/demo/GuidedTour';
import { tourById } from '@/lib/demoTours';
import { markTourSeen } from '@/lib/demoMode';

interface CustomerDemoLinkProps {
  tour: 'customer' | 'rewards' | 'checkout';
  label?: string;
  variant?: 'pill' | 'inline' | 'button';
  className?: string;
  /** localStorage scope; pass user id when available, otherwise 'guest'. */
  scope?: string;
}

export default function CustomerDemoLink({
  tour,
  label = 'How it works',
  variant = 'pill',
  className,
  scope = 'guest',
}: CustomerDemoLinkProps) {
  const [open, setOpen] = useState(false);
  const tourDef = tourById(tour);

  const onComplete = () => markTourSeen(scope, tourDef.id);

  const baseClasses =
    variant === 'pill'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary transition-colors'
      : variant === 'button'
        ? 'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-wider hover:opacity-90 transition-opacity'
        : 'inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseClasses} ${className ?? ''}`}
        data-testid={`button-customer-demo-${tour}`}
      >
        {variant === 'inline' ? <HelpCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        <span>{label}</span>
      </button>

      <GuidedTour
        tour={tourDef}
        open={open}
        onClose={() => setOpen(false)}
        onComplete={onComplete}
      />
    </>
  );
}
