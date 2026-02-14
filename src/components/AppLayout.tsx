import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import appLogo from "@/assets/logo.png";
import {
  LayoutDashboard,
  Package,
  MapPin,
  BarChart3,
  ShoppingCart,
  Truck,
  FileText,
  Warehouse,
  Menu,
  X,
  LogOut,
  Users,
  ClipboardList,
  Settings,
  Bell,
  Check,
  ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type AppRole = "admin" | "store_staff" | "shop_staff" | null;

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: AppRole[];
}

const allNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: [null, "admin", "store_staff", "shop_staff"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin", "store_staff"] },
  { to: "/locations", label: "Locations", icon: MapPin, roles: ["admin", "store_staff"] },
  { to: "/store-stock", label: "Store Stock", icon: Warehouse, roles: ["admin", "store_staff"] },
  { to: "/stock", label: "Shop Stock", icon: BarChart3, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/sales", label: "Sales", icon: ShoppingCart, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/supplies", label: "Supplies", icon: Truck, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/orders", label: "Orders", icon: ClipboardList, roles: [null, "admin", "store_staff"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["admin", "store_staff"] },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const { unread, markAsRead, markAllAsRead } = useNotifications();

  const navItems = allNavItems.filter(item =>
    item.roles.includes(null) || item.roles.includes(role)
  );

  const roleBadge = role === "admin" ? "Admin" : role === "store_staff" ? "Store Manager" : role === "shop_staff" ? "Shop Staff" : "Customer";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <img src={appLogo} alt="OceanGush Logo" className="h-9 w-9 rounded-lg object-contain" />
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-foreground tracking-tight">OceanGush</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-muted font-medium">International Services</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-muted">Menu</p>
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150
                  ${active
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }
                `}
              >
                <item.icon className={`h-[18px] w-[18px] transition-colors ${active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary/60" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary/20 to-sidebar-accent text-sm font-bold text-sidebar-primary">
              {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "User"}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-muted font-medium">{roleBadge}</p>
            </div>
            <button onClick={signOut} className="rounded-lg p-1.5 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6">
          <button className="lg:hidden text-foreground hover:text-primary transition-colors" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
          
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {unread.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                    {unread.length > 9 ? "9+" : unread.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="font-display text-sm font-semibold text-foreground">Notifications</h3>
                {unread.length > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {unread.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                ) : (
                  unread.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 border-b border-border/50 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="mt-1 flex h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
