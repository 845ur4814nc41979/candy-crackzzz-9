import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, Tag, Pencil, Trash2, Copy, X, Check, TrendingUp,
  BarChart2, DollarSign, ShoppingCart, AlertCircle,
} from 'lucide-react';
import type { StaffReferralCode, StaffReferralCodeType, StaffReferralCodeStatus } from '@/types';

const CODE_TYPE_LABELS: Record<StaffReferralCodeType, string> = {
  'staff': 'Staff Member',
  'promoter': 'Promoter',
  'event': 'Event',
  'booth': 'Booth / Market',
  'influencer': 'Influencer',
  'flyer': 'Flyer / Print',
  'facebook-ad': 'Facebook Ad',
  'manual': 'Manual / Other',
};

const STATUS_STYLES: Record<StaffReferralCodeStatus, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-muted text-muted-foreground',
  paused: 'bg-amber-500/20 text-amber-400',
};

const TYPE_STYLES: Record<StaffReferralCodeType, string> = {
  'staff': 'bg-blue-500/20 text-blue-400',
  'promoter': 'bg-purple-500/20 text-purple-400',
  'event': 'bg-pink-500/20 text-pink-400',
  'booth': 'bg-orange-500/20 text-orange-400',
  'influencer': 'bg-violet-500/20 text-violet-400',
  'flyer': 'bg-teal-500/20 text-teal-400',
  'facebook-ad': 'bg-sky-500/20 text-sky-400',
  'manual': 'bg-muted text-muted-foreground',
};

const EMPTY_FORM = (): Partial<StaffReferralCode> => ({
  code: '',
  name: '',
  type: 'staff',
  status: 'active',
  notes: '',
  trackPayout: true,
});

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-_]/g, '');
}

