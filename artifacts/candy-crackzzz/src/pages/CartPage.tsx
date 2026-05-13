import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Trash2, ArrowRight, Gift, Check } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { OrderRequest, CartItem } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateEstimatedPoints, ensureRewardProfileReferralCode, generateReferralCode, listRewardTiers, normalizePhone, normalizeReferralCode } from '@/lib/rewards';
import { apiNotifyOrder } from '@/lib/api';
import ReferralShareButton from '@/components/referrals/ReferralShareButton';
import { readStoredStaffReferralCode, captureStaffReferralFromCurrentUrl, calculateSignupBonus } from '@/lib/staffReferral';
import CustomerDemoLink from '@/components/demo/CustomerDemoLink';

function safeCartItem(item: CartItem, index: number): CartItem {
  const id = typeof item?.id === 'string' && item.id.trim() ? item.id : `cart-${index}`;
  const productId = typeof item?.productId === 'string' && item.productId.trim() ? item.productId : id;
  const name = typeof item?.name === 'string' && item.name.trim() ? item.name : 'Custom Item';
  const quantity = typeof item?.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const price = typeof item?.price === 'number' && Number.isFinite(item.price) ? item.price : null;
  return {
    ...item,
    id,
    productId,
    name,
    quantity,
    price,
    imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl : '',
    itemType: item?.itemType === 'merch' ? 'merch' : 'candy',
    specialInstructions: typeof item?.specialInstructions === 'string' ? item.specialInstructions : undefined,
    eventType: typeof item?.eventType === 'string' ? item.eventType : undefined,
    colorThemeNotes: typeof item?.colorThemeNotes === 'string' ? item.colorThemeNotes : undefined,
    selectedSize: typeof item?.selectedSize === 'string' ? item.selectedSize : undefined,
    selectedColor: typeof item?.selectedColor === 'string' ? item.selectedColor : undefined,
  };
}

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { cart, removeFromCart, cartTotal, settings, setOrders, rewardProfiles, setRewardProfiles, staffReferralCodes, setCart } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartResetShown, setCartResetShown] = useState(false);

  useEffect(() => { captureStaffReferralFromCurrentUrl(); }, []);

  // Self-heal: sanitize any corrupt/old cart items on mount and show a friendly message.
  useEffect(() => {
    const sanitized = cart.map(safeCartItem);
    const needsFix = sanitized.some(
      (item, i) =>
        item.id !== cart[i]?.id ||
        item.productId !== cart[i]?.productId ||
        item.name !== cart[i]?.name ||
        item.quantity !== cart[i]?.quantity ||
        item.price !== cart[i]?.price ||
        item.imageUrl !== cart[i]?.imageUrl ||
        item.itemType !== cart[i]?.itemType,
    );
    if (needsFix && !cartResetShown) {
      setCart(sanitized);
      setCartResetShown(true);
      toast({ title: 'Cart refreshed', description: 'Your cart was refreshed. Please add your items again.' });
    }
  }, [cart, setCart, toast, cartResetShown]);

  const availablePaymentMethods = useMemo(() => {
    const methods: { value: string; label: string; instructions?: string }[] = [];
    if (settings.enableManualInvoice) methods.push({ value: 'invoice', label: 'Send me an Invoice', instructions: settings.manualInvoiceInstructions });
    if (settings.enableCashAtPickup) methods.push({ value: 'cash', label: 'Cash at Pickup', instructions: settings.cashAtPickupInstructions });
    if (settings.enableStripe) methods.push({ value: 'stripe', label: 'Stripe', instructions: settings.stripeInstructions || settings.stripePaymentLink });
    if (settings.enablePayPal) methods.push({ value: 'paypal', label: settings.paypalContact ? `PayPal (${settings.paypalContact})` : 'PayPal', instructions: settings.paypalInstructions });
    if (settings.enableSquare) methods.push({ value: 'square', label: 'Square', instructions: settings.squareInstructions || settings.squarePaymentLink });
    if (settings.enableCashApp) methods.push({ value: 'cashapp', label: settings.cashAppTag ? `Cash App (${settings.cashAppTag})` : 'Cash App', instructions: settings.cashAppInstructions });
    if (settings.enableVenmo) methods.push({ value: 'venmo', label: settings.venmoUsername ? `Venmo (${settings.venmoUsername})` : 'Venmo', instructions: settings.venmoInstructions });
    if (settings.enableZelle) methods.push({ value: 'zelle', label: settings.zelleContact ? `Zelle (${settings.zelleContact})` : 'Zelle', instructions: settings.zelleInstructions });
    if (settings.enableQRCode) methods.push({ value: 'qr', label: 'QR Code Payment', instructions: settings.qrCodeInstructions });
    return methods.filter(method => method.value !== 'cash' || (settings.enableCashAtPickup && (settings.enablePickup || !settings.enableDelivery)));
  }, [settings]);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    requestedDate: '',
    requestedTime: '',
    pickupOrDelivery: settings.enableDelivery ? 'delivery' : 'pickup',
    deliveryAddress: '',
    eventType: '',
    specialInstructions: '',
    rewardsOptIn: settings.enableRewards,
    smsMarketingOptIn: false,
    referralCodeUsed: '',
    paymentMethod: settings.enableManualInvoice ? 'invoice' : settings.enableStripe ? 'stripe' : settings.enablePayPal ? 'paypal' : settings.enableSquare ? 'square' : settings.enableCashApp ? 'cashapp' : settings.enableVenmo ? 'venmo' : settings.enableZelle ? 'zelle' : settings.enableQRCode ? 'qr' : settings.enableCashAtPickup && !settings.enableDelivery ? 'cash' : '',
  });

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const [appliedRedemption, setAppliedRedemption] = useState<{ points: number; discount: number } | null>(null);
  const [staffCodeInput, setStaffCodeInput] = useState('');
  const [staffCodeError, setStaffCodeError] = useState('');

  const safeCart = cart.map(safeCartItem);

  const normalizedPhone = normalizePhone(formData.phone);
  const deliveryFee = formData.pickupOrDelivery === 'delivery' && settings.deliveryFeeEnabled ? settings.deliveryFeeAmount : 0;
  const grossTotal = cartTotal + deliveryFee;
  const rewardsDiscountApplied = appliedRedemption ? Math.min(appliedRedemption.discount, grossTotal) : 0;
  const finalTotal = Math.max(0, grossTotal - rewardsDiscountApplied);

  const matchedRewardProfile = useMemo(() => rewardProfiles.find(profile => normalizePhone(profile.phone) === normalizedPhone), [rewardProfiles, normalizedPhone]);
  const rewardTiers = useMemo(() => [{ points: settings.rewardsTier1Points, discount: settings.rewardsTier1Discount }, { points: settings.rewardsTier2Points, discount: settings.rewardsTier2Discount }, { points: settings.rewardsTier3Points, discount: settings.rewardsTier3Discount }].filter(tier => tier.points > 0 && tier.discount > 0).sort((a, b) => a.points - b.points), [settings]);
  const nextRewardTier = useMemo(() => rewardTiers.find(tier => (matchedRewardProfile?.currentPoints ?? 0) < tier.points), [rewardTiers, matchedRewardProfile]);
  const estimatedPointsFromOrder = useMemo(() => calculateEstimatedPoints({ settings, orderTotal: finalTotal, rewardsOptIn: !!formData.rewardsOptIn, matchedRewardProfile }), [settings, finalTotal, formData.rewardsOptIn, matchedRewardProfile]);
  const redemptionTiers = useMemo(() => listRewardTiers(settings), [settings]);
  const currentPointsBalance = matchedRewardProfile?.currentPoints ?? 0;
  const canShowRedemptionPanel = settings.enableRewards && !!formData.rewardsOptIn && !!matchedRewardProfile && redemptionTiers.length > 0 && grossTotal > 0;
  const appliedTierStillValid = useMemo(() => {
    if (!appliedRedemption) return true;
    if (!canShowRedemptionPanel) return false;
    return currentPointsBalance >= appliedRedemption.points && grossTotal >= appliedRedemption.discount;
  }, [appliedRedemption, canShowRedemptionPanel, currentPointsBalance, grossTotal]);

  if (appliedRedemption && !appliedTierStillValid) {
    queueMicrotask(() => setAppliedRedemption(null));
  }

  const myReferralCode = matchedRewardProfile ? ensureRewardProfileReferralCode(matchedRewardProfile) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (safeCart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    const submittedAt = new Date().toISOString();
    const redemptionAtSubmit = appliedRedemption && appliedTierStillValid ? appliedRedemption : null;
    const typedReferralCode = normalizeReferralCode(formData.referralCodeUsed);
    const referralCodeForOrder = typedReferralCode || normalizeReferralCode(matchedRewardProfile?.referredByCode || '');
    const storedStaffRefCode = readStoredStaffReferralCode();
    let resolvedStaffCode = matchedRewardProfile?.referredByStaffCode || storedStaffRefCode;
    const trimmedStaffCodeInput = staffCodeInput.trim().toUpperCase();
    if (trimmedStaffCodeInput) {
      const matchedCode = staffReferralCodes.find(c => c.status === 'active' && c.code.toUpperCase() === trimmedStaffCodeInput);
      if (matchedCode) {
        resolvedStaffCode = matchedCode.code;
        setStaffCodeError('');
      } else {
        setStaffCodeError('That code was not found or is no longer active. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
    }
    const staffRefCodeForOrder = resolvedStaffCode;

    const newOrder: OrderRequest = {
      id: `ORD-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`,
      ...formData,
      referralCodeUsed: referralCodeForOrder,
      pickupOrDelivery: formData.pickupOrDelivery as 'pickup' | 'delivery',
      items: safeCart.map(item => ({ productId: item.productId, name: item.name, quantity: item.quantity, price: item.price })),
      status: 'new',
      paymentStatus: 'pending',
      total: finalTotal,
      createdAt: submittedAt,
      notes: '',
      ...(staffRefCodeForOrder ? { employeeReferralCodeUsed: staffRefCodeForOrder } : {}),
      ...(redemptionAtSubmit ? { rewardsProfileId: matchedRewardProfile?.id, rewardsRedeemedPoints: redemptionAtSubmit.points, rewardsDiscountAmount: Math.min(redemptionAtSubmit.discount, grossTotal), rewardsRedemptionStatus: 'pending' as const, rewardsAppliedAt: submittedAt } : {}),
    };

    let notifyOk = true;
    let notifyMessage = '';
    try {
      const result = await apiNotifyOrder({
        businessName: settings.businessName,
        toEmail: settings.orderDestinationEmail || settings.businessEmail,
        toPhone: settings.orderNotificationPhone,
        order: newOrder as unknown as Record<string, unknown>,
      });
      notifyOk = !!result?.ok;
      notifyMessage = result?.message ?? '';
    } catch (error) {
      notifyOk = false;
      notifyMessage = error instanceof Error ? error.message : 'Order alerts could not be sent right now.';
    }

    try {
      setOrders(prev => [newOrder, ...prev]);
      if (normalizedPhone && (formData.rewardsOptIn || formData.smsMarketingOptIn)) {
        setRewardProfiles(prev => {
          const existingProfile = prev.find(profile => normalizePhone(profile.phone) === normalizedPhone);
          if (!existingProfile) {
            const signupBonus = storedStaffRefCode ? calculateSignupBonus({ staffCode: storedStaffRefCode, settings }) : null;
            const signupBonusFields = signupBonus ? { staffSignupBonusStatus: signupBonus.status, staffSignupBonusAmount: signupBonus.amount, staffSignupBonusNote: signupBonus.note, staffSignupBonusCalculatedAt: new Date().toISOString() } : {};
            return [{ id: `RWD-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`, customerName: formData.customerName, phone: formData.phone, email: formData.email || undefined, currentPoints: 0, lifetimePointsEarned: 0, lifetimePointsRedeemed: 0, totalOrders: 0, lastOrderDate: newOrder.createdAt, smsMarketingOptIn: formData.smsMarketingOptIn, referralCode: generateReferralCode(formData.customerName), referredByCode: normalizeReferralCode(formData.referralCodeUsed) || undefined, successfulReferralCount: 0, lifetimeReferralPointsEarned: 0, referredByStaffCode: storedStaffRefCode || undefined, ...signupBonusFields, rewardsHistory: [] }, ...prev];
          }
          return prev.map(profile => normalizePhone(profile.phone) === normalizedPhone
            ? { ...profile, customerName: formData.customerName || profile.customerName, phone: formData.phone || profile.phone, email: formData.email || profile.email, smsMarketingOptIn: formData.smsMarketingOptIn || profile.smsMarketingOptIn, referralCode: ensureRewardProfileReferralCode(profile), referredByCode: profile.referredByCode || (normalizeReferralCode(formData.referralCodeUsed) || undefined), referredByStaffCode: profile.referredByStaffCode || storedStaffRefCode || undefined, successfulReferralCount: profile.successfulReferralCount ?? 0, lifetimeReferralPointsEarned: profile.lifetimeReferralPointsEarned ?? 0, lastOrderDate: newOrder.createdAt }
            : { ...profile, referralCode: ensureRewardProfileReferralCode(profile), successfulReferralCount: profile.successfulReferralCount ?? 0, lifetimeReferralPointsEarned: profile.lifetimeReferralPointsEarned ?? 0 },
          );
        });
      }
      if (!notifyOk) {
        toast({ title: 'Order received', description: notifyMessage || "We saved your order. We'll see it in the admin inbox." });
      }
      setLocation('/order-success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not submit your order right now.';
      toast({ title: 'Order not submitted', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (safeCart.length === 0) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-32 text-center flex flex-col items-center">
          <div className="w-48 h-48 bg-card rounded-full flex items-center justify-center border-4 border-border border-dashed mb-8">
            <span className="text-6xl font-black text-muted-foreground/30">?</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight mb-4 text-foreground">Your bag is empty</h1>
          <p className="text-xl text-muted-foreground font-medium mb-10 max-w-md">Looks like you haven't picked your poison yet. Let's fix that.</p>
          <Link href="/menu" className="inline-block">
            <Button size="lg" className="text-lg font-black px-12 py-8 rounded-full shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.8)]">BROWSE MENU</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">CHECKOUT</h1>
          <CustomerDemoLink tour="checkout" label="How checkout works" variant="pill" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Cart items + order summary */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card rounded-3xl border border-border overflow-hidden">
              <div className="p-6 md:p-8">
                <h2 className="text-2xl font-black uppercase tracking-wider mb-6 pb-6 border-b border-border">Your Items</h2>
                <div className="space-y-6">
                  <AnimatePresence>
                    {safeCart.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                        className="flex gap-4 md:gap-6 bg-background p-4 rounded-2xl border border-border"
                      >
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/40">🍬</div>
                          )}
                        </div>
                        <div className="flex-grow flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h3 className="font-black text-lg md:text-xl uppercase leading-tight mb-1">{item.name}</h3>
                              <p className="text-sm font-bold text-muted-foreground mb-2">QTY: {item.quantity}</p>
                              {(item.specialInstructions || item.eventType || item.colorThemeNotes) && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                  {item.eventType && <p><span className="font-bold text-primary/70">Event:</span> {item.eventType}</p>}
                                  {item.colorThemeNotes && <p><span className="font-bold text-primary/70">Theme:</span> {item.colorThemeNotes}</p>}
                                  {item.specialInstructions && <p className="italic line-clamp-1">"{item.specialInstructions}"</p>}
                                </div>
                              )}
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          {item.price !== null && (
                            <div className="font-black text-xl text-primary text-right mt-2">${(item.price * item.quantity).toFixed(2)}</div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-background p-6 md:p-8 border-t border-border">
                <div className="space-y-3 font-bold text-lg">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
                  </div>
                  {formData.pickupOrDelivery === 'delivery' && settings.deliveryFeeEnabled && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee</span><span>${settings.deliveryFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {rewardsDiscountApplied > 0 && (
                    <div className="flex justify-between text-emerald-500" data-testid="text-cart-rewards-discount">
                      <span>Rewards Discount{appliedRedemption ? ` (${appliedRedemption.points} pts)` : ''}</span>
                      <span>−${rewardsDiscountApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-3xl font-black text-foreground pt-4 border-t border-border">
                    <span>Total</span><span className="text-primary">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Checkout form */}
          <div className="lg:col-span-5">
            {settings.enableOrdering ? (
              <form onSubmit={handleSubmit} className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-8 sticky top-24">
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase tracking-wider border-b border-border pb-2">Contact Info</h3>
                  <div className="space-y-4">
                    <div><Label className="font-bold">Full Name *</Label><Input required value={formData.customerName} onChange={e => handleInputChange('customerName', e.target.value)} className="bg-background" /></div>
                    <div><Label className="font-bold">Phone Number *</Label><Input required type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} className="bg-background" /></div>
                    <div><Label className="font-bold">Email Address</Label><Input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="bg-background" /></div>
                  </div>
                </div>

                {/* Rewards */}
                {settings.enableRewards && (
                  <div className="space-y-4 border border-border rounded-2xl p-4 bg-background/60">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider mb-1">Rewards</h3>
                      <p className="text-sm text-muted-foreground">Use your phone number to track points for future discounts.</p>
                    </div>
                    <label className="flex items-start gap-3 text-sm font-medium cursor-pointer">
                      <input type="checkbox" checked={formData.rewardsOptIn} onChange={e => setFormData(prev => ({ ...prev, rewardsOptIn: e.target.checked }))} className="mt-1 h-4 w-4" />
                      <span>Join rewards and track points with this phone number.</span>
                    </label>
                    <label className="flex items-start gap-3 text-sm font-medium cursor-pointer">
                      <input type="checkbox" checked={formData.smsMarketingOptIn} onChange={e => setFormData(prev => ({ ...prev, smsMarketingOptIn: e.target.checked }))} className="mt-1 h-4 w-4" />
                      <span>Text me later about upcoming promotions and rewards offers.</span>
                    </label>
                    <p className="text-xs text-muted-foreground leading-6">
                      See our <a href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</a> and <a href="/terms" className="text-primary font-bold hover:underline">Terms &amp; Conditions</a>.
                    </p>
                    {settings.enableReferrals && (
                      <div className="space-y-2">
                        <Label className="font-bold">Referral Code</Label>
                        <Input value={formData.referralCodeUsed} onChange={e => handleInputChange('referralCodeUsed', e.target.value)} placeholder="Optional friend referral code" className="bg-background" />
                        <p className="text-xs text-muted-foreground">{settings.referralProgramDescription}</p>
                      </div>
                    )}
                    {settings.enablePromoTexts && settings.promoTextsDescription && (
                      <p className="text-xs text-muted-foreground">{settings.promoTextsDescription}</p>
                    )}
                    {formData.phone && formData.rewardsOptIn && (
                      <div className="bg-muted/30 rounded-xl p-3 text-sm">
                        {matchedRewardProfile ? (
                          <>
                            <p className="font-bold">Rewards account found for this phone number.</p>
                            <p className="text-muted-foreground mt-1">This order could earn {estimatedPointsFromOrder} points after it is completed.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">No rewards account found yet.</p>
                            <p className="text-muted-foreground mt-1">A new rewards account will be created for this phone number after your order is submitted.</p>
                          </>
                        )}
                      </div>
                    )}
                    {matchedRewardProfile && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="bg-muted/30 rounded-xl p-3"><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Current Points</div><div className="font-black text-xl text-primary">{matchedRewardProfile.currentPoints}</div></div>
                        <div className="bg-muted/30 rounded-xl p-3"><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Next Reward</div><div className="font-bold">{nextRewardTier ? `${nextRewardTier.points} pts = $${nextRewardTier.discount} off` : 'Top tier reached'}</div></div>
                        <div className="bg-muted/30 rounded-xl p-3"><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">This Order Could Earn</div><div className="font-bold">{estimatedPointsFromOrder} pts</div></div>
                      </div>
                    )}
                    {myReferralCode && (
                      <div className="bg-muted/30 rounded-xl p-3 text-sm">
                        <p className="font-bold">Your referral code</p>
                        <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                          <p className="text-primary font-black tracking-wider">{myReferralCode}</p>
                          <ReferralShareButton code={myReferralCode} size="sm" variant="outline" label="Share" />
                        </div>
                      </div>
                    )}
                    {matchedRewardProfile && nextRewardTier && (
                      <p className="text-xs font-bold text-primary">{Math.max(0, nextRewardTier.points - matchedRewardProfile.currentPoints)} more points until your next reward.</p>
                    )}
                  </div>
                )}

                {/* Apply Rewards redemption */}
                {canShowRedemptionPanel && (
                  <div className="space-y-3 border border-border rounded-2xl p-4 bg-background/60" data-testid="section-apply-rewards">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      <h3 className="text-lg font-black uppercase tracking-wider">Apply Rewards</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You have <span className="font-black text-foreground">{currentPointsBalance} pts</span>. Pick a reward to apply to this order — points are reserved now and deducted when the order is completed.
                    </p>
                    <div className="space-y-2">
                      {redemptionTiers.map(tier => {
                        const enoughPoints = currentPointsBalance >= tier.points;
                        const fitsCart = grossTotal >= tier.discount;
                        const disabled = !enoughPoints || !fitsCart;
                        const isSelected = appliedRedemption?.points === tier.points && appliedRedemption?.discount === tier.discount;
                        const reason = !enoughPoints ? `Need ${tier.points - currentPointsBalance} more pts` : !fitsCart ? 'Cart total is too low for this reward' : '';
                        return (
                          <button
                            key={`${tier.points}-${tier.discount}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => setAppliedRedemption(isSelected ? null : tier)}
                            data-testid={`button-apply-reward-${tier.points}`}
                            className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${isSelected ? 'bg-primary/15 border-primary' : disabled ? 'bg-muted/40 border-border opacity-60 cursor-not-allowed' : 'bg-background border-border hover:border-primary'}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {isSelected ? <Check className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                              </span>
                              <div className="min-w-0">
                                <div className="font-black text-sm">${tier.discount.toFixed(2)} off — {tier.points} pts</div>
                                {reason ? <div className="text-xs text-muted-foreground">{reason}</div> : isSelected ? <div className="text-xs text-emerald-500 font-bold">Applied to this order</div> : <div className="text-xs text-muted-foreground">Tap to apply at checkout</div>}
                              </div>
                            </div>
                            <span className="font-black text-primary shrink-0">{isSelected ? 'APPLIED' : 'APPLY'}</span>
                          </button>
                        );
                      })}
                    </div>
                    {appliedRedemption && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-emerald-500">Saving ${rewardsDiscountApplied.toFixed(2)} with {appliedRedemption.points} pts.</span>
                        <Button type="button" size="sm" variant="ghost" className="font-bold uppercase" onClick={() => setAppliedRedemption(null)} data-testid="button-remove-applied-reward">Remove</Button>
                      </div>
                    )}
                    {!settings.rewardsAllowPromoStacking && (
                      <p className="text-xs text-muted-foreground">Rewards cannot be combined with promo codes.</p>
                    )}
                  </div>
                )}

                {/* Staff / Promo Code */}
                {settings.enableStaffReferralCodes && (
                  <div className="space-y-3 border border-border rounded-2xl p-4 bg-background/60">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider mb-0.5">Staff / Promo Code</h3>
                      <p className="text-xs text-muted-foreground font-medium">Got a code from an event, flyer, or one of our staff? Enter it here.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Input
                        value={staffCodeInput}
                        onChange={e => { setStaffCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '')); setStaffCodeError(''); }}
                        placeholder="e.g. STAFF-MARY or CCZ-SUMMER"
                        className={`bg-background font-bold uppercase tracking-widest h-11 ${staffCodeError ? 'border-destructive' : ''}`}
                      />
                      {staffCodeError && <p className="text-xs text-destructive font-bold">{staffCodeError}</p>}
                    </div>
                  </div>
                )}

                {/* Logistics */}
                <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase tracking-wider border-b border-border pb-2">Logistics</h3>
                  {(settings.enablePickup || settings.enableDelivery) && (
                    <div className="mb-6">
                      <Label className="font-bold block mb-3">Order Method</Label>
                      <RadioGroup value={formData.pickupOrDelivery} onValueChange={val => handleInputChange('pickupOrDelivery', val)} className="grid grid-cols-2 gap-4">
                        {settings.enablePickup && <div className="flex items-center space-x-2 bg-background p-4 rounded-xl border border-border [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/10 transition-colors"><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup" className="font-bold cursor-pointer">Pickup</Label></div>}
                        {settings.enableDelivery && <div className="flex items-center space-x-2 bg-background p-4 rounded-xl border border-border [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/10 transition-colors"><RadioGroupItem value="delivery" id="delivery" /><Label htmlFor="delivery" className="font-bold cursor-pointer">Delivery</Label></div>}
                      </RadioGroup>
                    </div>
                  )}
                  {formData.pickupOrDelivery === 'delivery' && (
                    <div><Label className="font-bold">Delivery Address *</Label><Textarea required value={formData.deliveryAddress} onChange={e => handleInputChange('deliveryAddress', e.target.value)} className="bg-background resize-none" /></div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="font-bold">Date Needed *</Label><Input required type="date" value={formData.requestedDate} onChange={e => handleInputChange('requestedDate', e.target.value)} className="bg-background" /></div>
                    <div><Label className="font-bold">Time *</Label><Input required type="time" value={formData.requestedTime} onChange={e => handleInputChange('requestedTime', e.target.value)} className="bg-background" /></div>
                  </div>
                  <div>
                    <Label className="font-bold">Event Type</Label>
                    <Input value={formData.eventType} onChange={e => handleInputChange('eventType', e.target.value)} placeholder="Birthday, wedding, etc." className="bg-background" />
                  </div>
                  <div>
                    <Label className="font-bold">Special Instructions</Label>
                    <Textarea value={formData.specialInstructions} onChange={e => handleInputChange('specialInstructions', e.target.value)} placeholder="Allergies, colors, flavors, notes…" className="bg-background resize-none" />
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-6 pt-4">
                  {!settings.enablePayments ? (
                    <div className="p-4 bg-muted rounded-xl text-center font-bold">We'll contact you to confirm your order and arrange payment.</div>
                  ) : (
                    <div className="space-y-3">
                      <Label className="font-bold">Payment Method</Label>
                      <RadioGroup value={formData.paymentMethod} onValueChange={val => handleInputChange('paymentMethod', val)} className="space-y-3">
                        {availablePaymentMethods.filter(method => method.value !== 'cash' || formData.pickupOrDelivery === 'pickup').map(method => (
                          <div key={method.value} className="bg-background p-3 rounded-lg border border-border">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value={method.value} id={method.value} />
                              <Label htmlFor={method.value} className="font-bold">{method.label}</Label>
                            </div>
                            {method.instructions && <p className="mt-2 ml-7 text-sm text-muted-foreground">{method.instructions}</p>}
                            {method.value === 'qr' && settings.qrCodeImageBase64 && (
                              <img src={settings.qrCodeImageBase64} alt="QR code" className="mt-3 ml-7 w-32 h-32 object-contain rounded-lg border border-border bg-white p-2" />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                      {settings.paymentInstructions && <p className="text-sm text-muted-foreground">{settings.paymentInstructions}</p>}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full h-16 text-xl font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.4)]"
                  >
                    {isSubmitting ? 'SUBMITTING...' : <><span>PLACE ORDER REQUEST</span> <ArrowRight className="ml-2" /></>}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-card rounded-3xl border border-border p-12 text-center sticky top-24">
                <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-black">!</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-wider mb-4">Ordering Disabled</h3>
                <p className="text-muted-foreground font-bold text-lg">We are not currently accepting new online orders. Please check back later or contact us directly.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
