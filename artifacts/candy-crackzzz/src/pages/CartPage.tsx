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
  };
}

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { cart, removeFromCart, cartTotal, settings, setOrders, rewardProfiles, setRewardProfiles, staffReferralCodes, setCart } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartResetNoticeShown, setCartResetNoticeShown] = useState(false);

  useEffect(() => {
    captureStaffReferralFromCurrentUrl();
  }, []);

  useEffect(() => {
    const sanitized = cart.map(safeCartItem);
    const changed = sanitized.length !== cart.length || sanitized.some((item, index) => item.id !== cart[index]?.id || item.productId !== cart[index]?.productId || item.name !== cart[index]?.name || item.quantity !== cart[index]?.quantity || item.price !== cart[index]?.price || item.imageUrl !== cart[index]?.imageUrl || item.itemType !== cart[index]?.itemType);
    if (changed) {
      setCart(sanitized);
      if (!cartResetNoticeShown) {
        setCartResetNoticeShown(true);
        toast({ title: 'Cart reset', description: 'Your cart was reset because old cart data was no longer compatible.' });
      }
    }
  }, [cart, setCart, toast, cartResetNoticeShown]);

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
    paymentMethod: settings.enableManualInvoice ? 'invoice' : settings.enableStripe ? 'stripe' : settings.enablePayPal ? 'paypal' : settings.enableSquare ? 'square' : settings.enableCashApp ? 'cashapp' : settings.enableVenmo ? 'venmo' : settings.enableZelle ? 'zelle' : settings.enableQRCode ? 'qr' : settings.enableCashAtPickup && !settings.enableDelivery ? 'cash' : ''
  });

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const [appliedRedemption, setAppliedRedemption] = useState<{ points: number; discount: number } | null>(null);
  const [staffCodeInput, setStaffCodeInput] = useState('');
  const [staffCodeError, setStaffCodeError] = useState('');

  const normalizedPhone = normalizePhone(formData.phone);
  const deliveryFee = formData.pickupOrDelivery === 'delivery' && settings.deliveryFeeEnabled ? settings.deliveryFeeAmount : 0;
  const grossTotal = cartTotal + deliveryFee;
  const rewardsDiscountApplied = appliedRedemption ? Math.min(appliedRedemption.discount, grossTotal) : 0;
  const finalTotal = Math.max(0, grossTotal - rewardsDiscountApplied);
  const safeCart = cart.map(safeCartItem);
  const safeCartLength = safeCart.length;

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
  const isEmpty = safeCartLength === 0;

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

    try {
      await apiNotifyOrder({
        businessName: settings.businessName,
        toEmail: settings.orderDestinationEmail || settings.businessEmail,
        toPhone: settings.orderNotificationPhone,
        order: newOrder as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.error('Order notification failed.', error);
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
          return prev.map(profile => normalizePhone(profile.phone) === normalizedPhone ? { ...profile, customerName: formData.customerName || profile.customerName, phone: formData.phone || profile.phone, email: formData.email || profile.email, smsMarketingOptIn: formData.smsMarketingOptIn || profile.smsMarketingOptIn, referralCode: ensureRewardProfileReferralCode(profile), referredByCode: profile.referredByCode || (normalizeReferralCode(formData.referralCodeUsed) || undefined), referredByStaffCode: profile.referredByStaffCode || storedStaffRefCode || undefined, successfulReferralCount: profile.successfulReferralCount ?? 0, lifetimeReferralPointsEarned: profile.lifetimeReferralPointsEarned ?? 0, lastOrderDate: newOrder.createdAt } : { ...profile });
        });
      }
      setLocation('/order-success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isEmpty ? (
          <div className="text-center py-24">
            <div className="text-2xl font-black uppercase tracking-wider mb-3">Your bag is empty</div>
            <Link href="/menu" className="text-primary font-bold underline">Browse the menu</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              {safeCart.map((item, index) => (
                <div key={item.id || index} className="flex items-center gap-4 border rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{item.name || 'Custom Item'}</div>
                    <div className="text-xs text-muted-foreground">{item.quantity || 1} × {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : 'Price TBD'}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
