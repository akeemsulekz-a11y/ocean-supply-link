import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Package,
  MapPin,
  BarChart3,
  ShoppingCart,
  Truck,
  FileText,
  Menu,
  X,
  Waves,
  LogOut,
  Users,
} from "lucide-react";

type AppRole = "admin" | "store_staff" | "shop_staff" | null;

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: AppRole[]; // null means any role
}

const allNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: [null, "admin", "store_staff", "shop_staff"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin", "store_staff"] },
  { to: "/locations", label: "Locations", icon: MapPin, roles: ["admin", "store_staff"] },
  { to: "/stock", label: "Stock", icon: BarChart3, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/sales", label: "Sales", icon: ShoppingCart, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/supplies", label: "Supplies", icon: Truck, roles: ["admin", "store_staff", "shop_staff"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["admin", "store_staff"] },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, role, signOut } = useAuth();

  const navItems = allNavItems.filter(item =>
    item.roles.includes(null) || item.roles.includes(role)
  );

  const roleBadge = role === "admin" ? "Admin" : role === "store_staff" ? "Store Manager" : role === "shop_staff" ? "Shop Staff" : "User";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Waves className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-foreground">OceanGush</h1>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-muted">Wholesale</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary">
              {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "User"}</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">{roleBadge}</p>
            </div>
            <button onClick={signOut} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
