import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Zap, Gift, Calendar, Star, Users, Trophy, Clock, RefreshCw } from 'lucide-react';
import type { CampaignType, RewardsCampaign, RewardType, CampaignSendMethod } from '@/types';
import AiGenerateButton from '@/components/admin/AiGenerateButton';
import { apiAiPromoMessage } from '@/lib/api';

const CAMPAIGN_TYPE_META: Record<CampaignType, { label: string; icon: typeof Zap; color: string; description: string }> = {
  birthday: { label: 'Birthday', icon: Calendar, color: 'bg-pink-500/20 text-pink-400 border-pink-500/40', description: 'Auto-sends a reward near a customer\'s birthday' },
  holiday: { label: 'Holiday', icon: Gift, color: 'bg-green-500/20 text-green-400 border-green-500/40', description: 'Schedule seasonal rewards for holidays and events' },
  manual: { label: 'Manual Blast', icon: Zap, color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', description: 'Send a one-time reward to a targeted group' },
  milestone: { label: 'Milestone', icon: Trophy, color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', description: 'Reward customers when they hit an order or spend milestone' },
  winback: { label: 'Win-Back', icon: RefreshCw, color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', description: 'Re-engage customers who haven\'t ordered recently' },
  multiplier: { label: 'Points Multiplier', icon: Star, color: 'bg-primary/20 text-primary border-primary/40', description: 'Temporarily boost points earned on orders' },
};

const REWARD_TYPE_OPTIONS: { value: RewardType; label: string }[] = [
  { value: 'bonus-points', label: 'Bonus Points' },
  { value: 'points-multiplier', label: 'Points Multiplier' },
  { value: 'dollar-off', label: 'Dollar Off ($)' },
  { value: 'percent-off', label: 'Percent Off (%)' },
  { value: 'free-item', label: 'Free Item' },
  { value: 'free-merch', label: 'Free Merch Item' },
];

const SEND_METHODS: { value: CampaignSendMethod; label: string }[] = [
  { value: 'in-app', label: 'In-App Wallet' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS Text' },
  { value: 'qr-code', label: 'QR Code' },
];

function emptyCampaign(): Omit<RewardsCampaign, 'id' | 'createdAt'> {
  return {
    name: '',
    type: 'manual',
    rewardType: 'bonus-points',
    rewardValue: 10,
    isActive: false,
    expirationDays: 30,
    usageLimit: 0,
    onePerCustomer: true,
    minimumOrderAmount: 0,
    appliesTo: 'all',
    targetGroups: [],
    messageTemplate: '',
    sendMethods: ['in-app'],
    showOnHomepage: false,
    showAtCheckout: false,
    showInWallet: true,
  };
}

function rewardLabel(type: RewardType, value: number): string {
  switch (type) {
    case 'bonus-points': return `+${value} pts`;
    case 'points-multiplier': return `${value}× pts`;
    case 'dollar-off': return `$${value} off`;
    case 'percent-off': return `${value}% off`;
    case 'free-item': return 'Free item';
    case 'free-merch': return 'Free merch';
    default: return `${value}`;
  }
}

export default function AdminCampaigns() {
  const { campaigns, setCampaigns } = useAppContext();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RewardsCampaign, 'id' | 'createdAt'>>(emptyCampaign());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'all'>('all');

  const set = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));

  const filtered = campaigns.filter(c => typeFilter === 'all' || c.type === typeFilter);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCampaign());
    setDialogOpen(true);
  };

  const openEdit = (c: RewardsCampaign) => {
    setEditingId(c.id);
    const { id: _id, createdAt: _ca, ...rest } = c;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (editingId) {
      setCampaigns(prev => prev.map(c => c.id === editingId ? { ...c, ...form } : c));
      toast({ title: 'Campaign Updated', description: form.name });
    } else {
      const nc: RewardsCampaign = { ...form, id: `camp-${Date.now()}`, createdAt: new Date().toISOString() };
      setCampaigns(prev => [...prev, nc]);
      toast({ title: 'Campaign Created', description: form.name });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
    toast({ title: 'Campaign Deleted' });
  };

  const toggleActive = (id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const toggleSendMethod = (method: CampaignSendMethod) => {
    const current = form.sendMethods;
    if (current.includes(method)) {
      set({ sendMethods: current.filter(m => m !== method) });
    } else {
      set({ sendMethods: [...current, method] });
    }
  };

  const typeMeta = CAMPAIGN_TYPE_META[form.type];
  const TypeIcon = typeMeta.icon;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1">Campaigns</h1>
          <p className="text-muted-foreground font-bold">
            {campaigns.filter(c => c.isActive).length} active · {campaigns.length} total campaigns
          </p>
        </div>
        <Button onClick={openCreate} className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          <Plus className="w-4 h-4 mr-2" /> Create Campaign
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', ...Object.keys(CAMPAIGN_TYPE_META)] as const).map(t => {
          const meta = t === 'all' ? null : CAMPAIGN_TYPE_META[t as CampaignType];
          const Icon = meta?.icon ?? Zap;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t as CampaignType | 'all')}
              className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {t !== 'all' && <Icon className="w-3.5 h-3.5" />}
              {t === 'all' ? 'All' : CAMPAIGN_TYPE_META[t as CampaignType].label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-bold">No campaigns yet.</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-5">Create birthday rewards, seasonal blasts, win-back offers, and more.</p>
          <Button variant="outline" onClick={openCreate} className="font-bold uppercase tracking-wider">
            <Plus className="w-4 h-4 mr-2" /> Create First Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => {
            const meta = CAMPAIGN_TYPE_META[campaign.type];
            const CIcon = meta.icon;
            return (
              <div key={campaign.id} className={`bg-card border border-border rounded-2xl p-5 flex items-start gap-4 transition-all ${!campaign.isActive ? 'opacity-60' : ''}`}>
                <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                  <CIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg">{campaign.name}</h3>
                        <Badge className={`text-[10px] font-black uppercase tracking-wider border ${meta.color}`}>
                          {meta.label}
                        </Badge>
                        {campaign.isActive && (
                          <Badge className="text-[10px] font-black uppercase tracking-wider border bg-green-500/20 text-green-400 border-green-500/40">
                            Live
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          {rewardLabel(campaign.rewardType, campaign.rewardValue)}
                        </span>
                        {campaign.expirationDays > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Expires in {campaign.expirationDays}d
                          </span>
                        )}
                        {campaign.appliesTo !== 'all' && (
                          <span className="capitalize">{campaign.appliesTo} only</span>
                        )}
                      </div>
                      {campaign.messageTemplate && (
                        <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-1 max-w-lg italic">"{campaign.messageTemplate}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <span className="text-xs uppercase tracking-wide">{campaign.isActive ? 'Active' : 'Draft'}</span>
                        <Switch checked={campaign.isActive} onCheckedChange={() => toggleActive(campaign.id)} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(campaign)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(campaign.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {campaign.sendMethods.map(m => (
                      <span key={m} className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">
                        {SEND_METHODS.find(s => s.value === m)?.label ?? m}
                      </span>
                    ))}
                    {campaign.showInWallet && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">Wallet</span>}
                    {campaign.showAtCheckout && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">Checkout</span>}
                    {campaign.showOnHomepage && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground">Homepage</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-2xl flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${typeMeta.color}`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              {editingId ? 'Edit Campaign' : 'New Campaign'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label className="font-bold">Campaign Name *</Label>
              <Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Birthday Crack Drop, Summer Bonus..." className="h-11 bg-background" />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Campaign Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(CAMPAIGN_TYPE_META) as CampaignType[]).map(type => {
                  const m = CAMPAIGN_TYPE_META[type];
                  const Icon = m.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set({ type })}
                      className={`text-left p-3 rounded-xl border transition-all ${form.type === type ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black uppercase tracking-wider">{m.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{m.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Reward Type</Label>
                <Select value={form.rewardType} onValueChange={v => set({ rewardType: v as RewardType })}>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Reward Value</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.rewardValue}
                  onChange={e => set({ rewardValue: parseFloat(e.target.value) || 0 })}
                  placeholder={form.rewardType === 'bonus-points' ? '25' : form.rewardType === 'percent-off' ? '10' : '5'}
                  className="h-11 bg-background"
                />
              </div>
            </div>

            {form.type === 'birthday' && (
              <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-4 space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-pink-400">Birthday Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Send X days before</Label>
                    <Input type="number" min="0" value={form.birthdayWindowDaysBefore ?? 7} onChange={e => set({ birthdayWindowDaysBefore: parseInt(e.target.value) || 0 })} className="h-9 bg-background text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Valid X days after</Label>
                    <Input type="number" min="0" value={form.birthdayWindowDaysAfter ?? 7} onChange={e => set({ birthdayWindowDaysAfter: parseInt(e.target.value) || 0 })} className="h-9 bg-background text-sm" />
                  </div>
                </div>
              </div>
            )}

            {form.type === 'holiday' && (
              <div className="space-y-2">
                <Label className="font-bold">Holiday / Event Name</Label>
                <Input value={form.holidayName ?? ''} onChange={e => set({ holidayName: e.target.value })} placeholder="e.g. Valentine's Day, Christmas..." className="h-11 bg-background" />
              </div>
            )}

            {form.type === 'milestone' && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-amber-400">Milestone Trigger</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">After X orders</Label>
                    <Input type="number" min="0" value={form.milestoneOrders ?? 1} onChange={e => set({ milestoneOrders: parseInt(e.target.value) || 0 })} className="h-9 bg-background text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Or lifetime spend ($)</Label>
                    <Input type="number" min="0" value={form.milestoneSpend ?? 0} onChange={e => set({ milestoneSpend: parseFloat(e.target.value) || 0 })} className="h-9 bg-background text-sm" />
                  </div>
                </div>
              </div>
            )}

            {form.type === 'winback' && (
              <div className="space-y-2">
                <Label className="font-bold">Days Since Last Order</Label>
                <Input type="number" min="1" value={form.winbackDays ?? 60} onChange={e => set({ winbackDays: parseInt(e.target.value) || 60 })} className="h-11 bg-background" />
                <p className="text-xs text-muted-foreground">Send to customers who haven't ordered in this many days.</p>
              </div>
            )}

            {form.type === 'multiplier' && (
              <div className="space-y-2">
                <Label className="font-bold">Points Multiplier</Label>
                <Input type="number" min="1" step="0.5" value={form.multiplierValue ?? 2} onChange={e => set({ multiplierValue: parseFloat(e.target.value) || 2 })} className="h-11 bg-background" />
                <p className="text-xs text-muted-foreground">E.g. 2 = double points, 3 = triple points during this period.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Start Date</Label>
                <Input type="date" value={form.startDate ?? ''} onChange={e => set({ startDate: e.target.value })} className="h-11 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">End Date</Label>
                <Input type="date" value={form.endDate ?? ''} onChange={e => set({ endDate: e.target.value })} className="h-11 bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Reward Expires After (days)</Label>
                <Input type="number" min="0" value={form.expirationDays} onChange={e => set({ expirationDays: parseInt(e.target.value) || 0 })} className="h-11 bg-background" />
                <p className="text-xs text-muted-foreground">0 = never expires</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Min Order Amount ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={e => set({ minimumOrderAmount: parseFloat(e.target.value) || 0 })} className="h-11 bg-background" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Applies To</Label>
              <Select value={form.appliesTo} onValueChange={v => set({ appliesTo: v as 'all' | 'candy' | 'merch' })}>
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchases</SelectItem>
                  <SelectItem value="candy">Candy Orders Only</SelectItem>
                  <SelectItem value="merch">Merch Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="font-bold">Delivery Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                {SEND_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleSendMethod(m.value)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      form.sendMethods.includes(m.value) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="font-bold">Message Template</Label>
                <AiGenerateButton
                  generate={async () => {
                    const sendMethod = form.sendMethods[0] ?? 'in-app';
                    const res = await apiAiPromoMessage({
                      campaignType: form.type,
                      audience: 'customers',
                      offer: form.name || `${form.rewardType} reward`,
                      channel: sendMethod,
                    });
                    if (!res.ok) throw new Error(res.message ?? 'AI error');
                    return res.message ?? '';
                  }}
                  onApply={text => set({ messageTemplate: text })}
                  label="AI Message Idea"
                  draftLabel="AI draft message — review and edit before saving"
                  showCopy
                  testId="ai-campaign-message"
                />
              </div>
              <Textarea
                value={form.messageTemplate}
                onChange={e => set({ messageTemplate: e.target.value })}
                placeholder="Happy Birthday! Enjoy {reward} from Candy Crackzzz. Valid for {days} days."
                className="bg-background min-h-[70px] resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">Use {'{reward}'} for reward, {'{days}'} for expiration days. AI-generated text is a starting point — always review before sending.</p>
            </div>

            <div className="bg-muted/20 rounded-xl border border-border p-4 space-y-3">
              <h4 className="font-black text-sm uppercase tracking-wider">Display & Rules</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showInWallet' as const, label: 'Show in Rewards Wallet' },
                  { key: 'showAtCheckout' as const, label: 'Show at Checkout' },
                  { key: 'showOnHomepage' as const, label: 'Show on Homepage' },
                  { key: 'onePerCustomer' as const, label: 'One per customer' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg border border-border">
                    <Label className="font-bold text-sm">{label}</Label>
                    <Switch checked={form[key] as boolean} onCheckedChange={v => set({ [key]: v })} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div>
                <Label className="font-black text-primary uppercase tracking-wider">Activate Campaign</Label>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Turn on to make it live immediately</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => set({ isActive: v })} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleSave} className="font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.3)]">
              {editingId ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Delete Campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground font-medium py-2">This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="font-bold">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="font-black">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
