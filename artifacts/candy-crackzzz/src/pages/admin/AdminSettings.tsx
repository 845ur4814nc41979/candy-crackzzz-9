import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Mail, Info, MapPin, MessageCircle, Bell, BarChart3, Volume2, Boxes } from 'lucide-react';
import { Settings } from '@/types';
import {
  playOrderNotificationSound,
  playMessageNotificationSound,
  playGeneralNotificationSound,
  unlockNotificationAudio,
} from '@/lib/notificationSounds';

async function unlockThenPlay(play: () => Promise<boolean>, onFail: () => void) {
  const ok = await unlockNotificationAudio();
  if (!ok) {
    onFail();
    return;
  }
  const played = await play();
  if (!played) onFail();
}

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

function SectionCard({ title, children, icon }: SectionCardProps) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm mb-5">
      <h2 className="text-base font-black uppercase tracking-wider mb-5 border-b border-border pb-3 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { settings, setSettings } = useAppContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Settings>(settings);

  const set = (field: Partial<Settings>) => setFormData(p => ({ ...p, ...field }));

  const handleSave = () => {
    setSettings(formData);
    toast({ title: "Settings Saved", description: "Your store configuration has been updated." });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1">Settings</h1>
          <p className="text-muted-foreground font-bold">Configure your storefront operations.</p>
        </div>
        <Button size="lg" onClick={handleSave} className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          <Save className="w-5 h-5 mr-2" /> Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-card border border-border h-auto p-1 mb-6 flex flex-wrap gap-1 max-w-3xl">
          <TabsTrigger value="general" className="font-bold uppercase tracking-wider px-4 py-2.5">General</TabsTrigger>
          <TabsTrigger value="messages" className="font-bold uppercase tracking-wider px-4 py-2.5">Messages</TabsTrigger>
          <TabsTrigger value="features" className="font-bold uppercase tracking-wider px-4 py-2.5">Features</TabsTrigger>
          <TabsTrigger value="logistics" className="font-bold uppercase tracking-wider px-4 py-2.5">Logistics</TabsTrigger>
          <TabsTrigger value="helper" className="font-bold uppercase tracking-wider px-4 py-2.5">Helper</TabsTrigger>
          <TabsTrigger value="notifications" className="font-bold uppercase tracking-wider px-4 py-2.5">Alerts</TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold uppercase tracking-wider px-4 py-2.5">Analytics</TabsTrigger>
          <TabsTrigger value="inventory" className="font-bold uppercase tracking-wider px-4 py-2.5">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="max-w-3xl">
          <SectionCard title="Business Information" icon={<Info className="w-4 h-4" />}>
            <div className="space-y-2">
              <Label className="font-bold">Business Name</Label>
              <Input value={formData.businessName} onChange={e => set({ businessName: e.target.value })} className="bg-background font-bold h-12" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Contact Phone</Label>
                <Input value={formData.businessPhone} onChange={e => set({ businessPhone: e.target.value })} placeholder="(555) 000-0000" className="bg-background font-bold h-12" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Contact Email</Label>
                <Input type="email" value={formData.businessEmail} onChange={e => set({ businessEmail: e.target.value })} placeholder="hello@yourbusiness.com" className="bg-background font-bold h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Service Area (shown publicly)</Label>
              <Input value={formData.serviceArea} onChange={e => set({ serviceArea: e.target.value })} placeholder="e.g. Spring Hill, FL and surrounding areas" className="bg-background font-bold h-12" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4" /> Business / Pickup Address</Label>
              <Input
                value={formData.businessAddress}
                onChange={e => set({ businessAddress: e.target.value })}
                placeholder="e.g. 123 Main St, Spring Hill, FL 34608"
                className="bg-background font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">Used as the starting point for delivery directions in the admin order view. Not shown publicly.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">About Us / Footer Text</Label>
              <Textarea value={formData.aboutText} onChange={e => set({ aboutText: e.target.value })} className="bg-background font-medium min-h-[90px] resize-none" />
            </div>
          </SectionCard>

          <SectionCard title="Social Links">
            <div className="space-y-4">
              {[
                { key: 'instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/yourpage' },
                { key: 'tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@yourpage' },
                { key: 'facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
              ].map(social => (
                <div key={social.key} className="flex items-center gap-4">
                  <Label className="font-bold w-24 shrink-0">{social.label}</Label>
                  <Input
                    placeholder={social.placeholder}
                    value={formData.socialLinks[social.key]}
                    onChange={e => set({ socialLinks: { ...formData.socialLinks, [social.key]: e.target.value } })}
                    className="bg-background"
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="messages" className="max-w-3xl">
          <SectionCard title="Message Destinations" icon={<Mail className="w-4 h-4" />}>
            <p className="text-sm text-muted-foreground font-medium -mt-2 pb-2">
              Configure where order notifications should go. For live customer orders from any device, set the backend Replit secrets too.
            </p>
            <div className="space-y-2">
              <Label className="font-bold">Order Inquiry Destination Email</Label>
              <Input
                type="email"
                value={formData.orderDestinationEmail}
                onChange={e => set({ orderDestinationEmail: e.target.value })}
                placeholder="orders@yourbusiness.com"
                className="bg-background font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">Used as a browser fallback for order email notifications.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Order Notification Phone</Label>
              <Input
                type="tel"
                value={formData.orderNotificationPhone}
                onChange={e => set({ orderNotificationPhone: e.target.value })}
                placeholder="(813) 555-1212"
                className="bg-background font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">Used as a browser fallback for SMS order notifications when Twilio is configured.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Contact Form Destination Email</Label>
              <Input
                type="email"
                value={formData.contactDestinationEmail}
                onChange={e => set({ contactDestinationEmail: e.target.value })}
                placeholder="hello@yourbusiness.com"
                className="bg-background font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">Shown on the Contact page so customers know where to reach you.</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-2">
              <p className="text-sm font-bold text-muted-foreground">Live order notifications use backend secrets when they are present.</p>
              <p className="text-xs text-muted-foreground">Set ORDER_NOTIFICATION_EMAIL for email delivery, ORDER_NOTIFICATION_PHONE for SMS delivery, RESEND_API_KEY for email sending, and TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE for SMS sending.</p>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="features" className="max-w-3xl">
          <SectionCard title="Core Features">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
              <div>
                <Label className="font-black text-lg text-primary uppercase tracking-wider">Enable Online Ordering</Label>
                <p className="text-sm text-muted-foreground font-bold">Turn off to stop accepting orders globally.</p>
              </div>
              <Switch checked={formData.enableOrdering} onCheckedChange={v => set({ enableOrdering: v })} className="scale-125 mr-2 shrink-0" />
            </div>
            <div className="flex items-center justify-between p-3">
              <div>
                <Label className="font-bold">Show Prices Publicly</Label>
                <p className="text-sm text-muted-foreground">Display prices on menu items</p>
              </div>
              <Switch checked={formData.showPricesPublicly} onCheckedChange={v => set({ showPricesPublicly: v })} />
            </div>
            <div className="flex items-center justify-between p-3">
              <div>
                <Label className="font-bold">Show Sold Out Items</Label>
                <p className="text-sm text-muted-foreground">Keep items visible when out of stock</p>
              </div>
              <Switch checked={formData.showSoldOutItems} onCheckedChange={v => set({ showSoldOutItems: v })} />
            </div>
          </SectionCard>

          <SectionCard title="Page Toggles">
            <div className="space-y-1">
              {[
                { key: 'enableCustomOrders', label: 'Custom Orders Page' },
                { key: 'enableSeasonalSection', label: 'Seasonal Specials Page' },
                { key: 'enableGallery', label: 'Photo Gallery Page' },
                { key: 'enableFeaturedSection', label: 'Homepage Featured Section' },
                { key: 'enableMerch', label: 'Merch Shop Page' },
                { key: 'enableDonutzzz', label: 'Donutzzz Section' },
                { key: 'showDonutzzzOnHome', label: 'Show Donutzzz on Homepage' },
                { key: 'showDonutzzzInMenu', label: 'Show Donutzzz in Menu' },
                { key: 'enableDirtySodazzz', label: 'Dirty Sodazzz Section' },
                { key: 'showDirtySodazzzOnHome', label: 'Show Dirty Sodazzz on Homepage' },
                { key: 'showDirtySodazzzInMenu', label: 'Show Dirty Sodazzz in Menu' },
              ].map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                  <Label className="font-bold">{toggle.label}</Label>
                  <Switch
                    checked={formData[toggle.key as keyof Settings] as boolean}
                    onCheckedChange={v => set({ [toggle.key]: v })}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="logistics" className="max-w-3xl">
          <SectionCard title="Fulfillment Methods">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Enable Pickup</Label>
                <p className="text-sm text-muted-foreground">Allow customers to pick up orders</p>
              </div>
              <Switch checked={formData.enablePickup} onCheckedChange={v => set({ enablePickup: v })} />
            </div>
            <div className="flex items-center justify-between p-3">
              <div>
                <Label className="font-bold">Enable Delivery</Label>
                <p className="text-sm text-muted-foreground">Allow customers to request delivery</p>
              </div>
              <Switch checked={formData.enableDelivery} onCheckedChange={v => set({ enableDelivery: v })} />
            </div>
            {formData.enableDelivery && (
              <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Charge Delivery Fee</Label>
                  <Switch checked={formData.deliveryFeeEnabled} onCheckedChange={v => set({ deliveryFeeEnabled: v })} />
                </div>
                {formData.deliveryFeeEnabled && (
                  <div>
                    <Label className="font-bold mb-2 block">Flat Delivery Fee ($)</Label>
                    <Input type="number" value={formData.deliveryFeeAmount} onChange={e => set({ deliveryFeeAmount: parseFloat(e.target.value) || 0 })} className="bg-background max-w-[160px]" />
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Delivery Directions" icon={<MapPin className="w-4 h-4" />}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Show "Open Directions" button on delivery orders</Label>
                <p className="text-sm text-muted-foreground">Adds a Google Maps directions link in the admin order view from your business address to the customer's delivery address.</p>
              </div>
              <Switch
                checked={formData.deliveryDirectionsButtonEnabled}
                onCheckedChange={v => set({ deliveryDirectionsButtonEnabled: v })}
              />
            </div>
            <div className="bg-muted/20 rounded-xl p-4 border border-border space-y-2">
              <p className="text-sm font-bold">Current business address:</p>
              <p className="text-sm text-muted-foreground">
                {formData.businessAddress || <span className="text-amber-400">Not set — add it in the General tab to enable directions.</span>}
              </p>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="helper" className="max-w-3xl">
          <SectionCard title="On-Site Candy Helper (Floating Chatbot)" icon={<MessageCircle className="w-4 h-4" />}>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 -mt-2">
              <p className="text-sm font-bold text-primary">This section controls the floating Candy Helper chatbot button only.</p>
              <p className="text-xs text-muted-foreground mt-1">
                The toggles below decide whether the small "💬 HELPER" button appears in the bottom-right corner on customer pages. They do NOT control infinite scroll, pagination, or product loading. The helper runs 100% locally in the browser — no OpenAI, no Gemini, no API key required.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Enable Candy Helper</Label>
                <p className="text-sm text-muted-foreground">Master switch for the floating chatbot.</p>
              </div>
              <Switch checked={formData.helperEnabled} onCheckedChange={v => set({ helperEnabled: v })} data-testid="toggle-helper-enabled" />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Show floating helper button</Label>
                <p className="text-sm text-muted-foreground">When off, the helper bubble stays hidden even if "Enable Candy Helper" is on.</p>
              </div>
              <Switch checked={formData.helperShowFloating} onCheckedChange={v => set({ helperShowFloating: v })} data-testid="toggle-helper-floating" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">Show helper bubble on these customer pages:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'helperShowOnHome' as const, label: 'Show helper on Home' },
                  { key: 'helperShowOnMenu' as const, label: 'Show helper on Menu' },
                  { key: 'helperShowOnMerch' as const, label: 'Show helper on Merch' },
                  { key: 'helperShowOnCart' as const, label: 'Show helper on Cart' },
                ].map(t => (
                  <div key={t.key} className="flex items-center justify-between p-2 rounded-lg border border-border">
                    <Label className="font-bold text-sm">{t.label}</Label>
                    <Switch checked={formData[t.key]} onCheckedChange={v => set({ [t.key]: v })} data-testid={`toggle-${t.key}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { key: 'helperAllowMerchSuggestions' as const, label: 'Suggest merch' },
                { key: 'helperAllowRewardsSuggestions' as const, label: 'Talk about rewards basics' },
                { key: 'helperAllowReferralSuggestions' as const, label: 'Talk about referrals basics' },
                { key: 'helperAllowCustomOrderIdeas' as const, label: 'Suggest custom order ideas' },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <Label className="font-bold text-sm">{t.label}</Label>
                  <Switch checked={formData[t.key]} onCheckedChange={v => set({ [t.key]: v })} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Greeting Message</Label>
              <Input value={formData.helperGreeting} onChange={e => set({ helperGreeting: e.target.value })} className="bg-background font-medium h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Fallback Message (when nothing matches)</Label>
              <Textarea value={formData.helperFallbackMessage} onChange={e => set({ helperFallbackMessage: e.target.value })} className="bg-background font-medium min-h-[70px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Allergy Disclaimer (shown under each reply)</Label>
              <Input value={formData.helperAllergyDisclaimer} onChange={e => set({ helperAllergyDisclaimer: e.target.value })} className="bg-background font-medium h-11" />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label className="font-bold">Max Recommendations Per Reply</Label>
              <Input type="number" min={1} max={6} value={formData.helperMaxRecommendations} onChange={e => set({ helperMaxRecommendations: Math.max(1, parseInt(e.target.value) || 3) })} className="bg-background font-bold h-11" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="max-w-3xl">
          <SectionCard title="Admin Notification Bell" icon={<Bell className="w-4 h-4" />}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Show notification bell in admin header</Label>
                <p className="text-sm text-muted-foreground">Master switch for the bell icon and badge.</p>
              </div>
              <Switch
                checked={formData.notificationBellEnabled}
                onCheckedChange={v => set({ notificationBellEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Auto-refresh notifications</Label>
                <p className="text-sm text-muted-foreground">Periodically check for new orders and messages.</p>
              </div>
              <Switch
                checked={formData.notificationPollingEnabled}
                onCheckedChange={v => set({ notificationPollingEnabled: v })}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label className="font-bold">Refresh interval (seconds)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={formData.notificationPollingSeconds}
                onChange={e =>
                  set({ notificationPollingSeconds: Math.max(5, Math.min(120, parseInt(e.target.value) || 12)) })
                }
                className="bg-background font-bold h-11"
              />
              <p className="text-xs text-muted-foreground">Recommended: 10-15 seconds. Slows down 4x when the tab is hidden.</p>
            </div>
          </SectionCard>

          <SectionCard title="Notification Sounds" icon={<Volume2 className="w-4 h-4" />}>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 -mt-2">
              <p className="text-sm font-bold text-primary">Sounds use the browser's built-in audio synth.</p>
              <p className="text-xs text-muted-foreground mt-1">
                No audio files, no third-party services. After enabling sounds, click anywhere in the admin once so the browser allows audio playback (you'll see a one-click "enable sounds" prompt in the bell dropdown the first time).
              </p>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Enable notification sounds</Label>
                <p className="text-sm text-muted-foreground">Master switch for all chimes.</p>
              </div>
              <Switch
                checked={formData.notificationSoundsEnabled}
                onCheckedChange={v => set({ notificationSoundsEnabled: v })}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label className="font-bold">Volume ({Math.round((formData.notificationSoundVolume ?? 0.7) * 100)}%)</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={formData.notificationSoundVolume ?? 0.7}
                onChange={e => set({ notificationSoundVolume: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2">
              {[
                {
                  key: 'orderSoundEnabled' as const,
                  label: 'Order chime',
                  desc: 'Bright two-note (G5 → C6) for new orders.',
                  testLabel: 'Test Order Sound',
                  play: () => playOrderNotificationSound(formData.notificationSoundVolume ?? 0.7),
                },
                {
                  key: 'messageSoundEnabled' as const,
                  label: 'Message chime',
                  desc: 'Soft double ping for new customer messages.',
                  testLabel: 'Test Message Sound',
                  play: () => playMessageNotificationSound(formData.notificationSoundVolume ?? 0.7),
                },
                {
                  key: 'generalSoundEnabled' as const,
                  label: 'General chime',
                  desc: 'Short neutral beep for everything else.',
                  testLabel: 'Test General Sound',
                  play: () => playGeneralNotificationSound(formData.notificationSoundVolume ?? 0.7),
                },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="min-w-0 flex-1 pr-3">
                    <Label className="font-bold">{t.label}</Label>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void unlockThenPlay(t.play, () => toast({
                        title: 'Browser blocked sound',
                        description: 'Your browser blocked sound until you interact with the page. Click Enable notification sounds.',
                        variant: 'destructive',
                      }))}
                      className="font-bold uppercase text-xs"
                      title={t.testLabel}
                    >
                      {t.testLabel}
                    </Button>
                    <Switch checked={formData[t.key]} onCheckedChange={v => set({ [t.key]: v })} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="helper" className="max-w-3xl">
          <SectionCard title="AI Tools Setup" icon={<Info className="w-4 h-4" />}>
            <div className="rounded-lg border border-secondary/40 bg-secondary/5 p-4 space-y-2">
              <p className="text-sm font-black text-secondary uppercase tracking-wider">Optional: OpenAI AI Tools</p>
              <p className="text-sm text-muted-foreground font-medium">
                AI product descriptions, name suggestions, and campaign message drafts are available when you add an OpenAI API key.
              </p>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                <li>Go to <span className="font-bold text-foreground">Replit Secrets</span> (the lock icon in the left sidebar).</li>
                <li>Add a secret named <span className="font-mono font-black text-primary">OPENAI_API_KEY</span> with your OpenAI API key.</li>
                <li>Restart the <span className="font-bold text-foreground">API Server</span> workflow.</li>
                <li>AI buttons will appear in the Product form and Campaign editor.</li>
              </ol>
              <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                AI tools are optional. The app works fully without them. AI-generated text is a draft — always review before publishing or sending.
              </p>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="analytics" className="max-w-3xl">
          <SectionCard title="Privacy-Friendly Site Analytics" icon={<BarChart3 className="w-4 h-4" />}>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 -mt-2">
              <p className="text-sm font-bold text-primary">No Google Analytics, no third-party trackers.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Visitor IDs are random and stored only in the browser (localStorage). Session IDs live in sessionStorage. Page views are saved to your own database with no IP address and no personal data.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Enable site analytics</Label>
                <p className="text-sm text-muted-foreground">Track page views from customer pages only.</p>
              </div>
              <Switch
                checked={formData.analyticsEnabled}
                onCheckedChange={v => set({ analyticsEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Exclude admin pages</Label>
                <p className="text-sm text-muted-foreground">Don't count visits to /admin or /api routes.</p>
              </div>
              <Switch
                checked={formData.analyticsExcludeAdminRoutes}
                onCheckedChange={v => set({ analyticsExcludeAdminRoutes: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Show "Site Views" card on dashboard</Label>
                <p className="text-sm text-muted-foreground">Toggle the analytics summary card on the admin dashboard.</p>
              </div>
              <Switch
                checked={formData.analyticsShowDashboardCard}
                onCheckedChange={v => set({ analyticsShowDashboardCard: v })}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label className="font-bold">Retention cap (rows)</Label>
              <Input
                type="number"
                min={100}
                max={100000}
                value={formData.analyticsRetentionLimit}
                onChange={e =>
                  set({ analyticsRetentionLimit: Math.max(100, Math.min(100000, parseInt(e.target.value) || 5000)) })
                }
                className="bg-background font-bold h-11"
              />
              <p className="text-xs text-muted-foreground">When the table exceeds this, the oldest rows are pruned automatically.</p>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="inventory" className="max-w-3xl">
          <SectionCard title="Inventory Tracking" icon={<Boxes className="w-4 h-4" />}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Enable Inventory Tracking</Label>
                <p className="text-sm text-muted-foreground">Track stock levels for ingredients, packaging, and supplies.</p>
              </div>
              <Switch checked={formData.enableInventoryTracking} onCheckedChange={v => set({ enableInventoryTracking: v })} />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Show Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Display a banner on the Inventory page when items are running low or out.</p>
              </div>
              <Switch checked={formData.inventoryShowLowStockAlerts} onCheckedChange={v => set({ inventoryShowLowStockAlerts: v })} />
            </div>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <Label className="font-bold">Allow Negative Inventory</Label>
                <p className="text-sm text-muted-foreground">Let quantities go below zero (useful if fulfilling orders before restocking).</p>
              </div>
              <Switch checked={formData.inventoryAllowNegative} onCheckedChange={v => set({ inventoryAllowNegative: v })} />
            </div>
            <div className="space-y-2 max-w-xs p-3">
              <Label className="font-bold">Default Low Stock Threshold</Label>
              <Input
                type="number"
                min={0}
                value={formData.inventoryDefaultLowStockThreshold}
                onChange={e => set({ inventoryDefaultLowStockThreshold: Math.max(0, parseInt(e.target.value) || 0) })}
                className="bg-background font-bold h-11"
              />
              <p className="text-xs text-muted-foreground">Applied when creating new inventory items. Individual items can override this.</p>
            </div>
            <div className="space-y-2 max-w-xs p-3">
              <Label className="font-bold">Inventory Deduction Timing</Label>
              <select
                value={formData.inventoryDeductTiming}
                onChange={e => set({ inventoryDeductTiming: e.target.value as Settings['inventoryDeductTiming'] })}
                className="w-full h-11 rounded-md border border-border bg-background px-3 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="on_order">On Order (deduct when order placed)</option>
                <option value="on_completion">On Completion (deduct when order completed)</option>
                <option value="manual">Manual (admin deducts from order detail)</option>
              </select>
              <p className="text-xs text-muted-foreground">Controls when inventory is automatically suggested for deduction. Manual requires pressing the Deduct button per order.</p>
            </div>
            <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4 text-sm">
              <p className="font-black text-secondary mb-1">How to set up product recipes</p>
              <p className="text-muted-foreground">Go to <strong className="text-foreground">Productzzz → Edit</strong> any product and scroll to the <strong className="text-foreground">Inventory Usage</strong> section to link inventory items to that product (the recipe). When enabled, deducting an order will automatically reduce those items.</p>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
