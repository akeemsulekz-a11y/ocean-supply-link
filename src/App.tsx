import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import SplashScreen from "@/components/SplashScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Locations from "./pages/Locations";
import Stock from "./pages/Stock";
import StoreStock from "./pages/StoreStock";
import Sales from "./pages/Sales";
import ShopSales from "./pages/ShopSales";
import Supplies from "./pages/Supplies";
import Reports from "./pages/Reports";
import Revenue from "./pages/Revenue";
import UserManagement from "./pages/UserManagement";
import CustomerManagement from "./pages/CustomerManagement";
import Orders from "./pages/Orders";
import PrintReceipt from "./pages/PrintReceipt";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const SalesRouter = () => {
  const { role } = useAuth();
  if (role === "shop_staff") return <ShopSales />;
  return <Sales />;
};

const ProtectedRoutes = () => {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <StoreProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/store-stock" element={<StoreStock />} />
          <Route path="/sales" element={<SalesRouter />} />
          <Route path="/supplies" element={<Supplies />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/print" element={<PrintReceipt />} />
          <Route path="/settings" element={<Settings />} />
          {role === "admin" && <Route path="/revenue" element={<Revenue />} />}
          {role === "admin" && <Route path="/users" element={<UserManagement />} />}
          {role === "admin" && <Route path="/customers" element={<CustomerManagement />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </StoreProvider>
  );
};

const AuthRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const ONBOARDING_KEY = "oceangush_onboarded";

const AppWithPWA = () => {
  const [splashDone, setSplashDone] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });
  const { showInstallPrompt, isPWAInstalled, installApp, dismissPrompt } = usePWAInstall();
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);

  const handleSplashFinished = useCallback(() => setSplashDone(true), []);
  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOnboardingDone(true);
  }, []);

  // Show PWA prompt after splash, only if not onboarded and not already installed
  useEffect(() => {
    if (splashDone && !onboardingDone && showInstallPrompt && !isPWAInstalled) {
      setShowPWAPrompt(true);
    }
  }, [splashDone, onboardingDone, showInstallPrompt, isPWAInstalled]);

  const handlePWAInstall = async () => {
    await installApp();
    setShowPWAPrompt(false);
  };

  const handlePWADismiss = () => {
    dismissPrompt();
    setShowPWAPrompt(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onFinished={handleSplashFinished} />}
        {showPWAPrompt && <PWAInstallPrompt onInstall={handlePWAInstall} onDismiss={handlePWADismiss} />}
        {splashDone && !onboardingDone && <OnboardingScreen onComplete={handleOnboardingComplete} />}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppWithPWA;
