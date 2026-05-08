import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { MerchItem, OrderRequest, Product, RewardsCampaign, Review, RewardProfile, Settings, CartItem, InventoryItem, InventoryTransaction, StaffReferralCode } from '../types';
import { defaultSettings, sampleMerchItems, sampleProducts, sampleCampaigns } from '../lib/defaults';
import { apiGetBootstrap, apiPersistState } from '../lib/api';
import { useAuth } from './AuthContext';
import { FullScreenLoader, FallbackBanner } from '../components/layout/AppStatusOverlays';

interface AppContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: OrderRequest[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRequest[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  rewardProfiles: RewardProfile[];
  setRewardProfiles: React.Dispatch<React.SetStateAction<RewardProfile[]>>;
  merch: MerchItem[];
  setMerch: React.Dispatch<React.SetStateAction<MerchItem[]>>;
  campaigns: RewardsCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<RewardsCampaign[]>>;
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  inventoryTransactions: InventoryTransaction[];
  setInventoryTransactions: React.Dispatch<React.SetStateAction<InventoryTransaction[]>>;
  staffReferralCodes: StaffReferralCode[];
  setStaffReferralCodes: React.Dispatch<React.SetStateAction<StaffReferralCode[]>>;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: number;
  usingFallbackDefaults: boolean;
  retryBootstrap: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded: isAuthLoaded, isOwner } = useAuth();
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rewardProfiles, setRewardProfiles] = useState<RewardProfile[]>([]);
  const [merch, setMerch] = useState<MerchItem[]>(sampleMerchItems);
  const [campaigns, setCampaigns] = useState<RewardsCampaign[]>(sampleCampaigns);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [staffReferralCodes, setStaffReferralCodes] = useState<StaffReferralCode[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [usingFallbackDefaults, setUsingFallbackDefaults] = useState(false);
  const [bootstrapTick, setBootstrapTick] = useState(0);

  const retryBootstrap = useCallback(() => {
    setIsLoaded(false);
    setBootstrapTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const loadedCart = localStorage.getItem('cart');
    if (loadedCart) {
      try {
        setCart(JSON.parse(loadedCart));
      } catch {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBootstrap = async () => {
      try {
        const bootstrap = await apiGetBootstrap();
        if (!isMounted) return;
        setProducts(bootstrap.state.products?.length ? bootstrap.state.products : sampleProducts);
        setOrders(bootstrap.state.orders ?? []);
        setSettings({ ...defaultSettings, ...(bootstrap.state.settings ?? {}) });
        setReviews(bootstrap.state.reviews ?? []);
        setRewardProfiles(bootstrap.state.rewardProfiles ?? []);
        setMerch(bootstrap.state.merch?.length ? bootstrap.state.merch : sampleMerchItems);
        setCampaigns(bootstrap.state.campaigns?.length ? bootstrap.state.campaigns : sampleCampaigns);
        setInventoryItems(bootstrap.state.inventory ?? []);
        setInventoryTransactions(bootstrap.state.inventoryTransactions ?? []);
        setStaffReferralCodes((bootstrap.state.staffReferralCodes as StaffReferralCode[]) ?? []);
        setUsingFallbackDefaults(false);
      } catch (error) {
        console.error('Failed to load backend app state.', error);
        if (!isMounted) return;
        setProducts(sampleProducts);
        setOrders([]);
        setSettings(defaultSettings);
        setReviews([]);
        setRewardProfiles([]);
        setMerch(sampleMerchItems);
        setCampaigns(sampleCampaigns);
        setInventoryItems([]);
        setInventoryTransactions([]);
        setStaffReferralCodes([]);
        setUsingFallbackDefaults(true);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    void loadBootstrap();

    return () => {
      isMounted = false;
    };
  }, [bootstrapTick]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('products', products).catch((error) => console.error('Failed to persist products.', error));
  }, [products, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded) return;
    void apiPersistState('orders', orders).catch((error) => console.error('Failed to persist orders.', error));
  }, [orders, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('settings', settings).catch((error) => console.error('Failed to persist settings.', error));
  }, [settings, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('reviews', reviews).catch((error) => console.error('Failed to persist reviews.', error));
  }, [reviews, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded) return;
    void apiPersistState('rewardProfiles', rewardProfiles).catch((error) => console.error('Failed to persist reward profiles.', error));
  }, [rewardProfiles, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('merch', merch).catch((error) => console.error('Failed to persist merch.', error));
  }, [merch, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('campaigns', campaigns).catch((error) => console.error('Failed to persist campaigns.', error));
  }, [campaigns, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('inventory', inventoryItems).catch((error) => console.error('Failed to persist inventory.', error));
  }, [inventoryItems, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('inventoryTransactions', inventoryTransactions).catch((error) => console.error('Failed to persist inventory transactions.', error));
  }, [inventoryTransactions, isLoaded, isAuthLoaded, isOwner]);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOwner) return;
    void apiPersistState('staffReferralCodes', staffReferralCodes).catch((error) => console.error('Failed to persist staff referral codes.', error));
  }, [staffReferralCodes, isLoaded, isAuthLoaded, isOwner]);

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    setCart(prev => [...prev, { ...item, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0),
    [cart],
  );

  if (!isLoaded) return <FullScreenLoader />;

  return (
    <AppContext.Provider value={{
      products, setProducts,
      orders, setOrders,
      settings, setSettings,
      cart, setCart,
      reviews, setReviews,
      rewardProfiles, setRewardProfiles,
      merch, setMerch,
      campaigns, setCampaigns,
      inventoryItems, setInventoryItems,
      inventoryTransactions, setInventoryTransactions,
      staffReferralCodes, setStaffReferralCodes,
      addToCart, removeFromCart, clearCart, cartTotal,
      usingFallbackDefaults, retryBootstrap,
    }}>
      {children}
      {usingFallbackDefaults && <FallbackBanner onRetry={retryBootstrap} />}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
