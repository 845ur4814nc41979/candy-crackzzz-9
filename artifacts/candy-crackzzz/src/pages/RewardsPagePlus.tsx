import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Gift,
  LogOut,
  Search,
  Trophy,
  Users,
  Copy,
  Clock3,
  Sparkles,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateEstimatedPoints,
  ensureRewardProfileReferralCode,
  generateReferralCode,
  normalizePhone,
  normalizeReferralCode,
} from '@/lib/rewards';
import { readStoredStaffReferralCode, calculateSignupBonus } from '@/lib/staffReferral';
import ReferralShareButton from '@/components/referrals/ReferralShareButton';
import CustomerDemoLink from '@/components/demo/CustomerDemoLink';
import type { RewardProfile } from '@/types';

const STORAGE_KEY = 'cc_rewards_lookup_phone';

type Tab = 'check' | 'join';

const MONTH_OPTIONS = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
];

export default function RewardsPagePlus() {
  const { rewardProfiles, setRewardProfiles, orders, settings } = useAppContext();
  const { toast } = useToast();

  // ---------- Tab + ?ref handling ----------
  const initialFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return { tab: 'check' as Tab, ref: '' };
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeReferralCode(params.get('ref') || '');
    return { tab: ref ? ('join' as Tab) : ('check' as Tab), ref };
  }, []);

  const [tab, setTab] = useState<Tab>(initialFromUrl.tab);

  // ---------- Check tab state ----------
  const [phone, setPhone] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');
  const [checkError, setCheckError] = useState('');

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY) || '';
    if (savedPhone) {
      setPhone(savedPhone);
      setSubmittedPhone(savedPhone);
    }
  }, []);

  const normalizedSubmittedPhone = normalizePhone(submittedPhone);

  const matchedProfile = useMemo(() => {
    if (!normalizedSubmittedPhone) return null;
    return rewardProfiles.find(profile => normalizePhone(profile.phone) === normalizedSubmittedPhone) ?? null;
  }, [rewardProfiles, normalizedSubmittedPhone]);

  const customerOrders = useMemo(() => {
    if (!normalizedSubmittedPhone) return [];
    return orders
      .filter(order => normalizePhone(order.phone) === normalizedSubmittedPhone)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, normalizedSubmittedPhone]);

  const pendingOrders = useMemo(
    () => customerOrders.filter(order => !!order.rewardsOptIn && !['completed', 'cancelled'].includes(order.status)),
    [customerOrders],
  );

  const pendingPointsEstimate = useMemo(
    () => pendingOrders.reduce((sum, order) => sum + calculateEstimatedPoints({
      settings,
      orderTotal: order.total,
      rewardsOptIn: !!order.rewardsOptIn,
      matchedRewardProfile: matchedProfile,
    }), 0),
    [pendingOrders, settings, matchedProfile],
  );

  const rewardTiers = useMemo(
    () => [
      { points: settings.rewardsTier1Points, discount: settings.rewardsTier1Discount },
      { points: settings.rewardsTier2Points, discount: settings.rewardsTier2Discount },
      { points: settings.rewardsTier3Points, discount: settings.rewardsTier3Discount },
    ].filter(tier => tier.points > 0 && tier.discount > 0).sort((a, b) => a.points - b.points),
    [settings],
  );

  const nextTier = useMemo(
    () => rewardTiers.find(tier => (matchedProfile?.currentPoints ?? 0) < tier.points),
    [rewardTiers, matchedProfile],
  );

  const referralActivity = useMemo(
    () => (matchedProfile?.rewardsHistory ?? [])
      .filter(entry => entry.type === 'bonus' || /referral/i.test(entry.note || ''))
      .slice(0, 6),
    [matchedProfile],
  );

  // ---------- Check tab handlers ----------
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckError('');
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setCheckError('Enter the phone number you use for rewards.');
      return;
    }

    setSubmittedPhone(phone);
    localStorage.setItem(STORAGE_KEY, phone);

    const exists = rewardProfiles.some(profile => normalizePhone(profile.phone) === normalized);
    if (!exists) {
      setCheckError('No rewards account was found for that phone number yet.');
      // Pre-fill the join phone so the customer can switch tabs and finish.
      setJoinForm(prev => ({ ...prev, phone }));
    }
  };

  const handleSignOut = () => {
    setSubmittedPhone('');
    setPhone('');
    setCheckError('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const currentReferralCode = matchedProfile ? ensureRewardProfileReferralCode(matchedProfile) : '';
  const shareText = currentReferralCode ? `Use my Candy Crackzzz referral code: ${currentReferralCode}` : '';

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, description: 'Ready to paste or share.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Try copying it manually.', variant: 'destructive' });
    }
  };

  // ---------- Join tab state ----------
  const [joinForm, setJoinForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    birthdayMonth: '',
    birthdayDay: '',
    referredByCode: initialFromUrl.ref,
    smsOptIn: true,
    emailOptIn: false,
  });
  const [joinError, setJoinError] = useState('');
  const [joinedProfile, setJoinedProfile] = useState<RewardProfile | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinBusy) return;
    setJoinError('');

    const name = joinForm.customerName.trim();
    const phoneRaw = joinForm.phone.trim();
    const normalized = normalizePhone(phoneRaw);
    const email = joinForm.email.trim();
    const month = joinForm.birthdayMonth.trim();
    const day = joinForm.birthdayDay.trim();
    const referralCode = normalizeReferralCode(joinForm.referredByCode);

    if (!name) {
      setJoinError('Please tell us your name.');
      return;
    }
    if (!normalized) {
      setJoinError('Please enter a valid phone number — that is how we track your points.');
      return;
    }
    if (month && (!day || Number(day) < 1 || Number(day) > 31)) {
      setJoinError('Please pick a valid birthday day (1–31).');
      return;
    }
    if (day && !month) {
      setJoinError('Please pick a birthday month too.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setJoinError('That email address does not look right.');
      return;
    }

    const existing = rewardProfiles.find(profile => normalizePhone(profile.phone) === normalized) ?? null;

    setJoinBusy(true);
    try {
      let saved: RewardProfile;
      if (existing) {
        // Don't create duplicates — merge new info onto the existing profile.
        saved = {
          ...existing,
          customerName: name || existing.customerName,
          email: email || existing.email,
          birthdayMonth: month || existing.birthdayMonth,
          birthdayDay: day || existing.birthdayDay,
          smsOptIn: joinForm.smsOptIn,
          emailOptIn: joinForm.emailOptIn,
          smsMarketingOptIn: joinForm.smsOptIn || existing.smsMarketingOptIn,
          referralCode: ensureRewardProfileReferralCode(existing),
          referredByCode: existing.referredByCode || (referralCode || undefined),
          successfulReferralCount: existing.successfulReferralCount ?? 0,
          lifetimeReferralPointsEarned: existing.lifetimeReferralPointsEarned ?? 0,
        };
        setRewardProfiles(prev =>
          prev.map(profile => (normalizePhone(profile.phone) === normalized ? saved : profile)),
        );
        toast({
          title: 'Welcome back!',
          description: 'We updated your rewards profile with the latest info.',
        });
      } else {
        const id = `RWD-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`;
        const staffRefCode = readStoredStaffReferralCode();
        const signupBonus = staffRefCode
          ? calculateSignupBonus({ staffCode: staffRefCode, settings })
          : null;
        const signupBonusFields = signupBonus
          ? {
              staffSignupBonusStatus: signupBonus.status,
              staffSignupBonusAmount: signupBonus.amount,
              staffSignupBonusNote: signupBonus.note,
              staffSignupBonusCalculatedAt: new Date().toISOString(),
            }
          : {};
        saved = {
          id,
          customerName: name,
          phone: phoneRaw,
          email: email || undefined,
          birthdayMonth: month || undefined,
          birthdayDay: day || undefined,
          currentPoints: 0,
          lifetimePointsEarned: 0,
          lifetimePointsRedeemed: 0,
          totalOrders: 0,
          smsMarketingOptIn: joinForm.smsOptIn,
          smsOptIn: joinForm.smsOptIn,
          emailOptIn: joinForm.emailOptIn,
          referralCode: generateReferralCode(name),
          referredByCode: referralCode || undefined,
          successfulReferralCount: 0,
          lifetimeReferralPointsEarned: 0,
          referredByStaffCode: staffRefCode || undefined,
          ...signupBonusFields,
          rewardsHistory: [],
        };
        setRewardProfiles(prev => [saved, ...prev]);
        toast({
          title: 'Welcome to Rewards!',
          description: 'Your rewards account is ready. Start ordering to earn points.',
        });
      }

      setJoinedProfile(saved);
      // Sign the new account in on the Check tab so they immediately see it.
      setPhone(phoneRaw);
      setSubmittedPhone(phoneRaw);
      localStorage.setItem(STORAGE_KEY, phoneRaw);
      setCheckError('');
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Could not save your rewards account.');
    } finally {
      setJoinBusy(false);
    }
  };

  // ---------- UI ----------
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Gift className="w-8 h-8 text-primary" />
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Rewards
              </h1>
            </div>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">
              Track points and rewards on every order, or join the rewards program in seconds — your phone number is your account.
            </p>
            <div className="flex justify-center pt-1">
              <CustomerDemoLink tour="rewards" label="How rewards work" variant="pill" />
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-xl mx-auto bg-card border border-border rounded-full p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setTab('check')}
              className={`px-4 py-3 rounded-full text-sm font-black uppercase tracking-wider transition-colors ${
                tab === 'check'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-rewards-check"
            >
              <Search className="w-4 h-4 inline mr-2" /> Check My Rewards
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`px-4 py-3 rounded-full text-sm font-black uppercase tracking-wider transition-colors ${
                tab === 'join'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-rewards-join"
            >
              <UserPlus className="w-4 h-4 inline mr-2" /> Join Rewards
            </button>
          </div>

          {/* Check tab */}
          {tab === 'check' && (
            <>
              <div className="max-w-xl mx-auto bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg">
                <form onSubmit={handleLookup} className="space-y-4">
                  <div>
                    <Label className="font-bold">Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      type="tel"
                      placeholder="Enter your rewards phone number"
                      className="bg-background mt-2 h-12 font-bold"
                      data-testid="input-rewards-lookup-phone"
                    />
                  </div>
                  {checkError && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold px-4 py-3 rounded-lg space-y-3">
                      <div>{checkError}</div>
                      {!matchedProfile && submittedPhone && (
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setJoinForm(prev => ({ ...prev, phone }));
                            setTab('join');
                          }}
                          className="font-black uppercase tracking-wider"
                          data-testid="button-switch-to-join"
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Join Now
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="font-black uppercase tracking-wider" data-testid="button-lookup-rewards">
                      <Search className="w-4 h-4 mr-2" /> Look Up Rewards
                    </Button>
                    {submittedPhone && (
                      <Button type="button" variant="outline" onClick={handleSignOut} className="font-black uppercase tracking-wider">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              {matchedProfile && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <div className="bg-card border border-border rounded-2xl p-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Current Points</div><div className="text-3xl font-black text-primary">{matchedProfile.currentPoints}</div></div>
                    <div className="bg-card border border-border rounded-2xl p-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Pending Points</div><div className="text-3xl font-black">{pendingPointsEstimate}</div></div>
                    <div className="bg-card border border-border rounded-2xl p-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Lifetime Earned</div><div className="text-3xl font-black">{matchedProfile.lifetimePointsEarned}</div></div>
                    <div className="bg-card border border-border rounded-2xl p-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Successful Referrals</div><div className="text-3xl font-black text-secondary">{matchedProfile.successfulReferralCount ?? 0}</div></div>
                    <div className="bg-card border border-border rounded-2xl p-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Referral Points</div><div className="text-3xl font-black">{matchedProfile.lifetimeReferralPointsEarned ?? 0}</div></div>
                  </div>

                  {pendingOrders.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2"><Clock3 className="w-4 h-4 text-primary" /><div className="font-black uppercase tracking-wider text-sm">Pending Rewards</div></div>
                      <p className="text-sm text-muted-foreground">You have {pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''} still in progress. Estimated pending rewards: <span className="font-black text-foreground">{pendingPointsEstimate} points</span>.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /><h2 className="text-2xl font-black uppercase tracking-wider">Rewards Snapshot</h2></div>
                      <div className="space-y-3 text-sm">
                        <div><span className="font-black">Name:</span> {matchedProfile.customerName}</div>
                        <div><span className="font-black">Phone:</span> {matchedProfile.phone}</div>
                        {matchedProfile.email && <div><span className="font-black">Email:</span> {matchedProfile.email}</div>}
                        <div className="flex items-center gap-2 flex-wrap"><span className="font-black">Referral Code:</span> <span className="text-primary font-black tracking-wider">{currentReferralCode}</span><ReferralShareButton code={currentReferralCode} size="sm" variant="ghost" iconOnly label="Share referral code" /></div>
                        {matchedProfile.referredByCode && <div><span className="font-black">Referred By:</span> {matchedProfile.referredByCode}</div>}
                        <div><span className="font-black">Total Completed Orders:</span> {matchedProfile.totalOrders}</div>
                        {matchedProfile.lastOrderDate && <div><span className="font-black">Last Order:</span> {new Date(matchedProfile.lastOrderDate).toLocaleString()}</div>}
                      </div>
                      {nextTier ? (
                        <div className="bg-background border border-border rounded-2xl p-4 text-sm">
                          <p className="font-bold">{Math.max(0, nextTier.points - matchedProfile.currentPoints)} more points until your next reward.</p>
                          <p className="text-muted-foreground mt-1">Next reward: {nextTier.points} points = ${nextTier.discount} off.</p>
                        </div>
                      ) : (
                        <div className="bg-background border border-border rounded-2xl p-4 text-sm font-bold">You have reached the top listed reward tier.</div>
                      )}
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-2"><Users className="w-5 h-5 text-secondary" /><h2 className="text-2xl font-black uppercase tracking-wider">Referral Program</h2></div>
                      <p className="text-sm text-muted-foreground">Share your referral code with friends. When their first eligible order is completed, bonus points can be awarded to both of you.</p>
                      <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Share This Code</div>
                          <div className="text-2xl font-black tracking-[0.15em] text-primary">{currentReferralCode}</div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <ReferralShareButton code={currentReferralCode} variant="default" className="font-black uppercase tracking-wider" label="Share" />
                          <Button type="button" variant="outline" onClick={() => void handleCopy(currentReferralCode, 'Referral code')} className="font-black uppercase tracking-wider"><Copy className="w-4 h-4 mr-2" /> Copy Code</Button>
                          <Button type="button" variant="outline" onClick={() => void handleCopy(shareText, 'Share text')} className="font-black uppercase tracking-wider"><Copy className="w-4 h-4 mr-2" /> Copy Share Text</Button>
                        </div>
                        <div className="text-sm text-muted-foreground border border-border rounded-xl p-3 bg-card/50">{shareText}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-background border border-border rounded-2xl p-4"><div className="font-black">Friend bonus</div><div className="text-muted-foreground mt-1">{settings.referralReferredCustomerBonusPoints} bonus points on their first eligible completed order.</div></div>
                        <div className="bg-background border border-border rounded-2xl p-4"><div className="font-black">Your bonus</div><div className="text-muted-foreground mt-1">{settings.referralReferrerBonusPoints} bonus points when their first eligible order completes.</div></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                      <h2 className="text-2xl font-black uppercase tracking-wider">Recent Referral Activity</h2>
                      {referralActivity.length === 0 ? (
                        <div className="text-sm font-bold text-muted-foreground">No referral activity yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {referralActivity.map(entry => (
                            <div key={entry.id} className="bg-background border border-border rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-black uppercase text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-secondary" /> Bonus</div>
                                  <div className="text-xs text-muted-foreground mt-1">{new Date(entry.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="text-xl font-black text-primary">{entry.points} pts</div>
                              </div>
                              {entry.note && <div className="text-sm text-muted-foreground mt-2">{entry.note}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                      <h2 className="text-2xl font-black uppercase tracking-wider">Recent Orders</h2>
                      {customerOrders.length === 0 ? (
                        <div className="text-sm font-bold text-muted-foreground">No orders found for this rewards account yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {customerOrders.slice(0, 8).map(order => (
                            <div key={order.id} className="bg-background border border-border rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-black">{new Date(order.createdAt).toLocaleDateString()}</div>
                                  <div className="text-xs text-muted-foreground mt-1 uppercase">{order.status}</div>
                                </div>
                                <div className="text-lg font-black text-primary">${order.total.toFixed(2)}</div>
                              </div>
                              {order.referralCodeUsed && <div className="text-sm text-secondary font-bold mt-2">Referral code used: {order.referralCodeUsed}</div>}
                              {typeof order.rewardsPointsAwarded === 'number' && order.rewardsAwardedAt && <div className="text-sm text-muted-foreground mt-1">Rewards awarded: {order.rewardsPointsAwarded} pts</div>}
                              {order.rewardsRedemptionStatus === 'applied' && order.rewardsRedeemedPoints && (
                                <div className="text-sm text-muted-foreground mt-1">Redeemed: {order.rewardsRedeemedPoints} pts (${(order.rewardsDiscountAmount ?? 0).toFixed(2)} off)</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Join tab */}
          {tab === 'join' && (
            <div className="max-w-2xl mx-auto bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg space-y-6">
              {joinedProfile ? (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">You're In!</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Welcome to Candy Crackzzz Rewards, <span className="font-black text-foreground">{joinedProfile.customerName}</span>.
                    Your referral code is below — share it to earn bonus points.
                  </p>
                  <div className="bg-background border border-border rounded-2xl p-4 inline-block">
                    <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Your Referral Code</div>
                    <div className="text-2xl font-black tracking-[0.15em] text-primary">
                      {ensureRewardProfileReferralCode(joinedProfile)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <ReferralShareButton
                      code={ensureRewardProfileReferralCode(joinedProfile)}
                      variant="default"
                      className="font-black uppercase tracking-wider"
                      label="Share Code"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTab('check')}
                      className="font-black uppercase tracking-wider"
                      data-testid="button-go-to-check"
                    >
                      <Search className="w-4 h-4 mr-2" /> View My Rewards
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-5" data-testid="form-join-rewards">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">Join Rewards</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Earn points on every order. Your phone number is your rewards login.
                    </p>
                  </div>

                  {initialFromUrl.ref && (
                    <div className="bg-secondary/15 border border-secondary/40 rounded-xl p-3 text-sm font-bold">
                      Joining with referral code <span className="text-primary">{initialFromUrl.ref}</span>. Welcome!
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold">Full Name *</Label>
                      <Input
                        required
                        value={joinForm.customerName}
                        onChange={e => setJoinForm(prev => ({ ...prev, customerName: e.target.value }))}
                        className="bg-background mt-2 h-12 font-bold"
                        data-testid="input-join-name"
                      />
                    </div>
                    <div>
                      <Label className="font-bold">Phone Number *</Label>
                      <Input
                        required
                        type="tel"
                        value={joinForm.phone}
                        onChange={e => setJoinForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-background mt-2 h-12 font-bold"
                        data-testid="input-join-phone"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold">Email (optional)</Label>
                    <Input
                      type="email"
                      value={joinForm.email}
                      onChange={e => setJoinForm(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-background mt-2 h-12 font-bold"
                      data-testid="input-join-email"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-bold">Birthday Month (optional)</Label>
                      <select
                        value={joinForm.birthdayMonth}
                        onChange={e => setJoinForm(prev => ({ ...prev, birthdayMonth: e.target.value }))}
                        className="bg-background mt-2 h-12 w-full rounded-md border border-input px-3 font-bold"
                        data-testid="select-join-birthday-month"
                      >
                        <option value="">—</option>
                        {MONTH_OPTIONS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="font-bold">Birthday Day (optional)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={joinForm.birthdayDay}
                        onChange={e => setJoinForm(prev => ({ ...prev, birthdayDay: e.target.value }))}
                        className="bg-background mt-2 h-12 font-bold"
                        data-testid="input-join-birthday-day"
                      />
                    </div>
                    <div>
                      <Label className="font-bold">Referral Code (optional)</Label>
                      <Input
                        value={joinForm.referredByCode}
                        onChange={e => setJoinForm(prev => ({ ...prev, referredByCode: e.target.value }))}
                        className="bg-background mt-2 h-12 font-bold"
                        placeholder="Friend's code"
                        data-testid="input-join-referral"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={joinForm.smsOptIn}
                        onChange={e => setJoinForm(prev => ({ ...prev, smsOptIn: e.target.checked }))}
                        data-testid="checkbox-join-sms"
                      />
                      <span>Text me about rewards updates and promo offers (you can opt out anytime).</span>
                    </label>
                    <label className="flex items-start gap-3 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={joinForm.emailOptIn}
                        onChange={e => setJoinForm(prev => ({ ...prev, emailOptIn: e.target.checked }))}
                        data-testid="checkbox-join-email"
                      />
                      <span>Email me occasional rewards news (only if I provided an email).</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      See our <a href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</a> and <a href="/terms" className="text-primary font-bold hover:underline">Terms &amp; Conditions</a>.
                    </p>
                  </div>

                  {joinError && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold px-4 py-3 rounded-lg">
                      {joinError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={joinBusy}
                    className="w-full h-14 text-lg font-black uppercase tracking-wider"
                    data-testid="button-submit-join"
                  >
                    {joinBusy ? 'Saving…' : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" /> Create My Rewards Account
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