export default function AdminStaffCodes() {
  const { staffReferralCodes, setStaffReferralCodes, orders, settings } = useAppContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffReferralCodeStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StaffReferralCode>>(EMPTY_FORM());
  const [formError, setFormError] = useState('');

  const set = (partial: Partial<StaffReferralCode>) => setFormData(prev => ({ ...prev, ...partial }));

  // Per-code order stats
  const codeStats = useMemo(() => {
    const map: Record<string, { orderCount: number; revenue: number; pendingPayout: number }> = {};
    for (const order of orders) {
      const raw = order.employeeReferralCodeUsed;
      if (!raw) continue;
      const key = raw.toUpperCase();
      if (!map[key]) map[key] = { orderCount: 0, revenue: 0, pendingPayout: 0 };
      map[key].orderCount++;
      map[key].revenue += order.total || 0;
      if (order.employeeReferralBonusStatus === 'pending' || order.employeeReferralBonusStatus === 'approved') {
        map[key].pendingPayout += order.employeeReferralBonusAmount || 0;
      }
    }
    return map;
  }, [orders]);

  const filteredCodes = useMemo(() => {
    let list = staffReferralCodes;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aOrders = codeStats[a.code.toUpperCase()]?.orderCount ?? 0;
      const bOrders = codeStats[b.code.toUpperCase()]?.orderCount ?? 0;
      return bOrders - aOrders;
    });
  }, [staffReferralCodes, statusFilter, searchQuery, codeStats]);

  // Summary stats
  const totalActive = staffReferralCodes.filter(c => c.status === 'active').length;
  const totalOrders = Object.values(codeStats).reduce((s, v) => s + v.orderCount, 0);
  const totalRevenue = Object.values(codeStats).reduce((s, v) => s + v.revenue, 0);
  const totalPendingPayout = Object.values(codeStats).reduce((s, v) => s + v.pendingPayout, 0);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM(), trackPayout: settings.staffReferralTrackPayout });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (code: StaffReferralCode) => {
    setEditingId(code.id);
    setFormData({ ...code });
    setFormError('');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM());
    setFormError('');
  };

  const handleSave = () => {
    const normalized = normalizeCode(formData.code || '');
    if (!normalized) {
      setFormError('Code is required.');
      return;
    }
    if (!formData.name?.trim()) {
      setFormError('Name is required.');
      return;
    }
    // Duplicate check
    const isDuplicate = staffReferralCodes.some(c =>
      c.code.toUpperCase() === normalized && c.id !== editingId
    );
    if (isDuplicate) {
      setFormError(`Code "${normalized}" already exists. Choose a different one.`);
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      setStaffReferralCodes(prev => prev.map(c =>
        c.id === editingId
          ? { ...c, ...formData, code: normalized, name: formData.name!.trim(), updatedAt: now }
          : c
      ));
      toast({ title: 'Code updated', description: `${normalized} has been updated.` });
    } else {
      const newCode: StaffReferralCode = {
        id: `SRC-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`,
        code: normalized,
        name: formData.name!.trim(),
        type: (formData.type as StaffReferralCodeType) || 'staff',
        status: (formData.status as StaffReferralCodeStatus) || 'active',
        notes: formData.notes?.trim() || undefined,
        trackPayout: formData.trackPayout ?? true,
        createdAt: now,
      };
      setStaffReferralCodes(prev => [newCode, ...prev]);
      toast({ title: 'Code created', description: `${normalized} is now active.` });
    }

    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM());
    setFormError('');
  };

  const handleDelete = (id: string, code: string) => {
    setStaffReferralCodes(prev => prev.filter(c => c.id !== id));
    if (editingId === id) handleCancel();
    toast({ title: 'Code deleted', description: `${code} has been removed.` });
  };

  const handleCopy = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: `${code} copied to clipboard.` });
  };

  const handleStatusToggle = (id: string, current: StaffReferralCodeStatus) => {
    const next: StaffReferralCodeStatus = current === 'active' ? 'paused' : 'active';
    setStaffReferralCodes(prev => prev.map(c => c.id === id ? { ...c, status: next, updatedAt: new Date().toISOString() } : c));
    toast({ title: `Code ${next === 'active' ? 'activated' : 'paused'}` });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1">Staff & Promo Codezzz</h1>
          <p className="text-muted-foreground font-bold">
            {staffReferralCodes.length} codes · {totalActive} active
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="font-black uppercase tracking-wider">
          <Plus className="w-5 h-5 mr-2" /> New Code
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <Tag className="w-5 h-5" />, label: 'Active Codes', value: totalActive },
          { icon: <ShoppingCart className="w-5 h-5" />, label: 'Total Orders', value: totalOrders },
          { icon: <DollarSign className="w-5 h-5" />, label: 'Revenue Tracked', value: `$${totalRevenue.toFixed(0)}` },
          { icon: <TrendingUp className="w-5 h-5" />, label: 'Pending Payout', value: `$${totalPendingPayout.toFixed(2)}` },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <span className="text-primary mt-0.5 shrink-0">{stat.icon}</span>
            <div>
              <div className="text-2xl font-black text-primary">{stat.value}</div>
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black uppercase tracking-wider text-lg">{editingId ? 'Edit Code' : 'Create New Code'}</h2>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Code <span className="text-destructive">*</span></Label>
              <Input
                value={formData.code || ''}
                onChange={e => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '') })}
                placeholder="e.g. STAFF-MARY"
                className="bg-background font-black h-11 uppercase tracking-widest"
              />
              <p className="text-xs text-muted-foreground">Letters, numbers, hyphens only. Auto-uppercased.</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Name / Campaign <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name || ''}
                onChange={e => set({ name: e.target.value })}
                placeholder="e.g. Mary Smith"
                className="bg-background font-bold h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Type</Label>
              <select
                value={formData.type || 'staff'}
                onChange={e => set({ type: e.target.value as StaffReferralCodeType })}
                className="w-full h-11 rounded-md border border-border bg-background px-3 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(CODE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Status</Label>
              <select
                value={formData.status || 'active'}
                onChange={e => set({ status: e.target.value as StaffReferralCodeStatus })}
                className="w-full h-11 rounded-md border border-border bg-background px-3 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Internal Notes (optional)</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={e => set({ notes: e.target.value })}
              placeholder="e.g. For Mary's Saturday market booth on Main St."
              className="bg-background font-medium min-h-[70px] resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-xl max-w-sm">
            <div>
              <Label className="font-bold">Track Payout</Label>
              <p className="text-xs text-muted-foreground">Flag orders for staff payout review in Orderzzz.</p>
            </div>
            <Switch checked={formData.trackPayout ?? true} onCheckedChange={v => set({ trackPayout: v })} />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="font-black uppercase tracking-wider">
              <Check className="w-4 h-4 mr-2" /> {editingId ? 'Update Code' : 'Create Code'}
            </Button>
            <Button variant="outline" onClick={handleCancel} className="font-black uppercase tracking-wider">Cancel</Button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search codes, names, or notes…"
            className="pl-9 bg-background font-bold h-11"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'paused', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-wider text-xs border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Code list */}
      {filteredCodes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold">
            {staffReferralCodes.length === 0 ? 'No codes yet.' : 'No codes match your filters.'}
          </p>
          {staffReferralCodes.length === 0 && (
            <p className="text-sm mt-1">Create a code for a staff member, event, or marketing campaign. Customers can enter it at checkout.</p>
          )}
          <Button onClick={openCreate} variant="outline" className="mt-4 font-black uppercase tracking-wider">
            <Plus className="w-4 h-4 mr-2" /> Create First Code
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCodes.map(code => {
            const stats = codeStats[code.code.toUpperCase()];
            return (
              <div key={code.id} className={`bg-card border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 ${code.status === 'active' ? 'border-border' : 'border-border/50 opacity-70'}`}>
                {/* Left: code details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="font-black text-primary text-lg tracking-widest bg-muted/40 px-3 py-1 rounded-lg">
                      {code.code}
                    </code>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${STATUS_STYLES[code.status]}`}>
                      {code.status}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_STYLES[code.type]}`}>
                      {CODE_TYPE_LABELS[code.type]}
                    </span>
                    {code.trackPayout && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">Payout tracked</span>
                    )}
                  </div>
                  <div className="font-bold text-sm">{code.name}</div>
                  {code.notes && <div className="text-xs text-muted-foreground italic">{code.notes}</div>}
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(code.createdAt).toLocaleDateString()}
                    {code.updatedAt && ` · Updated ${new Date(code.updatedAt).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Middle: stats */}
                {stats ? (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:border-l sm:border-border sm:pl-4 min-w-0 sm:w-48">
                    <div className="text-center">
                      <div className="text-xl font-black text-primary">{stats.orderCount}</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-primary">${stats.revenue.toFixed(0)}</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-amber-400">${stats.pendingPayout.toFixed(0)}</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase">Payout</div>
                    </div>
                  </div>
                ) : (
                  <div className="sm:border-l sm:border-border sm:pl-4 sm:w-48 flex items-center">
                    <span className="text-xs text-muted-foreground font-bold italic">No orders yet</span>
                  </div>
                )}

                {/* Right: actions */}
                <div className="flex sm:flex-col gap-2 sm:w-28 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(code)}
                    className="font-black uppercase tracking-wider flex-1 sm:flex-none"
                  >
                    <Pencil className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(code.code)}
                    className="font-black uppercase tracking-wider flex-1 sm:flex-none"
                  >
                    <Copy className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusToggle(code.id, code.status)}
                    className={`font-black uppercase tracking-wider flex-1 sm:flex-none text-xs ${code.status === 'active' ? 'text-amber-400 border-amber-400/40' : 'text-emerald-400 border-emerald-400/40'}`}
                  >
                    {code.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(code.id, code.code)}
                    className="font-black uppercase tracking-wider flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works info */}
      <div className="mt-8 p-4 bg-muted/20 border border-border rounded-2xl text-sm space-y-2">
        <p className="font-black uppercase tracking-wider text-xs text-muted-foreground">How Staff & Promo Codes Work</p>
        <ul className="space-y-1 text-muted-foreground font-medium list-disc list-inside">
          <li>Active codes appear as a "Staff / Event Code" input on the checkout page (when enabled in Rewardzzz → Settings).</li>
          <li>Customers enter the code at checkout; it's attached to their order as the staff referral code.</li>
          <li>Orders with payout-tracked codes appear in Orderzzz with a staff bonus badge for review and payment.</li>
          <li>Paused codes are no longer accepted at checkout but their stats are preserved.</li>
          <li>You can also share a URL with <code className="bg-muted px-1 rounded">?staffRef=YOURCODE</code> — customers who visit that link have the code auto-applied.</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
