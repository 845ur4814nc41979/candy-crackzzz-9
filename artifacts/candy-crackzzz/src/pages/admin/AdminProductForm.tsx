import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, Save, Plus, Trash2, Boxes } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/ImageUpload';
import SmartDescriptionButton from '@/components/admin/SmartDescriptionButton';
import AiGenerateButton from '@/components/admin/AiGenerateButton';
import { generateProductDescription, generateShortProductDescription } from '@/lib/smartDescription';
import { apiAiProductDescription } from '@/lib/api';
import { Product, ProductCategory, InventoryUsageItem, InventoryDeductionTiming, InventoryUnit } from '@/types';

const UNIT_LABELS: Record<InventoryUnit, string> = {
  each: 'each', oz: 'oz', lb: 'lb', gram: 'g', gallon: 'gal',
  bottle: 'bottle', case: 'case', box: 'box', sleeve: 'sleeve',
  pack: 'pack', bag: 'bag', roll: 'roll', other: 'other',
};
const UNITS: InventoryUnit[] = ['each','oz','lb','gram','gallon','bottle','case','box','sleeve','pack','bag','roll','other'];

const defaultProduct: Omit<Product, 'id' | 'createdAt'> = {
  name: '',
  slug: '',
  category: 'candy-grapes',
  description: '',
  shortDescription: '',
  price: 0,
  imageUrl: '',
  flavorNotes: '',
  colorThemeNotes: '',
  isAvailable: true,
  isFeatured: false,
  isSeasonal: false,
  isCustomEligible: false,
  isSoldOut: false,
  isVisible: true,
  inventoryUsage: [],
};

