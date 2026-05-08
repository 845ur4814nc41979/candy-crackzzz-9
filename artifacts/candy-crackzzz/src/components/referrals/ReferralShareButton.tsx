import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import { Copy, Link as LinkIcon, Mail, MessageSquare, Share2, X } from 'lucide-react';
import {
  buildReferralShareMessage,
  buildReferralShareTitle,
  getReferralShareUrl,
} from '@/lib/referralShare';
import {
  buildEmailShareUrl,
  buildSmsShareUrl,
  canUseNativeShare,
  copyShareLink,
  copyShareMessage,
  shareNativeOrFallback,
} from '@/lib/nativeShare';
import type { Settings } from '@/types';

type ButtonSize = React.ComponentProps<typeof Button>['size'];
type ButtonVariant = React.ComponentProps<typeof Button>['variant'];

interface ReferralShareButtonProps {
  code: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}

export default function ReferralShareButton({
  code,
  size = 'default',
  variant = 'default',
  className,
  label = 'Share Referral',
  iconOnly = false,
}: ReferralShareButtonProps) {
  const { settings } = useAppContext();
  const { toast } = useToast();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => {
    setPageUrl(getReferralShareUrl(code));
  }, [code]);

  const shareSettings = useMemo<Pick<
    Settings,
    'enableReferrals' | 'businessName' | 'referralReferrerBonusPoints' | 'referralReferredCustomerBonusPoints'
  >>(() => ({
    enableReferrals: settings.enableReferrals,
    businessName: settings.businessName,
    referralReferrerBonusPoints: settings.referralReferrerBonusPoints,
    referralReferredCustomerBonusPoints: settings.referralReferredCustomerBonusPoints,
  }), [settings]);

  if (!settings.enableReferrals || !code) return null;

  const ctx = { code, settings: shareSettings };
  const data = {
    title: buildReferralShareTitle(shareSettings),
    text: buildReferralShareMessage(ctx),
    url: pageUrl || undefined,
  };
  const sharePreview = data.text;

  const handleClick = async () => {
    if (!canUseNativeShare()) {
      setFallbackOpen(true);
      return;
    }
    const result = await shareNativeOrFallback(data);
    if (result === 'unsupported' || result === 'error') {
      setFallbackOpen(true);
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyShareLink(code);
    if (ok) {
      toast({ title: 'Code copied', description: code });
    } else {
      toast({ title: 'Copy failed', description: 'Try copying it manually.', variant: 'destructive' });
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyShareLink(data.url);
    toast(
      ok
        ? { title: 'Link copied' }
        : { title: 'Copy failed', description: 'Try again or copy manually.', variant: 'destructive' },
    );
  };

  const handleCopyMessage = async () => {
    const ok = await copyShareMessage(data);
    toast(
      ok
        ? { title: 'Share message copied' }
        : { title: 'Copy failed', description: 'Try again or copy manually.', variant: 'destructive' },
    );
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={handleClick}
        aria-label={label}
        title={label}
        data-testid="referral-share-button"
      >
        <Share2 className="w-4 h-4" />
        {!iconOnly && <span className="ml-2">{label}</span>}
      </Button>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share referral code {code}</DialogTitle>
            <DialogDescription>
              Pick how you want to send this. Native sharing isn't available on this device.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start font-bold"
              onClick={() => void handleCopyLink()}
            >
              <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-bold"
              onClick={() => void handleCopyMessage()}
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Message
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-bold"
              onClick={() => void handleCopyCode()}
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Code Only
            </Button>
            <Button asChild variant="outline" className="justify-start font-bold">
              <a href={buildSmsShareUrl(data)} onClick={() => setFallbackOpen(false)}>
                <MessageSquare className="w-4 h-4 mr-2" /> Share by Text Message
              </a>
            </Button>
            <Button asChild variant="outline" className="justify-start font-bold">
              <a href={buildEmailShareUrl(data)} onClick={() => setFallbackOpen(false)}>
                <Mail className="w-4 h-4 mr-2" /> Share by Email
              </a>
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground leading-snug border border-border rounded-xl bg-card/50 p-3 mt-2">
            {sharePreview}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              className="font-bold"
              onClick={() => setFallbackOpen(false)}
            >
              <X className="w-4 h-4 mr-2" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
