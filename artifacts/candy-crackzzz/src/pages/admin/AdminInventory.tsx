import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, Edit2, Trash2, RotateCcw, Package, AlertTriangle,
  TrendingDown, DollarSign, X, ChevronDown, ChevronUp, History, Boxes,
} from 'lucide-react';
import type {
  InventoryItem, InventoryCategory, InventoryUnit, InventoryTransaction, InventoryTransactionType
} from '@/types';

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  'ingredients': 'Ingredients',
  'candy-coating': 'Candy Coating',
  'fruit': 'Fruit',
  'toppings': 'Toppings',
  'drinks-soda': 'Drinks / Soda',
  'donutzzz': 'Donutzzz',
  'containers': 'Containers',
  'cups': 'Cups',
  'lids': 'Lids',
  'bags': 'Bags',
  'labels': 'Labels',
  'utensils': 'Utensils',
  'cleaning-prep': 'Cleaning / Prep',
  'misc': 'Misc',
};

const UNIT_LABELS: Record<InventoryUnit, string> = {
  'each': 'each',
  'oz': 'oz',
  'lb': 'lb',
  'gram': 'g',
  'gallon': 'gal',
  'bottle': 'bottle',
  'case': 'case',
  'box': 'box',
  'sleeve': 'sleeve',
  'pack': 'pack',
  'bag': 'bag',
  'roll': 'roll',
  'other': 'other',
};

const TRANSACTION_LABELS: Record<InventoryTransactionType, string> = {
  order_deduction: 'Order Deduction',
  manual_adjustment: 'Manual Adjustment',
  restock: 'Restock',
  waste: 'Waste',
  correction: 'Correction',
  return: 'Return',
};

const CATEGORIES: InventoryCategory[] = [
  'ingredients', 'candy-coating', 'fruit', 'toppings', 'drinks-soda', 'donutzzz',
  'containers', 'cups', 'lids', 'bags', 'labels', 'utensils', 'cleaning-prep', 'misc',
];
const UNITS: InventoryUnit[] = ['each', 'oz', 'lb', 'gram', 'gallon', 'bottle', 'case', 'box', 'sleeve', 'pack', 'bag', 'roll', 'other'];

const blank = (): Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  category: 'ingredients',
  unit: 'each',
  currentQty: 0,
  lowStockThreshold: 10,
  reorderQty: 50,
  supplier: '',
  supplierLink: '',
  costPerUnit: undefined,
  notes: '',
  isActive: true,
});

function qtyStatus(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (item.currentQty <= 0) return 'out';
  if (item.currentQty <= item.lowStockThreshold) return 'low';
  return 'ok';
}

function StatusBadge({ item }: { item: InventoryItem }) {
  const s = qtyStatus(item);
  if (s === 'out') return <Badge className="bg-destructive/90 text-white font-black text-[10px] uppercase tracking-wider">Out of Stock</Badge>;
  if (s === 'low') return <Badge className="bg-yellow-500 text-black font-black text-[10px] uppercase tracking-wider">Low Stock</Badge>;
  return <Badge className="bg-emerald-600/90 text-white font-black text-[10px] uppercase tracking-wider">In Stock</Badge>;
}

