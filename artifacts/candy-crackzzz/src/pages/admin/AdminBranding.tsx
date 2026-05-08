import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import logoPath from "@assets/candy_crackzzz_2_1776628492110.png";

export default function AdminBranding() {
  const { settings, setSettings } = useAppContext();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    logoBase64: settings.logoBase64,
    showLogo: settings.showLogo
  });

  const handleSave = () => {
    setSettings(prev => ({ ...prev, ...formData }));
    toast({ title: "Branding Saved", description: "Logo and branding settings updated." });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Branding</h1>
          <p className="text-muted-foreground font-bold">Customize your storefront identity.</p>
        </div>
        <Button size="lg" onClick={handleSave} className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          <Save className="w-5 h-5 mr-2" /> Save Branding
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-8">
          <h2 className="text-xl font-black uppercase tracking-wider mb-2 border-b border-border pb-4">Logo Settings</h2>
          
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
            <div>
              <Label className="font-bold text-base">Display Logo</Label>
              <p className="text-sm text-muted-foreground">Show image logo instead of text name</p>
            </div>
            <Switch checked={formData.showLogo} onCheckedChange={v => setFormData({...formData, showLogo: v})} />
          </div>

          <div className="space-y-4">
            <Label className="font-bold text-base">Custom Logo Upload</Label>
            <p className="text-sm text-muted-foreground mb-4">Upload a PNG or SVG with a transparent background for best results. If left blank, the default app logo will be used.</p>
            <ImageUpload 
              value={formData.logoBase64} 
              onChange={v => setFormData({...formData, logoBase64: v})} 
              className="w-full max-w-sm"
            />
          </div>
        </div>

        <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider mb-2 border-b border-border pb-4">Preview</h2>
          <p className="text-sm text-muted-foreground mb-4">This is how your logo will appear in the navigation bar.</p>
          
          <div className="bg-background border border-border rounded-xl p-6 flex items-center justify-center min-h-[150px]">
            {formData.showLogo ? (
              formData.logoBase64 ? (
                <img src={formData.logoBase64} alt="Preview" className="h-12 object-contain" />
              ) : (
                <img src={logoPath} alt="Default Logo Preview" className="h-12 object-contain drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]" />
              )
            ) : (
              <span className="font-black text-2xl text-primary tracking-tight font-sans">
                {settings.businessName}
              </span>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
