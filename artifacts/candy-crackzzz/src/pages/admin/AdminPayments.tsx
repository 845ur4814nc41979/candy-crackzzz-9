import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload } from 'lucide-react';
import { Settings } from '@/types';

type MethodRowProps = {
  children?: React.ReactNode;
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
};

function MethodRow({ children, label, description, enabled, onToggle }: MethodRowProps) {
  return (
    <div className={`border border-border rounded-xl overflow-hidden transition-all ${enabled ? 'bg-background' : 'bg-muted/20'}`}>
      <div className="flex items-center justify-between p-4">
        <div>
          <Label className={`font-bold text-base ${!enabled ? 'text-muted-foreground' : ''}`}>{label}</Label>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && children && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function AdminPayments() {
  const { settings, setSettings } = useAppContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Settings>(settings);

  const set = (field: Partial<Settings>) => setFormData(p => ({ ...p, ...field }));

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ qrCodeImageBase64: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const nextSettings: Settings = {
      ...formData,
      allowManualInvoice: formData.enableManualInvoice,
      allowCashAtPickup: formData.enableCashAtPickup,
    };

    setSettings(nextSettings);
    setFormData(nextSettings);
    toast({ title: 'Payment Settings Saved', description: 'Checkout options updated.' });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Payments</h1>
          <p className="text-muted-foreground font-bold">Configure how customers pay you.</p>
        </div>
        <Button size="lg" onClick={handleSave} className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          <Save className="w-5 h-5 mr-2" /> Save Settings
        </Button>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-card border-2 border-primary/50 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider mb-1">Enable Payment Collection</h2>
              <p className="text-muted-foreground font-bold text-sm max-w-md">
                When off, all payments are hidden. Orders submit as requests only — you invoice manually.
              </p>
            </div>
            <Switch checked={formData.enablePayments} onCheckedChange={v => set({ enablePayments: v })} className="scale-125 origin-left shrink-0" />
          </div>
        </div>

        <div className={`space-y-6 transition-opacity duration-300 ${!formData.enablePayments ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-border pb-3">Payment Methods</h2>
            <div className="space-y-3">
              <MethodRow
                label="Stripe Payment Link"
                description="Send customers to a Stripe-hosted checkout or payment link"
                enabled={formData.enableStripe}
                onToggle={v => set({ enableStripe: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Stripe Payment Link URL</Label>
                  <Input value={formData.stripePaymentLink} onChange={e => set({ stripePaymentLink: e.target.value })} placeholder="https://buy.stripe.com/..." className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.stripeInstructions} onChange={e => set({ stripeInstructions: e.target.value })} placeholder="e.g. Tap the Stripe link after we confirm your order total" className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="PayPal"
                description="Show your PayPal.me link or PayPal email at checkout"
                enabled={formData.enablePayPal}
                onToggle={v => set({ enablePayPal: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">PayPal Link or Email</Label>
                  <Input value={formData.paypalContact} onChange={e => set({ paypalContact: e.target.value })} placeholder="https://paypal.me/yourname or email@example.com" className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.paypalInstructions} onChange={e => set({ paypalInstructions: e.target.value })} placeholder="Payment instructions..." className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Square Checkout Link"
                description="Show a Square-hosted checkout link at checkout"
                enabled={formData.enableSquare}
                onToggle={v => set({ enableSquare: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Square Checkout URL</Label>
                  <Input value={formData.squarePaymentLink} onChange={e => set({ squarePaymentLink: e.target.value })} placeholder="https://square.link/u/..." className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.squareInstructions} onChange={e => set({ squareInstructions: e.target.value })} placeholder="Payment instructions..." className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Cash App"
                description="Show your Cash App tag at checkout"
                enabled={formData.enableCashApp}
                onToggle={v => set({ enableCashApp: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Cash App Tag</Label>
                  <Input value={formData.cashAppTag} onChange={e => set({ cashAppTag: e.target.value })} placeholder="$YourTag" className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.cashAppInstructions} onChange={e => set({ cashAppInstructions: e.target.value })} placeholder="e.g. Send payment with your order number" className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Venmo"
                description="Show your Venmo username at checkout"
                enabled={formData.enableVenmo}
                onToggle={v => set({ enableVenmo: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Venmo Username</Label>
                  <Input value={formData.venmoUsername} onChange={e => set({ venmoUsername: e.target.value })} placeholder="@YourUsername" className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.venmoInstructions} onChange={e => set({ venmoInstructions: e.target.value })} placeholder="Payment instructions..." className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Zelle"
                description="Show your Zelle contact at checkout"
                enabled={formData.enableZelle}
                onToggle={v => set({ enableZelle: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Zelle Email or Phone</Label>
                  <Input value={formData.zelleContact} onChange={e => set({ zelleContact: e.target.value })} placeholder="email@example.com or (555) 000-0000" className="bg-muted h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.zelleInstructions} onChange={e => set({ zelleInstructions: e.target.value })} placeholder="Payment instructions..." className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="QR Code Payment"
                description="Upload a QR code image for customers to scan"
                enabled={formData.enableQRCode}
                onToggle={v => set({ enableQRCode: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">QR Code Image</Label>
                  {formData.qrCodeImageBase64 && (
                    <div className="flex items-center gap-3 mb-2">
                      <img src={formData.qrCodeImageBase64} alt="QR Code" className="w-24 h-24 object-contain rounded-lg border border-border bg-white p-1" />
                      <Button size="sm" variant="outline" onClick={() => set({ qrCodeImageBase64: '' })} className="font-bold">Remove</Button>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-primary transition-colors w-fit">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground">Upload QR Image</span>
                    <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                  </label>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions (optional)</Label>
                  <Textarea value={formData.qrCodeInstructions} onChange={e => set({ qrCodeInstructions: e.target.value })} placeholder="e.g. Scan to pay with any payment app" className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Manual Invoice"
                description="You send an invoice after confirming the order"
                enabled={formData.enableManualInvoice}
                onToggle={v => set({ enableManualInvoice: v, allowManualInvoice: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Invoice Instructions</Label>
                  <Textarea value={formData.manualInvoiceInstructions} onChange={e => set({ manualInvoiceInstructions: e.target.value })} className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>

              <MethodRow
                label="Cash at Pickup"
                description="Only shown if customer selects Pickup"
                enabled={formData.enableCashAtPickup}
                onToggle={v => set({ enableCashAtPickup: v, allowCashAtPickup: v })}
              >
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Instructions</Label>
                  <Textarea value={formData.cashAtPickupInstructions} onChange={e => set({ cashAtPickupInstructions: e.target.value })} className="bg-muted resize-none min-h-[60px]" />
                </div>
              </MethodRow>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-border pb-3">Payment Terms</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3">
                <div>
                  <Label className="font-bold">Allow Deposit Only (50%)</Label>
                  <p className="text-sm text-muted-foreground">Customer pays half upfront to secure their order</p>
                </div>
                <Switch checked={formData.allowDepositOnly} onCheckedChange={v => set({ allowDepositOnly: v })} />
              </div>
              <div className="flex items-center justify-between p-3">
                <div>
                  <Label className="font-bold">Allow Full Payment Upfront</Label>
                  <p className="text-sm text-muted-foreground">Customer pays 100% when ordering</p>
                </div>
                <Switch checked={formData.allowFullPayment} onCheckedChange={v => set({ allowFullPayment: v })} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-border pb-3">Global Payment Instructions</h2>
            <div className="space-y-2">
              <Label className="font-bold text-sm">Shown to customers at checkout (optional)</Label>
              <Textarea
                value={formData.paymentInstructions}
                onChange={e => set({ paymentInstructions: e.target.value })}
                placeholder="e.g. Payment is required within 24 hours of order confirmation."
                className="bg-background resize-none min-h-[80px]"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
