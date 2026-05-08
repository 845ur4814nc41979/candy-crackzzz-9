import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { OrderRequest } from '@/types';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function CustomOrdersPage() {
  const { setOrders, settings } = useAppContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  const [formData, setFormData] = useState({
    eventType: '',
    colorTheme: '',
    productType: '',
    quantity: '',
    dueDate: '',
    notes: '',
    name: '',
    phone: '',
    email: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const newOrder: OrderRequest = {
      id: `CUST-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`,
      customerName: formData.name,
      phone: formData.phone,
      email: formData.email,
      requestedDate: formData.dueDate,
      requestedTime: 'TBD',
      pickupOrDelivery: 'pickup',
      eventType: formData.eventType,
      specialInstructions: `Custom Request: Theme [${formData.colorTheme}], Qty [${formData.quantity}]. Notes: ${formData.notes}`,
      notes: '',
      items: [{
        productId: 'custom',
        name: `Custom Order: ${formData.productType}`,
        quantity: 1,
        price: null
      }],
      status: 'new',
      paymentStatus: 'pending',
      total: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/notifications/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: settings.businessName,
          toEmail: settings.orderDestinationEmail || settings.businessEmail,
          toPhone: settings.orderNotificationPhone,
          order: newOrder,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.accepted) {
        throw new Error(result?.message || 'Custom order notifications are not configured yet.');
      }

      setOrders(prev => [newOrder, ...prev]);
      setLocation('/order-success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not submit your quote request right now.';
      toast({
        title: 'Quote request not submitted',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="bg-card border-b border-border py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/birthday-tray.png')] bg-cover bg-center opacity-10 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 text-foreground"
          >
            DREAM IT. WE CRACK IT.
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl font-bold text-muted-foreground"
          >
            Weddings, birthdays, corporate events, or just a Tuesday. Let's build something completely custom.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-card rounded-[2rem] border-2 border-primary/20 p-8 md:p-12 shadow-2xl shadow-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-[50px] rounded-full" />
          
          <div className="relative z-10">
            <h2 className="text-3xl font-black uppercase tracking-wider mb-8 border-b border-border pb-4">Request a Quote</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Event Type</Label>
                  <Select onValueChange={(val) => handleInputChange('eventType', val)} required>
                    <SelectTrigger className="bg-background h-14 font-bold">
                      <SelectValue placeholder="Select Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Baby Shower">Baby Shower</SelectItem>
                      <SelectItem value="Corporate">Corporate Event</SelectItem>
                      <SelectItem value="Party">Private Party</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Desired Theme / Colors</Label>
                  <Input required placeholder="e.g., Pink & Gold, Spiderman" value={formData.colorTheme} onChange={e => handleInputChange('colorTheme', e.target.value)} className="bg-background h-14 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">What are we making?</Label>
                  <Select onValueChange={(val) => handleInputChange('productType', val)} required>
                    <SelectTrigger className="bg-background h-14 font-bold">
                      <SelectValue placeholder="Select Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Candy Grapes">Candy Grapes</SelectItem>
                      <SelectItem value="Candy Pineapple">Candy Pineapple</SelectItem>
                      <SelectItem value="Mixed Tray">Mixed Party Tray</SelectItem>
                      <SelectItem value="Multiple">Multiple Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Quantity Estimate</Label>
                  <Input required placeholder="e.g., 50 skewers, 2 large trays" value={formData.quantity} onChange={e => handleInputChange('quantity', e.target.value)} className="bg-background h-14 font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Date Needed</Label>
                <Input required type="date" value={formData.dueDate} onChange={e => handleInputChange('dueDate', e.target.value)} className="bg-background h-14 font-bold w-full md:w-1/2" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Inspiration & Details</Label>
                <Textarea placeholder="Tell us everything. The more details, the better." value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} className="bg-background min-h-[120px] resize-none font-bold" />
              </div>

              <h3 className="text-xl font-black uppercase tracking-wider pt-6 border-t border-border">Your Contact Info</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Full Name</Label>
                  <Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} className="bg-background h-14 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Phone Number</Label>
                  <Input required type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} className="bg-background h-14 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Email Address</Label>
                <Input required type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="bg-background h-14 font-bold" />
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-16 mt-8 text-xl font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.4)]">
                {isSubmitting ? 'SENDING...' : 'REQUEST QUOTE'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
