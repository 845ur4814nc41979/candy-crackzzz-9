import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartDescriptionButtonProps {
  generate: () => string;
  onApply: (text: string) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'default';
  testId?: string;
}

export default function SmartDescriptionButton({
  generate,
  onApply,
  disabled,
  label = 'Generate Smart Description',
  size = 'sm',
  testId,
}: SmartDescriptionButtonProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    try {
      const text = generate();
      if (!text || !text.trim()) {
        toast({ title: 'Add a name first', description: 'Type a name so the generator has something to work with.', variant: 'destructive' });
        return;
      }
      setDraft(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not generate.';
      toast({ title: 'Generator error', description: msg, variant: 'destructive' });
    }
  };

  const handleApply = () => {
    if (draft) onApply(draft);
    setDraft(null);
    toast({ title: 'Applied', description: 'Smart description was placed in the field. You can still edit it before saving.' });
  };

  const handleDiscard = () => setDraft(null);

  return (
    <div className="flex flex-col gap-2 items-end w-full">
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleGenerate}
        disabled={disabled}
        data-testid={testId}
        className="gap-2 font-bold uppercase tracking-wide border-primary/40 text-primary hover:bg-primary/10"
      >
        <Sparkles className="w-4 h-4" />
        {label}
      </Button>

      {draft !== null && (
        <div className="w-full rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-primary">Draft preview (local, no API)</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[90px] resize-none rounded-md border border-border bg-background p-2 text-sm font-medium"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={handleDiscard} className="font-bold uppercase tracking-wide">
              <X className="w-4 h-4 mr-1" /> Discard
            </Button>
            <Button type="button" size="sm" onClick={handleApply} className="font-bold uppercase tracking-wide">
              <Check className="w-4 h-4 mr-1" /> Apply to field
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