export default function AdminInventory() {
  const { inventoryItems, setInventoryItems, inventoryTransactions, setInventoryTransactions, settings } = useAppContext();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low' | 'out'>('all');
  const [tab, setTab] = useState<'items' | 'history'>('items');

  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(blank());

  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('');

  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustType, setAdjustType] = useState<InventoryTransactionType>('manual_adjustment');
  const [adjustNote, setAdjustNote] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  const totalItems = inventoryItems.filter(i => i.isActive).length;
  const lowStockItems = inventoryItems.filter(i => i.isActive && qtyStatus(i) === 'low');
  const outOfStockItems = inventoryItems.filter(i => i.isActive && qtyStatus(i) === 'out');
  const estValue = inventoryItems.filter(i => i.isActive && i.costPerUnit && i.currentQty > 0)
    .reduce((acc, i) => acc + ((i.costPerUnit ?? 0) * i.currentQty), 0);

  const filtered = useMemo(() => {
    return inventoryItems.filter(item => {
      if (!item.isActive && statusFilter !== 'all') return false;
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.supplier ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || qtyStatus(item) === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [inventoryItems, search, categoryFilter, statusFilter]);

  const filteredHistory = useMemo(() => {
    const sorted = [...inventoryTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (historyFilter === 'all') return sorted;
    return sorted.filter(t => t.inventoryItemId === historyFilter);
  }, [inventoryTransactions, historyFilter]);

  const makeId = () => Math.random().toString(36).substring(2, 10);

  const openAdd = () => {
    setEditingItem(null);
    setForm(blank());
    setShowDialog(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentQty: item.currentQty,
      lowStockThreshold: item.lowStockThreshold,
      reorderQty: item.reorderQty,
      supplier: item.supplier ?? '',
      supplierLink: item.supplierLink ?? '',
      costPerUnit: item.costPerUnit,
      notes: item.notes ?? '',
      isActive: item.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    if (editingItem) {
      setInventoryItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...form, updatedAt: now } : i));
      toast({ title: 'Item updated', description: `${form.name} saved.` });
    } else {
      const newItem: InventoryItem = { ...form, id: makeId(), createdAt: now, updatedAt: now };
      setInventoryItems(prev => [...prev, newItem]);
      toast({ title: 'Item added', description: `${form.name} added to inventory.` });
    }
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    const item = inventoryItems.find(i => i.id === id);
    setInventoryItems(prev => prev.filter(i => i.id !== id));
    setConfirmDeleteId(null);
    toast({ title: 'Item deleted', description: `${item?.name ?? 'Item'} removed from inventory.` });
  };

  const handleRestock = () => {
    if (!restockTarget) return;
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const prev = restockTarget.currentQty;
    const next = prev + qty;
    setInventoryItems(items => items.map(i => i.id === restockTarget.id ? { ...i, currentQty: next, updatedAt: now } : i));
    const tx: InventoryTransaction = {
      id: makeId(),
      inventoryItemId: restockTarget.id,
      transactionType: 'restock',
      quantityChange: qty,
      previousQty: prev,
      newQty: next,
      reason: restockNote || 'Manual restock',
      createdAt: now,
    };
    setInventoryTransactions(t => [tx, ...t]);
    toast({ title: 'Restocked', description: `+${qty} ${UNIT_LABELS[restockTarget.unit]} added to ${restockTarget.name}.` });
    setShowRestockDialog(false);
    setRestockQty('');
    setRestockNote('');
  };

  const handleAdjust = () => {
    if (!adjustTarget) return;
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      toast({ title: 'Enter a non-zero adjustment', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const prev = adjustTarget.currentQty;
    const next = Math.max(settings.inventoryAllowNegative ? -Infinity : 0, prev + delta);
    setInventoryItems(items => items.map(i => i.id === adjustTarget.id ? { ...i, currentQty: next, updatedAt: now } : i));
    const tx: InventoryTransaction = {
      id: makeId(),
      inventoryItemId: adjustTarget.id,
      transactionType: adjustType,
      quantityChange: delta,
      previousQty: prev,
      newQty: next,
      reason: adjustNote || adjustType,
      createdAt: now,
    };
    setInventoryTransactions(t => [tx, ...t]);
    toast({ title: 'Adjustment recorded', description: `${delta > 0 ? '+' : ''}${delta} ${UNIT_LABELS[adjustTarget.unit]} for ${adjustTarget.name}.` });
    setShowAdjustDialog(false);
    setAdjustDelta('');
    setAdjustNote('');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1">Inventoryzz</h1>
          <p className="text-muted-foreground font-bold">Track ingredients, packaging, and supplies.</p>
        </div>
        <Button onClick={openAdd} size="lg" className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          <Plus className="w-5 h-5 mr-2" /> Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: totalItems, icon: <Boxes className="w-5 h-5" />, color: 'text-secondary' },
          { label: 'Low Stock', value: lowStockItems.length, icon: <TrendingDown className="w-5 h-5" />, color: 'text-yellow-400' },
          { label: 'Out of Stock', value: outOfStockItems.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-destructive' },
          { label: 'Est. Value', value: estValue > 0 ? `$${estValue.toFixed(2)}` : '—', icon: <DollarSign className="w-5 h-5" />, color: 'text-primary' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className={`flex items-center gap-2 mb-1 ${card.color}`}>{card.icon}<span className="text-xs font-black uppercase tracking-wider">{card.label}</span></div>
            <div className="text-2xl font-black">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {settings.inventoryShowLowStockAlerts && (lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-black uppercase tracking-wider text-sm mb-3">
            <AlertTriangle className="w-4 h-4" /> Stock Alerts
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStockItems.map(item => (
              <span key={item.id} className="text-xs font-black px-2.5 py-1 rounded-full bg-destructive/80 text-white">
                {item.name}: OUT
              </span>
            ))}
            {lowStockItems.filter(i => qtyStatus(i) !== 'out').map(item => (
              <span key={item.id} className="text-xs font-black px-2.5 py-1 rounded-full bg-yellow-500 text-black">
                {item.name}: {item.currentQty} {UNIT_LABELS[item.unit]} left
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="bg-card border border-border mb-4">
          <TabsTrigger value="items" className="font-bold uppercase tracking-wider px-5">Items</TabsTrigger>
          <TabsTrigger value="history" className="font-bold uppercase tracking-wider px-5">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items or suppliers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card font-bold h-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
              <SelectTrigger className="w-48 bg-card font-bold h-10">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-40 bg-card font-bold h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inventoryItems.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-14 text-center">
              <Boxes className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-lg font-black text-muted-foreground">No inventory items yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add ingredients, packaging, and supplies to get started.</p>
              <Button className="mt-6 font-black uppercase tracking-wider" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" /> Add First Item
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <p className="font-bold text-muted-foreground">No items match your filters.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Item</th>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground hidden md:table-cell">Category</th>
                      <th className="text-right px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Qty</th>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="text-right px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, idx) => (
                      <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/10 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                        <td className="px-4 py-3">
                          <div className="font-black text-base leading-tight">{item.name}</div>
                          {item.supplier && <div className="text-xs text-muted-foreground mt-0.5">{item.supplier}</div>}
                          {item.notes && <div className="text-xs text-muted-foreground/70 italic mt-0.5 truncate max-w-[200px]">{item.notes}</div>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs font-bold text-muted-foreground">{CATEGORY_LABELS[item.category]}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-black text-base">{item.currentQty}</div>
                          <div className="text-xs text-muted-foreground">{UNIT_LABELS[item.unit]}</div>
                          {item.costPerUnit && <div className="text-xs text-muted-foreground">${(item.costPerUnit * item.currentQty).toFixed(2)}</div>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <StatusBadge item={item} />
                          <div className="text-xs text-muted-foreground mt-1">Low @ {item.lowStockThreshold}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-black text-xs"
                              title="Restock"
                              onClick={() => { setRestockTarget(item); setShowRestockDialog(true); }}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restock
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-black text-xs"
                              title="Adjust"
                              onClick={() => { setAdjustTarget(item); setAdjustType('manual_adjustment'); setShowAdjustDialog(true); }}
                            >
                              ±
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDeleteId(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="flex gap-3 mb-4">
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-56 bg-card font-bold h-10">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Item</th>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground hidden md:table-cell">Type</th>
                      <th className="text-right px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground">Change</th>
                      <th className="text-right px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground hidden sm:table-cell">New Qty</th>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-xs text-muted-foreground hidden lg:table-cell">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((tx) => {
                      const item = inventoryItems.find(i => i.id === tx.inventoryItemId);
                      const isPositive = tx.quantityChange > 0;
                      return (
                        <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString()}<br />
                            <span className="text-muted-foreground/60">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-3 font-bold">{item?.name ?? tx.inventoryItemId}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs font-bold text-muted-foreground">{TRANSACTION_LABELS[tx.transactionType]}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-black text-base ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                              {isPositive ? '+' : ''}{tx.quantityChange}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold hidden sm:table-cell">{tx.newQty}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{tx.reason || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider">
              {editingItem ? 'Edit Item' : 'Add Inventory Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-bold">Item Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-background font-bold h-11" placeholder="e.g. Grape Juice Candy Coating" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v as InventoryCategory }))}>
                  <SelectTrigger className="bg-background font-bold h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v as InventoryUnit }))}>
                  <SelectTrigger className="bg-background font-bold h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Current Qty</Label>
                <Input type="number" min={0} step="0.1" value={form.currentQty} onChange={e => setForm(p => ({ ...p, currentQty: parseFloat(e.target.value) || 0 }))} className="bg-background font-bold h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Low Stock Alert</Label>
                <Input type="number" min={0} step="0.1" value={form.lowStockThreshold} onChange={e => setForm(p => ({ ...p, lowStockThreshold: parseFloat(e.target.value) || 0 }))} className="bg-background font-bold h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Reorder Qty</Label>
                <Input type="number" min={0} step="0.1" value={form.reorderQty} onChange={e => setForm(p => ({ ...p, reorderQty: parseFloat(e.target.value) || 0 }))} className="bg-background font-bold h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Cost Per Unit ($)</Label>
                <Input type="number" min={0} step="0.01" value={form.costPerUnit ?? ''} onChange={e => setForm(p => ({ ...p, costPerUnit: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="0.00" className="bg-background font-bold h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Supplier</Label>
                <Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name" className="bg-background font-bold h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Supplier Link</Label>
              <Input value={form.supplierLink} onChange={e => setForm(p => ({ ...p, supplierLink: e.target.value }))} placeholder="https://..." className="bg-background font-bold h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this item" className="bg-background font-bold h-11" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="font-bold">Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleSave} className="font-black uppercase tracking-wider">
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider">Restock — {restockTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground font-medium">
              Current: <span className="font-black text-foreground">{restockTarget?.currentQty} {restockTarget ? UNIT_LABELS[restockTarget.unit] : ''}</span>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Quantity to Add</Label>
              <Input type="number" min={0.1} step="0.1" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="0" className="bg-background font-bold h-11" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Note (optional)</Label>
              <Input value={restockNote} onChange={e => setRestockNote(e.target.value)} placeholder="e.g. Weekly order from supplier" className="bg-background h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestockDialog(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleRestock} className="font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700">Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider">Adjust — {adjustTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground font-medium">
              Current: <span className="font-black text-foreground">{adjustTarget?.currentQty} {adjustTarget ? UNIT_LABELS[adjustTarget.unit] : ''}</span>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Adjustment Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as InventoryTransactionType)}>
                <SelectTrigger className="bg-background font-bold h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="waste">Waste / Spoilage</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="return">Return to Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Quantity Change (use negative to deduct)</Label>
              <Input type="number" step="0.1" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} placeholder="e.g. -5 or +10" className="bg-background font-bold h-11" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Reason (optional)</Label>
              <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Dropped a bag" className="bg-background h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleAdjust} className="font-black uppercase tracking-wider">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-destructive uppercase tracking-wider">Delete Item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the item and cannot be undone. Transaction history will remain.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="font-bold">Cancel</Button>
            <Button variant="destructive" className="font-black" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
