import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, ShoppingCart, Settings, Palette, CreditCard, Store, Menu, Star, ShieldCheck, LogOut, AlertTriangle, Mail, Gift, Shirt, Zap, Users, Truck, BarChart2, Boxes, Tag } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { Permission, roleLabels, userHasAnyPermission } from '@/lib/permissions';
import NotificationBell from '@/components/admin/NotificationBell';
import NotificationSoundUnlockBanner from '@/components/admin/NotificationSoundUnlockBanner';
import AdminDemoLauncher from '@/components/demo/AdminDemoLauncher';

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: number;
  /** If empty/undefined, anyone signed in can see this link. */
  permissions?: Permission[];
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout, currentUser } = useAuth();
  const { reviews } = useAppContext();

  const pendingReviews = reviews.filter(r => r.status === 'pending').length;

  const isDriverOnly = currentUser?.role === 'delivery_driver';

  const navItems: NavItem[] = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/products', icon: Package, label: 'Productzzz', permissions: ['manageProducts', 'viewProducts'] },
    { href: '/admin/merch', icon: Shirt, label: 'Merch', permissions: ['manageMerch', 'viewMerch'] },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Orderzzz', permissions: ['manageOrders', 'viewOrders'] },
    { href: '/admin/deliveries', icon: Truck, label: 'Deliveryzzz', permissions: ['manageOrders', 'viewOrders'] },
    { href: '/admin/messages', icon: Mail, label: 'Messagezzz', permissions: ['manageMessages', 'viewMessages'] },
    { href: '/admin/reviews', icon: Star, label: 'Reviewzzz', badge: pendingReviews > 0 ? pendingReviews : undefined, permissions: ['manageSiteSettings'] },
    { href: '/admin/rewards', icon: Gift, label: 'Rewardzzz', permissions: ['manageRewards', 'viewRewards'] },
    { href: '/admin/staff-referralzzz', icon: Users, label: 'Staff Referralzzz', permissions: ['manageRewards', 'manageAdmins'] },
    { href: '/admin/staff-codes', icon: Tag, label: 'Staff Codezzz', permissions: ['manageRewards', 'manageAdmins'] },
    { href: '/admin/campaigns', icon: Zap, label: 'Campaignzzz', permissions: ['manageCampaigns', 'viewCampaigns'] },
    { href: '/admin/inventory', icon: Boxes, label: 'Inventoryzz', permissions: ['manageProducts', 'viewProducts'] },
    { href: '/admin/analytics', icon: BarChart2, label: 'Analyticzz', permissions: ['viewAnalytics', 'manageAnalytics'] },
    { href: '/admin/settings', icon: Settings, label: 'Settingzzz', permissions: ['manageSiteSettings', 'manageSystemSettings'] },
    { href: '/admin/branding', icon: Palette, label: 'Branding', permissions: ['manageBranding'] },
    { href: '/admin/payments', icon: CreditCard, label: 'Paymentzzz', permissions: ['managePayments'] },
    { href: '/admin/team', icon: Users, label: 'Team', permissions: ['manageAdmins'] },
    { href: '/admin/account', icon: ShieldCheck, label: 'Account' },
  ];

  // Delivery drivers should only see the deliveries area + their account.
  const driverOnlyHrefs = new Set(['/admin', '/admin/deliveries', '/admin/account']);

  const visibleNavItems = navItems.filter((item) => {
    if (isDriverOnly && !driverOnlyHrefs.has(item.href)) return false;
    if (!item.permissions || item.permissions.length === 0) return true;
    return userHasAnyPermission(currentUser, item.permissions);
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-full">
      <div className="p-6 border-b border-sidebar-border space-y-2">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-sm">
            C
          </div>
          <span className="font-black text-xl uppercase tracking-wider">Admin</span>
        </Link>
        {currentUser && (
          <div className="px-1 text-xs font-black uppercase tracking-wider text-sidebar-foreground/50">
            {roleLabels[currentUser.role] ?? currentUser.role} · {currentUser.username}
          </div>
        )}
      </div>

      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-black uppercase tracking-wider text-sidebar-foreground/40 mb-3 px-3">Management</div>
        {visibleNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-colors relative ${
              location === item.href
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sidebar-foreground/70 hover:bg-sidebar-border transition-colors">
          <Store className="w-5 h-5" />
          View Store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground font-sans">
      <aside className="hidden lg:flex w-60 flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="font-black text-xl uppercase tracking-wider text-sidebar-foreground">Admin Panel</span>
        <div className="ml-auto flex items-center gap-1">
          <AdminDemoLauncher auto={false} trigger="icon" />
          <NotificationBell />
          <Link href="/" className="text-xs font-bold text-sidebar-foreground/60 hover:text-sidebar-foreground uppercase tracking-wider">Store</Link>
        </div>
      </div>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="hidden lg:flex justify-end items-center gap-2 px-8 pt-6">
          <AdminDemoLauncher auto trigger="icon" />
          <NotificationBell />
        </div>
        <div className="p-4 lg:p-8 pt-20 lg:pt-2 space-y-4">
          <NotificationSoundUnlockBanner />
          {currentUser?.mustChangePassword && location !== '/admin/account' && (
            <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-black uppercase tracking-wider text-sm">Temporary Builder Password</div>
                <p className="text-sm font-bold mt-1">
                  You are signed in with the seeded builder account. Change the username and password from Account and Security before going live.
                </p>
              </div>
              <Link href="/admin/account">
                <Button size="sm" className="font-black uppercase tracking-wider">Update</Button>
              </Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
