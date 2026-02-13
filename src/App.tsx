import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Locations from "./pages/Locations";
import Stock from "./pages/Stock";
import Sales from "./pages/Sales";
import ShopSales from "./pages/ShopSales";
import Supplies from "./pages/Supplies";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Orders from "./pages/Orders";
import PrintReceipt from "./pages/PrintReceipt";
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
          <Route path="/sales" element={<SalesRouter />} />
          <Route path="/supplies" element={<Supplies />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/print" element={<PrintReceipt />} />
          {role === "admin" && <Route path="/users" element={<UserManagement />} />}
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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

export default App;