export default function AdminProductForm() {
  const [, newParams] = useRoute('/admin/products/new');
  const [, editParams] = useRoute('/admin/products/:id/edit');
  const isEdit = !!editParams;
  const productId = editParams?.id;
  const [, setLocation] = useLocation();

  const { products, setProducts, inventoryItems } = useAppContext();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt'>>(defaultProduct);
  const [priceType, setPriceType] = useState<'fixed' | 'custom'>('fixed');

  useEffect(() => {
    if (isEdit && productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setFormData(product);
        setPriceType(product.price === null ? 'custom' : 'fixed');
      } else {
        setLocation('/admin/products');
      }
    }
  }, [isEdit, productId, products]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !isEdit) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      return updated;
    });
  };

  const handlePriceTypeChange = (type: 'fixed' | 'custom') => {
    setPriceType(type);
    if (type === 'custom') {
      handleChange('price', null);
    } else {
      handleChange('price', 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit && productId) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...formData, id: p.id, createdAt: p.createdAt } : p));
      toast({ title: "Product updated", description: "Changes saved successfully." });
    } else {
      const newProduct: Product = {
        ...formData,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      setProducts(prev => [newProduct, ...prev]);
      toast({ title: "Product created", description: `${newProduct.name} has been added.` });
    }
    
    setLocation('/admin/products');
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/products')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4 border-b border-border pb-2">Basic Info</h2>
            
            <div className="space-y-2">
              <Label className="font-bold">Product Name</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => handleChange('name', e.target.value)} 
                className="bg-background font-bold text-lg h-12"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold">Category</Label>
                <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
                  <SelectTrigger className="bg-background font-bold h-12">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candy-grapes">Candy Grapes</SelectItem>
                    <SelectItem value="candy-pineapple">Candy Pineapple</SelectItem>
                    <SelectItem value="party-trays">Party Trays</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Pricing</Label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" size="sm" variant={priceType === 'fixed' ? 'default' : 'outline'} onClick={() => handlePriceTypeChange('fixed')} className="flex-1 font-bold uppercase text-xs">Fixed</Button>
                  <Button type="button" size="sm" variant={priceType === 'custom' ? 'default' : 'outline'} onClick={() => handlePriceTypeChange('custom')} className="flex-1 font-bold uppercase text-xs">Custom Quote</Button>
                </div>
                {priceType === 'fixed' && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.price || ''} 
                      onChange={e => handleChange('price', parseFloat(e.target.value))} 
                      className="bg-background font-bold pl-8 h-12"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Label className="font-bold">Short Description (Card View)</Label>
                <div className="flex flex-wrap gap-2 justify-end">
                  <SmartDescriptionButton
                    generate={() => generateShortProductDescription(formData)}
                    onApply={text => handleChange('shortDescription', text.slice(0, 100))}
                    disabled={!formData.name}
                    label="Local Generate"
                    testId="smart-desc-product-short"
                  />
                  <AiGenerateButton
                    generate={async () => {
                      const res = await apiAiProductDescription({
                        productName: formData.name,
                        category: formData.category,
                        flavors: formData.flavorNotes ? [formData.flavorNotes] : [],
                        notes: formData.colorThemeNotes || undefined,
                      });
                      if (!res.ok) throw new Error(res.message ?? 'AI error');
                      return (res.description ?? '').slice(0, 100);
                    }}
                    onApply={text => handleChange('shortDescription', text.slice(0, 100))}
                    disabled={!formData.name}
                    label="AI Generate"
                    draftLabel="AI short description — review before applying"
                    testId="ai-desc-product-short"
                  />
                </div>
              </div>
              <Input 
                required 
                maxLength={100}
                value={formData.shortDescription} 
                onChange={e => handleChange('shortDescription', e.target.value)} 
                className="bg-background font-medium"
              />
              <p className="text-xs text-muted-foreground text-right">{formData.shortDescription.length}/100</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Label className="font-bold">Full Description (Detail View)</Label>
                <div className="flex flex-wrap gap-2 justify-end">
                  <SmartDescriptionButton
                    generate={() => generateProductDescription(formData)}
                    onApply={text => handleChange('description', text)}
                    disabled={!formData.name}
                    label="Local Generate"
                    testId="smart-desc-product-full"
                  />
                  <AiGenerateButton
                    generate={async () => {
                      const res = await apiAiProductDescription({
                        productName: formData.name,
                        category: formData.category,
                        flavors: formData.flavorNotes ? [formData.flavorNotes] : [],
                        notes: formData.colorThemeNotes || undefined,
                      });
                      if (!res.ok) throw new Error(res.message ?? 'AI error');
                      return res.description ?? '';
                    }}
                    onApply={text => handleChange('description', text)}
                    disabled={!formData.name}
                    label="AI Generate"
                    draftLabel="AI full description — review before applying"
                    testId="ai-desc-product-full"
                  />
                </div>
              </div>
              <Textarea 
                required 
                value={formData.description} 
                onChange={e => handleChange('description', e.target.value)} 
                className="bg-background min-h-[150px] font-medium resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Label className="font-bold">Suggest Product Names (AI)</Label>
                <AiGenerateButton
                  generate={async () => {
                    const res = await apiAiProductDescription({
                      productName: formData.name || 'candy treat',
                      category: formData.category,
                      flavors: formData.flavorNotes ? [formData.flavorNotes] : [],
                    });
                    if (!res.ok) throw new Error(res.message ?? 'AI error');
                    const names = res.suggestedNames ?? [];
                    if (!names.length) throw new Error('No name suggestions returned.');
                    return names.join('\n');
                  }}
                  onApply={text => {
                    const firstName = text.split('\n')[0]?.trim();
                    if (firstName) handleChange('name', firstName);
                  }}
                  disabled={false}
                  label="Suggest Namezzz"
                  draftLabel="AI name ideas — pick one or edit, then Apply to set the name"
                  applyLabel="Apply first name"
                  showCopy
                  testId="ai-suggest-names"
                />
              </div>
            </div>
          </div>

          {inventoryItems.length > 0 && (
            <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-xl font-black uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-secondary" /> Inventory Usage (Recipe)
              </h2>
              <p className="text-sm text-muted-foreground -mt-1">
                Link inventory items that are consumed when this product is sold. These define the "recipe" used for automatic deductions.
              </p>
              {(formData.inventoryUsage ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No inventory items linked. Add below to set up a recipe.</p>
              ) : (
                <div className="space-y-2">
                  {(formData.inventoryUsage ?? []).map((usage, idx) => {
                    const invItem = inventoryItems.find(i => i.id === usage.inventoryItemId);
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-background rounded-xl p-3 border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{invItem?.name ?? usage.inventoryItemId}</div>
                          <div className="text-xs text-muted-foreground">{usage.quantityUsed} {UNIT_LABELS[usage.unit as InventoryUnit] ?? usage.unit} · {usage.deductTiming} · {usage.required ? 'required' : 'optional'}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                          handleChange('inventoryUsage', (formData.inventoryUsage ?? []).filter((_, i) => i !== idx));
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border border-dashed border-border rounded-xl p-4 space-y-3 bg-muted/10">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Add Inventory Item</p>
                <AddUsageRow
                  inventoryItems={inventoryItems}
                  onAdd={(usage) => handleChange('inventoryUsage', [...(formData.inventoryUsage ?? []), usage])}
                />
              </div>
            </div>
          )}

          <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4 border-b border-border pb-2">Product Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold">Flavor Notes</Label>
                <Input 
                  value={formData.flavorNotes} 
                  onChange={e => handleChange('flavorNotes', e.target.value)} 
                  placeholder="e.g. Mixed Fruit, Sour Apple"
                  className="bg-background font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Color/Theme</Label>
                <Input 
                  value={formData.colorThemeNotes} 
                  onChange={e => handleChange('colorThemeNotes', e.target.value)} 
                  placeholder="e.g. Rainbow, Pink & Blue"
                  className="bg-background font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4 border-b border-border pb-2">Product Image</h2>
            <ImageUpload 
              value={formData.imageUrl} 
              onChange={(url) => handleChange('imageUrl', url)} 
              className="w-full"
            />
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4 border-b border-border pb-2">Status & Badges</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base">Visible in Store</Label>
                  <p className="text-xs text-muted-foreground">Hide product without deleting</p>
                </div>
                <Switch checked={formData.isVisible} onCheckedChange={(v) => handleChange('isVisible', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base text-destructive">Mark Sold Out</Label>
                  <p className="text-xs text-muted-foreground">Prevent ordering</p>
                </div>
                <Switch checked={formData.isSoldOut} onCheckedChange={(v) => handleChange('isSoldOut', v)} />
              </div>
              <div className="w-full h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base text-secondary">Featured</Label>
                  <p className="text-xs text-muted-foreground">Show on homepage</p>
                </div>
                <Switch checked={formData.isFeatured} onCheckedChange={(v) => handleChange('isFeatured', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base text-accent">Seasonal</Label>
                  <p className="text-xs text-muted-foreground">Add seasonal badge</p>
                </div>
                <Switch checked={formData.isSeasonal} onCheckedChange={(v) => handleChange('isSeasonal', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-base text-primary">Customizable</Label>
                  <p className="text-xs text-muted-foreground">Show theme inputs on product page</p>
                </div>
                <Switch checked={formData.isCustomEligible} onCheckedChange={(v) => handleChange('isCustomEligible', v)} />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full h-16 text-xl font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
            <Save className="w-5 h-5 mr-2" /> Save Product
          </Button>
        </div>

      </form>
    </AdminLayout>
  );
}

function AddUsageRow({ inventoryItems, onAdd }: {
  inventoryItems: import('@/types').InventoryItem[];
  onAdd: (u: InventoryUsageItem) => void;
}) {
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState<InventoryUnit>('each');
  const [timing, setTiming] = useState<InventoryDeductionTiming>('manual');
  const [required, setRequired] = useState(true);

  const selectedItem = inventoryItems.find(i => i.id === itemId);

  const handleAdd = () => {
    if (!itemId || !qty || parseFloat(qty) <= 0) return;
    onAdd({ inventoryItemId: itemId, quantityUsed: parseFloat(qty), unit, deductTiming: timing, required });
    setItemId('');
    setQty('1');
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[180px] space-y-1">
        <Label className="text-xs font-bold">Inventory Item</Label>
        <Select value={itemId} onValueChange={v => { setItemId(v); const i = inventoryItems.find(x => x.id === v); if (i) setUnit(i.unit); }}>
          <SelectTrigger className="bg-background font-bold h-9 text-xs">
            <SelectValue placeholder="Select item…" />
          </SelectTrigger>
          <SelectContent>
            {inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-20 space-y-1">
        <Label className="text-xs font-bold">Qty</Label>
        <Input type="number" min={0.01} step="0.01" value={qty} onChange={e => setQty(e.target.value)} className="bg-background font-bold h-9 text-xs" />
      </div>
      <div className="w-24 space-y-1">
        <Label className="text-xs font-bold">Unit</Label>
        <Select value={unit} onValueChange={v => setUnit(v as InventoryUnit)}>
          <SelectTrigger className="bg-background font-bold h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="w-36 space-y-1">
        <Label className="text-xs font-bold">Deduct When</Label>
        <Select value={timing} onValueChange={v => setTiming(v as InventoryDeductionTiming)}>
          <SelectTrigger className="bg-background font-bold h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="on_order">On Order</SelectItem>
            <SelectItem value="on_completion">On Completion</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-1">
        <Label className="text-xs font-bold">Req.</Label>
        <Switch checked={required} onCheckedChange={setRequired} />
      </div>
      <Button type="button" size="sm" onClick={handleAdd} disabled={!itemId} className="font-black h-9">
        <Plus className="w-3.5 h-3.5 mr-1" /> Add
      </Button>
    </div>
  );
}
