import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AiGenerateButtonProps {
  generate: () => Promise<string>;
  onApply: (text: string) => void;
  disabled?: boolean;
  label?: string;
  draftLabel?: string;
  size?: 'sm' | 'default';
  testId?: string;
  applyLabel?: string;
  showCopy?: boolean;
}

export default function AiGenerateButton({
  generate,
  onApply,
  disabled,
  label = 'AI Generate',
  draftLabel = 'AI Draft — review before using',
  size = 'sm',
  testId,
  applyLabel = 'Apply to field',
  showCopy = false,
}: AiGenerateButtonProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setDraft(null);
    try {
      const text = await generate();
      if (!text?.trim()) {
        toast({ title: 'Nothing returned', description: 'AI returned an empty response. Try again.', variant: 'destructive' });
        return;
      }
      setDraft(text.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not generate.';
      if (msg.includes('not configured') || msg.includes('OPENAI_API_KEY')) {
        toast({
          title: 'AI tools not configured',
          description: 'Add OPENAI_API_KEY to Replit Secrets and restart the API server.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'AI error', description: msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (draft) onApply(draft);
    setDraft(null);
    toast({ title: 'Applied', description: 'AI text placed in the field. Review and edit before saving.' });
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast({ title: 'Copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy the text manually.', variant: 'destructive' });
    }
  };

  const handleDiscard = () => setDraft(null);

  return (
    <div className="flex flex-col gap-2 items-end w-full">
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleGenerate}
        disabled={disabled || loading}
        data-testid={testId}
        className="gap-2 font-bold uppercase tracking-wide border-secondary/40 text-secondary hover:bg-secondary/10"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? 'Generating…' : label}
      </Button>

      {draft !== null && (
        <div className="w-full rounded-xl border border-secondary/40 bg-secondary/5 p-3 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-secondary">{draftLabel}</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[80px] resize-none rounded-md border border-border bg-background p-2 text-sm font-medium"
          />
          <p className="text-[10px] text-muted-foreground">Review and edit the AI draft before applying. AI-generated text should be approved by a human before publishing.</p>
          <div className="flex gap-2 justify-end flex-wrap">
            <Button type="button" variant="ghost" size="sm" onClick={handleDiscard} className="font-bold uppercase tracking-wide">
              <X className="w-4 h-4 mr-1" /> Discard
            </Button>
            {showCopy && (
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="font-bold uppercase tracking-wide">
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleApply} className="font-bold uppercase tracking-wide bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Check className="w-4 h-4 mr-1" /> {applyLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
