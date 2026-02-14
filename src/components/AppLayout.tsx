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
  UserCheck,
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
  { to: "/customers", label: "Customers", icon: UserCheck, roles: ["admin"] },
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
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 transition-transform duration-300
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/30 px-5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center shadow-lg">
            <img src={appLogo} alt="OceanGush Logo" className="h-7 w-7 object-contain opacity-90" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-foreground tracking-tight">OceanGush</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-muted font-semibold">Supply Link</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto scroll-smooth">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted/70">Menu</p>
          {navItems.map((item, index) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-sidebar-accent to-sidebar-accent/60 text-sidebar-primary shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                  }
                `}
                style={{
                  animation: !active ? undefined : `slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                }}
              >
                <item.icon className={`h-[18px] w-[18px] transition-all duration-200 ${active ? "text-sidebar-primary scale-110" : "text-sidebar-muted/60 group-hover:text-sidebar-foreground group-hover:scale-105"}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-4 w-4 text-sidebar-primary/80 transition-transform duration-200 group-hover:translate-x-1" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border/30 p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/40 backdrop-blur-sm border border-sidebar-border/20 transition-all duration-200 hover:bg-sidebar-accent/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary/30 to-accent/30 text-xs font-bold text-sidebar-primary border border-sidebar-primary/20">
              {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile?.full_name ?? "User"}</p>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-muted font-semibold">{roleBadge}</p>
            </div>
            <button 
              onClick={signOut} 
              className="rounded-lg p-1.5 text-sidebar-muted/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200" 
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border/40 bg-card/40 backdrop-blur-xl px-4 lg:px-6 shadow-sm">
          <button className="lg:hidden text-foreground hover:text-primary hover:bg-muted/60 p-2 rounded-lg transition-all duration-200" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
          
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-muted/60 transition-all duration-200 text-muted-foreground hover:text-foreground group">
                <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                {unread.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-[10px] font-bold text-destructive-foreground shadow-lg animate-pulse">
                    {unread.length > 9 ? "9+" : unread.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-border/40 shadow-xl" align="end">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-4 bg-gradient-to-r from-muted/20 to-transparent">
                <h3 className="font-display text-sm font-semibold text-foreground">Notifications</h3>
                {unread.length > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto scroll-smooth">
                {unread.length === 0 ? (
                  <div className="px-4 py-12 text-center animate-fade-in">
                    <div className="h-10 w-10 mx-auto rounded-full bg-muted/40 flex items-center justify-center mb-3 animate-bounce-soft">
                      <Bell className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No new notifications</p>
                  </div>
                ) : (
                  unread.slice(0, 10).map((n, idx) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 border-b border-border/30 px-4 py-4 hover:bg-muted/40 cursor-pointer transition-all duration-200 group"
                      onClick={() => markAsRead(n.id)}
                      style={{ animation: `fade-in 0.3s ease-out forwards`, animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="mt-1.5 flex h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-accent shrink-0 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium">
                          {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <Check className="h-4 w-4 text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 font-medium border border-border/40 hover:bg-muted/50 transition-all duration-200">
            <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
