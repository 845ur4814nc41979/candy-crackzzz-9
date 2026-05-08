import { Redirect, Route, Router as WouterRouter, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppErrorBoundary from "@/components/layout/AppErrorBoundary";

import HomePage from "@/pages/HomePage";
import MenuPage from "@/pages/MenuPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import OrderSuccessPage from "@/pages/OrderSuccessRewards";
import GalleryPage from "@/pages/GalleryPage";
import SeasonalPage from "@/pages/SeasonalPage";
import CustomOrdersPage from "@/pages/CustomOrdersPage";
import ContactPage from "@/pages/ContactPage";
import RewardsPage from "@/pages/RewardsPagePlus";
import MerchPage from "@/pages/MerchPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/not-found";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminOrders from "@/pages/admin/AdminOrdersReferralBadges";
import AdminDeliveries from "@/pages/admin/AdminDeliveries";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminRewards from "@/pages/admin/AdminRewards";
import AdminStaffReferralzzz from "@/pages/admin/AdminStaffReferralzzz";
import AdminMerch from "@/pages/admin/AdminMerch";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminBranding from "@/pages/admin/AdminBranding";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminAccount from "@/pages/admin/AdminAccount";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminTeam from "@/pages/admin/AdminTeam";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminStaffCodes from "@/pages/admin/AdminStaffCodes";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import StaffReferralTracker from "@/components/referrals/StaffReferralTracker";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/menu" component={MenuPage} />
      <Route path="/menu/:slug" component={ProductDetailPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/order-success" component={OrderSuccessPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/seasonal" component={SeasonalPage} />
      <Route path="/custom-orders" component={CustomOrdersPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/rewards" component={RewardsPage} />
      <Route path="/merch" component={MerchPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />

      <Route path="/admin/setup">{() => <Redirect to="/admin/login" />}</Route>
      <Route path="/admin/login" component={AdminLogin} />

      <Route path="/admin">
        {() => <ProtectedRoute><AdminDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/admin/products">
        {() => <ProtectedRoute requireAnyPermission={['manageProducts', 'viewProducts']}><AdminProducts /></ProtectedRoute>}
      </Route>
      <Route path="/admin/products/new">
        {() => <ProtectedRoute requirePermission="manageProducts"><AdminProductForm /></ProtectedRoute>}
      </Route>
      <Route path="/admin/products/:id/edit">
        {() => <ProtectedRoute requirePermission="manageProducts"><AdminProductForm /></ProtectedRoute>}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute requireAnyPermission={['manageOrders', 'viewOrders']}><AdminOrders /></ProtectedRoute>}
      </Route>
      <Route path="/admin/deliveries">
        {() => <ProtectedRoute requireAnyPermission={['manageOrders', 'viewOrders']}><AdminDeliveries /></ProtectedRoute>}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute requireAnyPermission={['manageSiteSettings', 'manageSystemSettings']}><AdminSettings /></ProtectedRoute>}
      </Route>
      <Route path="/admin/rewards">
        {() => <ProtectedRoute requireAnyPermission={['manageRewards', 'viewRewards']}><AdminRewards /></ProtectedRoute>}
      </Route>
      <Route path="/admin/staff-referralzzz">
        {() => <ProtectedRoute requireAnyPermission={['manageRewards', 'manageAdmins']}><AdminStaffReferralzzz /></ProtectedRoute>}
      </Route>
      <Route path="/admin/merch">
        {() => <ProtectedRoute requireAnyPermission={['manageMerch', 'viewMerch']}><AdminMerch /></ProtectedRoute>}
      </Route>
      <Route path="/admin/campaigns">
        {() => <ProtectedRoute requireAnyPermission={['manageCampaigns', 'viewCampaigns']}><AdminCampaigns /></ProtectedRoute>}
      </Route>
      <Route path="/admin/branding">
        {() => <ProtectedRoute requirePermission="manageBranding"><AdminBranding /></ProtectedRoute>}
      </Route>
      <Route path="/admin/payments">
        {() => <ProtectedRoute requirePermission="managePayments"><AdminPayments /></ProtectedRoute>}
      </Route>
      <Route path="/admin/reviews">
        {() => <ProtectedRoute requirePermission="manageSiteSettings"><AdminReviews /></ProtectedRoute>}
      </Route>
      <Route path="/admin/account">
        {() => <ProtectedRoute><AdminAccount /></ProtectedRoute>}
      </Route>
      <Route path="/admin/messages">
        {() => <ProtectedRoute requireAnyPermission={['manageMessages', 'viewMessages']}><AdminMessages /></ProtectedRoute>}
      </Route>
      <Route path="/admin/team">
        {() => <ProtectedRoute requirePermission="manageAdmins"><AdminTeam /></ProtectedRoute>}
      </Route>
      <Route path="/admin/analytics">
        {() => <ProtectedRoute requireAnyPermission={['viewAnalytics', 'manageAnalytics']}><AdminAnalytics /></ProtectedRoute>}
      </Route>
      <Route path="/admin/inventory">
        {() => <ProtectedRoute requireAnyPermission={['manageProducts', 'viewProducts']}><AdminInventory /></ProtectedRoute>}
      </Route>
      <Route path="/admin/staff-codes">
        {() => <ProtectedRoute requireAnyPermission={['manageRewards', 'manageAdmins']}><AdminStaffCodes /></ProtectedRoute>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <PageViewTracker />
                <StaffReferralTracker />
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
