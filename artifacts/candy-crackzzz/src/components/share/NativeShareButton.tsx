import { useEffect, useState } from 'react';
import { Copy, Link as LinkIcon, Mail, MessageSquare, Share2, X } from 'lucide-react';
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
import {
  buildCurrentPageUrl,
  buildEmailShareUrl,
  buildSmsShareUrl,
  canUseNativeShare,
  copyShareLink,
  copyShareMessage,
  shareNativeOrFallback,
} from '@/lib/nativeShare';

type ButtonSize = React.ComponentProps<typeof Button>['size'];
type ButtonVariant = React.ComponentProps<typeof Button>['variant'];

export interface NativeShareButtonProps {
  title: string;
  text: string;
  url?: string;
  label?: string;
  iconOnly?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  fallbackTitle?: string;
}

export default function NativeShareButton({
  title,
  text,
  url,
  label = 'Share',
  iconOnly = false,
  size = 'default',
  variant = 'default',
  className,
  fallbackTitle,
}: NativeShareButtonProps) {
  const { toast } = useToast();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    setResolvedUrl(url && url.length > 0 ? url : buildCurrentPageUrl());
  }, [url]);

  const data = { title, text, url: url && url.length > 0 ? url : resolvedUrl };

  const handleClick = async () => {
    if (!canUseNativeShare()) {
      setFallbackOpen(true);
      return;
    }
    const result = await shareNativeOrFallback(data);
    if (result === 'unsupported' || result === 'error') {
      setFallbackOpen(true);
    }
    // 'shared' or 'cancelled' → do nothing (no toast on cancel per spec)
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
        data-testid="native-share-button"
      >
        <Share2 className="w-4 h-4" />
        {!iconOnly && <span className="ml-2">{label}</span>}
      </Button>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fallbackTitle ?? `Share ${title}`}</DialogTitle>
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
              data-testid="share-fallback-copy-link"
            >
              <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-bold"
              onClick={() => void handleCopyMessage()}
              data-testid="share-fallback-copy-message"
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Message
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-start font-bold"
              data-testid="share-fallback-sms"
            >
              <a href={buildSmsShareUrl(data)} onClick={() => setFallbackOpen(false)}>
                <MessageSquare className="w-4 h-4 mr-2" /> Share by Text Message
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-start font-bold"
              data-testid="share-fallback-email"
            >
              <a href={buildEmailShareUrl(data)} onClick={() => setFallbackOpen(false)}>
                <Mail className="w-4 h-4 mr-2" /> Share by Email
              </a>
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              className="font-bold"
              onClick={() => setFallbackOpen(false)}
              data-testid="share-fallback-close"
            >
              <X className="w-4 h-4 mr-2" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
