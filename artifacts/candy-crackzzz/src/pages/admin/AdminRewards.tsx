import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Award, CheckCircle2, Gift, Search, Users, Star, TrendingUp, ChevronDown, ChevronRight,
  Calendar, MessageSquare, Share2, RefreshCw, AlertTriangle, Settings2, X,
} from 'lucide-react';
import { calculateEstimatedPoints, ensureRewardProfileReferralCode, normalizePhone } from '@/lib/rewards';
import type { RewardProfile, RewardsEntryType, Settings } from '@/types';
import ReferralShareButton from '@/components/referrals/ReferralShareButton';

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {(title || icon) && (
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="font-black uppercase tracking-wider text-sm">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function entryTypeLabel(type: RewardsEntryType) {
  return type === 'earned' ? 'Earned' : type === 'redeemed' ? 'Redeemed' : type === 'adjusted' ? 'Adjusted' : 'Bonus';
}

function entryTypeBadge(type: RewardsEntryType) {
  const cls =
    type === 'earned' ? 'bg-emerald-500/20 text-emerald-400' :
    type === 'redeemed' ? 'bg-primary/20 text-primary' :
    type === 'adjusted' ? 'bg-amber-500/20 text-amber-400' :
    'bg-secondary/20 text-secondary';
  return <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>{entryTypeLabel(type)}</span>;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-muted text-muted-foreground',
  flagged: 'bg-red-500/20 text-red-400',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminRewards() {
  const { settings, setSettings, rewardProfiles, setRewardProfiles, orders } = useAppContext();
  const { toast } = useToast();

  // Settings form
  const [formData, setFormData] = useState<Settings>(settings);
  const set = (field: Partial<Settings>) => setFormData(prev => ({ ...prev, ...field }));

  // Profiles tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'flagged'>('all');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustNote, setAdjustNote] = useState('');

  const filteredProfiles = useMemo(() => {
    let list = rewardProfiles;
    if (statusFilter !== 'all') {
      list = list.filter(p => (p.status ?? 'active') === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.customerName.toLowerCase().includes(q) ||
        normalizePhone(p.phone).includes(q.replace(/\D/g, '')) ||
        (p.email || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.currentPoints - a.currentPoints);
  }, [rewardProfiles, statusFilter, searchQuery]);

  const expandedProfile = useMemo(() =>
    expandedProfileId ? rewardProfiles.find(p => p.id === expandedProfileId) ?? null : null,
    [rewardProfiles, expandedProfileId]
  );

  const rewardPreview = useMemo(() => calculateEstimatedPoints({
    settings: formData,
    orderTotal: 25,
    rewardsOptIn: true,
    matchedRewardProfile: expandedProfile ?? undefined,
  }), [formData, expandedProfile]);

  const totalPoints = rewardProfiles.reduce((sum, p) => sum + p.currentPoints, 0);
  const totalProfiles = rewardProfiles.length;
  const flaggedCount = rewardProfiles.filter(p => p.status === 'flagged').length;

  // Referral stats
  const referralStats = useMemo(() => {
    const topReferrers = [...rewardProfiles]
      .filter(p => (p.successfulReferralCount ?? 0) > 0)
      .sort((a, b) => (b.successfulReferralCount ?? 0) - (a.successfulReferralCount ?? 0))
      .slice(0, 10);
    const recentReferralOrders = [...orders]
      .filter(o => o.referralCodeUsed && o.referralCodeUsed.length > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15);
    const totalReferralPoints = rewardProfiles.reduce((sum, p) => sum + (p.lifetimeReferralPointsEarned ?? 0), 0);
    const totalSuccessfulReferrals = rewardProfiles.reduce((sum, p) => sum + (p.successfulReferralCount ?? 0), 0);
    const totalReferrers = rewardProfiles.filter(p => (p.successfulReferralCount ?? 0) > 0).length;
    return { topReferrers, recentReferralOrders, totalReferralPoints, totalSuccessfulReferrals, totalReferrers };
  }, [rewardProfiles, orders]);

  const handleUpdateProfile = (id: string, update: Partial<RewardProfile>) => {
    setRewardProfiles(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));
  };

  const handleAdjust = () => {
    if (!expandedProfile || !adjustPoints || !adjustNote.trim()) return;
    const now = new Date().toISOString();
    setRewardProfiles(prev => prev.map(p =>
      p.id !== expandedProfile.id ? p : {
        ...p,
        currentPoints: p.currentPoints + adjustPoints,
        lifetimePointsEarned: p.lifetimePointsEarned + Math.max(0, adjustPoints),
        lifetimePointsRedeemed: p.lifetimePointsRedeemed + Math.max(0, -adjustPoints),
        rewardsHistory: [{
          id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'adjusted' as RewardsEntryType,
          points: adjustPoints,
          note: adjustNote.trim(),
          createdAt: now,
        }, ...p.rewardsHistory],
      }
    ));
    setAdjustPoints(0);
    setAdjustNote('');
    toast({ title: 'Points updated', description: 'Manual adjustment saved.' });
  };

  const handleSaveSettings = () => {
    setSettings(formData);
    toast({ title: 'Settings saved', description: 'Rewards and referral settings have been updated.' });
  };

  const handleDeleteProfile = (id: string) => {
    setRewardProfiles(prev => prev.filter(p => p.id !== id));
    if (expandedProfileId === id) setExpandedProfileId(null);
    toast({ title: 'Profile deleted' });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-1">Rewardzzz</h1>
          <p className="text-muted-foreground font-bold">
            {totalProfiles} profiles · {totalPoints.toLocaleString()} pts outstanding
            {flaggedCount > 0 && <span className="ml-2 text-red-400">· {flaggedCount} flagged</span>}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-6">
          <TabsTrigger value="profiles" className="font-black uppercase tracking-wider px-4 py-2.5 flex items-center gap-2">
            <Users className="w-4 h-4" /> Profiles
          </TabsTrigger>
          <TabsTrigger value="referrals" className="font-black uppercase tracking-wider px-4 py-2.5 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Referral Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="font-black uppercase tracking-wider px-4 py-2.5 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── Profiles Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="profiles">
          <div className="space-y-4">
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email…"
                  className="pl-9 bg-background font-bold h-11"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'inactive', 'flagged'] as const).map(s => (
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

            <p className="text-sm text-muted-foreground font-medium">{filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} shown</p>

            {filteredProfiles.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-bold">No profiles found</p>
                <p className="text-sm">Profiles are created when customers opt in to rewards at checkout.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProfiles.map(profile => {
                  const isExpanded = expandedProfileId === profile.id;
                  const statusKey = profile.status ?? 'active';
                  const profileOrders = orders.filter(o => normalizePhone(o.phone) === normalizePhone(profile.phone));
                  return (
                    <div key={profile.id} className="border border-border rounded-2xl overflow-hidden">
                      {/* Row header */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedProfileId(isExpanded ? null : profile.id)}
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                          <div className="col-span-2 sm:col-span-1">
                            <div className="font-black truncate">{profile.customerName}</div>
                            <div className="text-xs text-muted-foreground">{profile.phone}</div>
                          </div>
                          <div className="hidden sm:block text-sm font-bold text-primary">{profile.currentPoints} pts</div>
                          <div className="hidden sm:block text-xs text-muted-foreground">{profile.totalOrders} orders · ${(profile.lifetimeSpend ?? 0).toFixed(0)} spent</div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[statusKey]}`}>{statusKey}</span>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && expandedProfile && (
                        <div className="border-t border-border bg-muted/10 p-4 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {/* Profile Info */}
                            <SectionCard title="Customer Info" icon={<Users className="w-4 h-4" />}>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Name</Label>
                                  <Input
                                    value={expandedProfile.customerName}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { customerName: e.target.value })}
                                    className="bg-background font-bold h-10 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Status</Label>
                                  <select
                                    value={expandedProfile.status ?? 'active'}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { status: e.target.value as RewardProfile['status'] })}
                                    className="w-full h-10 rounded-md border border-border bg-background px-2 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="flagged">Flagged</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Email</Label>
                                  <Input
                                    value={expandedProfile.email ?? ''}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { email: e.target.value })}
                                    className="bg-background font-bold h-10 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Phone</Label>
                                  <Input
                                    value={expandedProfile.phone}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { phone: e.target.value })}
                                    className="bg-background font-bold h-10 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Birthday Month</Label>
                                  <select
                                    value={expandedProfile.birthdayMonth ?? ''}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { birthdayMonth: e.target.value })}
                                    className="w-full h-10 rounded-md border border-border bg-background px-2 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">— not set —</option>
                                    {MONTH_NAMES.map((m, i) => (
                                      <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="font-bold text-xs">Birthday Day</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    placeholder="e.g. 14"
                                    value={expandedProfile.birthdayDay ?? ''}
                                    onChange={e => handleUpdateProfile(expandedProfile.id, { birthdayDay: e.target.value })}
                                    className="bg-background font-bold h-10 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="font-bold text-xs">Admin Notes (private)</Label>
                                <Textarea
                                  value={expandedProfile.adminNotes ?? ''}
                                  onChange={e => handleUpdateProfile(expandedProfile.id, { adminNotes: e.target.value })}
                                  placeholder="Internal notes — never shown to customer"
                                  className="bg-background font-medium text-sm min-h-[70px] resize-none"
                                />
                              </div>
                              <div className="flex gap-2 flex-wrap pt-1">
                                <div className="flex items-center gap-2 text-xs font-bold">
                                  <Switch
                                    checked={expandedProfile.emailOptIn ?? false}
                                    onCheckedChange={v => handleUpdateProfile(expandedProfile.id, { emailOptIn: v })}
                                  />
                                  Email opt-in
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                  <Switch
                                    checked={expandedProfile.smsMarketingOptIn ?? false}
                                    onCheckedChange={v => handleUpdateProfile(expandedProfile.id, { smsMarketingOptIn: v })}
                                  />
                                  SMS opt-in
                                </div>
                              </div>
                            </SectionCard>

                            {/* Points */}
                            <SectionCard title="Points" icon={<Award className="w-4 h-4" />}>
                              <div className="text-5xl font-black text-primary">{expandedProfile.currentPoints}</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-muted/30 rounded-xl p-2">
                                  <div className="text-muted-foreground font-bold">Lifetime Earned</div>
                                  <div className="font-black text-lg">{expandedProfile.lifetimePointsEarned}</div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2">
                                  <div className="text-muted-foreground font-bold">Redeemed</div>
                                  <div className="font-black text-lg">{expandedProfile.lifetimePointsRedeemed}</div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2">
                                  <div className="text-muted-foreground font-bold">Referral Pts</div>
                                  <div className="font-black text-lg">{expandedProfile.lifetimeReferralPointsEarned ?? 0}</div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2">
                                  <div className="text-muted-foreground font-bold">Referrals Made</div>
                                  <div className="font-black text-lg">{expandedProfile.successfulReferralCount ?? 0}</div>
                                </div>
                              </div>
                              <div className="border-t border-border pt-3 space-y-2">
                                <Label className="font-black text-xs uppercase tracking-wider">Manual Adjustment</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    value={adjustPoints}
                                    onChange={e => setAdjustPoints(parseInt(e.target.value || '0', 10))}
                                    placeholder="±pts"
                                    className="bg-background font-bold h-10"
                                  />
                                  <Button onClick={handleAdjust} size="sm" className="font-black uppercase tracking-wider h-10 shrink-0" disabled={!adjustPoints || !adjustNote.trim()}>Apply</Button>
                                </div>
                                <Input
                                  value={adjustNote}
                                  onChange={e => setAdjustNote(e.target.value)}
                                  placeholder="Required: reason for adjustment"
                                  className="bg-background font-medium h-10 text-sm"
                                />
                              </div>
                            </SectionCard>

                            {/* Referral code + orders summary */}
                            <SectionCard title="Referral & Orders" icon={<Share2 className="w-4 h-4" />}>
                              <div className="space-y-1">
                                <Label className="font-bold text-xs">Referral Code</Label>
                                <div className="flex items-center gap-2">
                                  <code className="bg-muted px-3 py-1.5 rounded-lg font-black text-primary text-sm flex-1">
                                    {ensureRewardProfileReferralCode(expandedProfile)}
                                  </code>
                                  <ReferralShareButton code={ensureRewardProfileReferralCode(expandedProfile)} size="sm" variant="outline" iconOnly label="Share" />
                                </div>
                              </div>
                              {expandedProfile.referredByCode && (
                                <div className="text-xs text-muted-foreground font-bold">
                                  Referred by: <span className="text-foreground">{expandedProfile.referredByCode}</span>
                                </div>
                              )}
                              {expandedProfile.referredByStaffCode && (
                                <div className="text-xs text-muted-foreground font-bold">
                                  Staff code used: <span className="text-secondary">{expandedProfile.referredByStaffCode}</span>
                                </div>
                              )}
                              <div className="border-t border-border pt-2 grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-muted-foreground font-bold">Orders: </span><span className="font-black">{expandedProfile.totalOrders}</span></div>
                                <div><span className="text-muted-foreground font-bold">Spent: </span><span className="font-black">${(expandedProfile.lifetimeSpend ?? 0).toFixed(2)}</span></div>
                                <div className="col-span-2"><span className="text-muted-foreground font-bold">Last order: </span><span className="font-black">{expandedProfile.lastOrderDate ? new Date(expandedProfile.lastOrderDate).toLocaleDateString() : '—'}</span></div>
                              </div>
                              <div className="border-t border-border pt-2 text-xs font-bold text-muted-foreground">
                                Orders: {profileOrders.length} matched
                              </div>
                              <button
                                onClick={() => handleDeleteProfile(expandedProfile.id)}
                                className="text-xs font-bold text-destructive hover:underline"
                              >
                                Delete profile
                              </button>
                            </SectionCard>
                          </div>

                          {/* History table */}
                          {expandedProfile.rewardsHistory.length > 0 && (
                            <div className="border border-border rounded-xl overflow-hidden">
                              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                                <p className="font-black text-xs uppercase tracking-wider">Points History</p>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Note</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {expandedProfile.rewardsHistory.slice(0, 20).map(entry => (
                                    <TableRow key={entry.id}>
                                      <TableCell className="text-xs">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                                      <TableCell>{entryTypeBadge(entry.type)}</TableCell>
                                      <TableCell className={`font-black ${entry.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {entry.points > 0 ? '+' : ''}{entry.points}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{entry.note || '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Referral Dashboard Tab ────────────────────────────────────────────── */}
        <TabsContent value="referrals">
          <div className="space-y-6 max-w-5xl">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Referrers', value: referralStats.totalReferrers },
                { label: 'Successful Referrals', value: referralStats.totalSuccessfulReferrals },
                { label: 'Referral Points Given', value: referralStats.totalReferralPoints.toLocaleString() },
                { label: 'Referral Orders', value: referralStats.recentReferralOrders.length },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-3xl font-black text-primary">{stat.value}</div>
                  <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Top Referrers */}
            <SectionCard title="Top Referrers" icon={<TrendingUp className="w-4 h-4" />}>
              {referralStats.topReferrers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">No successful referrals yet.</p>
                  <p className="text-xs">Referrals are counted when a referred friend's order is completed.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referralStats.topReferrers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black truncate">{p.customerName}</div>
                        <div className="text-xs text-muted-foreground">{p.phone}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-primary">{p.successfulReferralCount} referrals</div>
                        <div className="text-xs text-muted-foreground">{p.lifetimeReferralPointsEarned ?? 0} pts earned</div>
                      </div>
                      <div className="shrink-0">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-black text-primary">
                          {ensureRewardProfileReferralCode(p)}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Recent Referral Orders */}
            <SectionCard title="Recent Orders with Referral Codes" icon={<Calendar className="w-4 h-4" />}>
              {referralStats.recentReferralOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No referral code orders found yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Referral Code Used</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralStats.recentReferralOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-bold">{order.customerName}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-black text-primary">{order.referralCodeUsed}</code>
                          </TableCell>
                          <TableCell className="font-bold">${order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${
                              order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>{order.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            {/* Referral program description */}
            <SectionCard title="Program Description (shown to customers)" icon={<MessageSquare className="w-4 h-4" />}>
              <Textarea
                value={formData.referralProgramDescription}
                onChange={e => set({ referralProgramDescription: e.target.value })}
                className="bg-background font-medium min-h-[90px] resize-none"
              />
              <Button onClick={handleSaveSettings} size="sm" className="font-black uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Save Description
              </Button>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ─── Settings Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="settings">
          <div className="max-w-3xl space-y-6">
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} size="lg" className="font-black uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5 mr-2" /> Save All Settings
              </Button>
            </div>

            {/* Rewards enabled + earning */}
            <SectionCard title="Points Earning" icon={<Gift className="w-4 h-4" />}>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                <div>
                  <Label className="font-black text-primary uppercase tracking-wider">Enable Rewards Program</Label>
                  <p className="text-sm text-muted-foreground font-bold">Master switch for all customer rewards.</p>
                </div>
                <Switch checked={formData.enableRewards} onCheckedChange={v => set({ enableRewards: v })} className="scale-125 mr-2 shrink-0" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Points per Dollar Spent</Label>
                  <Input type="number" min={0} step={0.5} value={formData.rewardsPointsPerDollar} onChange={e => set({ rewardsPointsPerDollar: parseFloat(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Min. Points to Redeem</Label>
                  <Input type="number" min={0} value={formData.rewardsMinPointsToRedeem} onChange={e => set({ rewardsMinPointsToRedeem: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                  <p className="text-xs text-muted-foreground">Customers must have at least this many points to apply a reward.</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Max Points Per Order</Label>
                  <Input type="number" min={0} value={formData.rewardsMaxPointsPerOrder} onChange={e => set({ rewardsMaxPointsPerOrder: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                  <p className="text-xs text-muted-foreground">Set 0 for no cap on points earned in a single order.</p>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                    <div>
                      <Label className="font-bold">Award on Completed Order</Label>
                      <p className="text-xs text-muted-foreground">Points given when order is marked completed.</p>
                    </div>
                    <Switch checked={formData.rewardsAwardOnCompletedOrder} onCheckedChange={v => set({ rewardsAwardOnCompletedOrder: v })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'rewardsDoublePointsEnabled' as const, label: 'Double Points Mode', desc: 'Award 2x points on all orders.' },
                  { key: 'rewardsAllowPromoStacking' as const, label: 'Allow Promo Stacking', desc: 'Let rewards stack with active promos.' },
                  { key: 'rewardsAllowOnCandy' as const, label: 'Apply Rewards to Candy', desc: 'Allow redeeming points on candy orders.' },
                  { key: 'rewardsAllowOnMerch' as const, label: 'Apply Rewards to Merch', desc: 'Allow redeeming points on merch orders.' },
                ].map(t => (
                  <div key={t.key} className="flex items-center justify-between p-3 border border-border rounded-xl">
                    <div>
                      <Label className="font-bold text-sm">{t.label}</Label>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                    <Switch checked={formData[t.key] as boolean} onCheckedChange={v => set({ [t.key]: v })} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Bonus points */}
            <SectionCard title="Bonus Point Events" icon={<Star className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <Label className="font-bold">First-Order Bonus</Label>
                    <p className="text-xs text-muted-foreground">Extra points for a customer's very first order.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" min={0} value={formData.rewardsFirstOrderBonusPoints} onChange={e => set({ rewardsFirstOrderBonusPoints: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-9 w-24 text-center" />
                    <Switch checked={formData.rewardsFirstOrderBonusEnabled} onCheckedChange={v => set({ rewardsFirstOrderBonusEnabled: v })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <Label className="font-bold">Birthday Bonus</Label>
                    <p className="text-xs text-muted-foreground">Bonus points during birthday month.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" min={0} value={formData.rewardsBirthdayBonusPoints} onChange={e => set({ rewardsBirthdayBonusPoints: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-9 w-24 text-center" />
                    <Switch checked={formData.rewardsBirthdayBonusEnabled} onCheckedChange={v => set({ rewardsBirthdayBonusEnabled: v })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div>
                    <Label className="font-bold">Spend Threshold Bonus</Label>
                    <p className="text-xs text-muted-foreground">
                      Bonus when order total exceeds ${formData.rewardsSpendThresholdAmount}.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-muted-foreground">Min $</span>
                      <Input type="number" min={0} value={formData.rewardsSpendThresholdAmount} onChange={e => set({ rewardsSpendThresholdAmount: parseFloat(e.target.value) || 0 })} className="bg-background font-bold h-9 w-20 text-center" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-muted-foreground">Bonus pts</span>
                      <Input type="number" min={0} value={formData.rewardsSpendThresholdBonusPoints} onChange={e => set({ rewardsSpendThresholdBonusPoints: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-9 w-20 text-center" />
                    </div>
                    <Switch checked={formData.rewardsSpendThresholdEnabled} onCheckedChange={v => set({ rewardsSpendThresholdEnabled: v })} />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Redemption tiers */}
            <SectionCard title="Redemption Tiers" icon={<Award className="w-4 h-4" />}>
              <p className="text-sm text-muted-foreground font-medium -mt-2">Define the point thresholds and dollar discounts customers can redeem.</p>
              <div className="space-y-3">
                {[
                  { label: 'Tier 1', pts: 'rewardsTier1Points' as const, disc: 'rewardsTier1Discount' as const },
                  { label: 'Tier 2', pts: 'rewardsTier2Points' as const, disc: 'rewardsTier2Discount' as const },
                  { label: 'Tier 3', pts: 'rewardsTier3Points' as const, disc: 'rewardsTier3Discount' as const },
                ].map(tier => (
                  <div key={tier.label} className="grid grid-cols-3 gap-3 items-center p-3 border border-border rounded-xl">
                    <Label className="font-black uppercase tracking-wider text-xs">{tier.label}</Label>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-bold">Points needed</Label>
                      <Input type="number" min={0} value={formData[tier.pts]} onChange={e => set({ [tier.pts]: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-bold">$ Off</Label>
                      <Input type="number" min={0} step={0.5} value={formData[tier.disc]} onChange={e => set({ [tier.disc]: parseFloat(e.target.value) || 0 })} className="bg-background font-bold h-10" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                <Award className="w-5 h-5 text-primary shrink-0" />
                <div className="text-sm font-bold">
                  Preview: a $25 order earns <span className="text-primary font-black">{rewardPreview} pts</span> under current settings.
                </div>
              </div>
            </SectionCard>

            {/* Referral settings */}
            <SectionCard title="Customer Referrals" icon={<Share2 className="w-4 h-4" />}>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                <div>
                  <Label className="font-black text-primary uppercase tracking-wider">Enable Customer Referrals</Label>
                  <p className="text-sm text-muted-foreground font-bold">Let customers share their code and earn bonus points.</p>
                </div>
                <Switch checked={formData.enableReferrals} onCheckedChange={v => set({ enableReferrals: v })} className="scale-125 mr-2 shrink-0" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Referrer Bonus Points</Label>
                  <Input type="number" min={0} value={formData.referralReferrerBonusPoints} onChange={e => set({ referralReferrerBonusPoints: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                  <p className="text-xs text-muted-foreground">Points given to the person who shared their code.</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Referred Friend Bonus Points</Label>
                  <Input type="number" min={0} value={formData.referralReferredCustomerBonusPoints} onChange={e => set({ referralReferredCustomerBonusPoints: parseInt(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                  <p className="text-xs text-muted-foreground">Points given to the friend who used the code.</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Minimum Order Amount for Referral ($)</Label>
                  <Input type="number" min={0} step={0.5} value={formData.referralMinOrderAmount} onChange={e => set({ referralMinOrderAmount: parseFloat(e.target.value) || 0 })} className="bg-background font-bold h-11" />
                  <p className="text-xs text-muted-foreground">Set 0 to allow any order size to earn referral bonuses.</p>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                    <div>
                      <Label className="font-bold">Bonus on First Order Only</Label>
                      <p className="text-xs text-muted-foreground">Only award referral bonus on the first completed order.</p>
                    </div>
                    <Switch checked={formData.referralBonusOnFirstCompletedOrder} onCheckedChange={v => set({ referralBonusOnFirstCompletedOrder: v })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'referralAllowStacking' as const, label: 'Allow Stacking with Promos', desc: 'Let referral bonuses stack on top of active promotional discounts.' },
                ].map(t => (
                  <div key={t.key} className="flex items-center justify-between p-3 border border-border rounded-xl">
                    <div>
                      <Label className="font-bold text-sm">{t.label}</Label>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                    <Switch checked={formData[t.key] as boolean} onCheckedChange={v => set({ [t.key]: v })} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Staff referral codes toggle */}
            <SectionCard title="Staff & Promo Codes" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                <div>
                  <Label className="font-black text-primary uppercase tracking-wider">Enable Staff & Promo Code Entry</Label>
                  <p className="text-sm text-muted-foreground font-bold">Show a code input field on the checkout page for staff, event, or promo codes.</p>
                </div>
                <Switch checked={formData.enableStaffReferralCodes} onCheckedChange={v => set({ enableStaffReferralCodes: v })} className="scale-125 mr-2 shrink-0" />
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                <div>
                  <Label className="font-bold">Track Payout by Default</Label>
                  <p className="text-xs text-muted-foreground">New staff codes will have payout tracking enabled by default. Can be overridden per-code.</p>
                </div>
                <Switch checked={formData.staffReferralTrackPayout} onCheckedChange={v => set({ staffReferralTrackPayout: v })} />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Manage individual codes in{' '}
                <a href="/admin/staff-codes" className="text-primary font-black hover:underline">Staff Codes →</a>
              </p>
            </SectionCard>

            <div className="flex justify-end pb-8">
              <Button onClick={handleSaveSettings} size="lg" className="font-black uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5 mr-2" /> Save All Settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
