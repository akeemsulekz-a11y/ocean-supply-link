import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Boxes, TrendingUp, Package } from "lucide-react";
const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const ShopStaffDashboard = () => {
  const { products, locations, stock, sales } = useStore();
  const { locationId, profile } = useAuth();
  const [todaySnapshots, setTodaySnapshots] = useState<any[]>([]);
  const [yesterdaySnaps, setYesterdaySnaps] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    Promise.all([
      supabase.from("daily_stock_snapshots").select("product_id, location_id, opening_cartons, added_cartons, sold_cartons, closing_cartons").eq("snapshot_date", today).eq("location_id", locationId ?? ""),
      supabase.from("daily_stock_snapshots").select("product_id, location_id, closing_cartons").eq("snapshot_date", yesterday).eq("location_id", locationId ?? ""),
    ]).then(([todayRes, yesterdayRes]) => {
      setTodaySnapshots(todayRes.data ?? []);
      setYesterdaySnaps(yesterdayRes.data ?? []);
    });
  }, [locationId]);

  const myShop = locations.find(l => l.id === locationId);
  const myStock = stock.filter(s => s.location_id === locationId);
  const totalStock = myStock.reduce((sum, s) => sum + s.cartons, 0);
  const mySales = sales.filter(s => s.location_id === locationId);
  const todaySales = mySales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);
  const totalRevenue = mySales.reduce((s, e) => s + e.total_amount, 0);

  const lowStock = myStock.filter(s => s.cartons > 0 && s.cartons < 10);

  const stats = [
    { label: "My Stock", value: `${totalStock} ctns`, icon: Boxes, color: "text-primary" },
    { label: "Today's Sales", value: todaySales.length, icon: ShoppingCart, color: "text-success" },
    { label: "Today's Revenue", value: fmt(todayRevenue), icon: TrendingUp, color: "text-warning" },
    { label: "Total Revenue", value: fmt(totalRevenue), icon: Package, color: "text-info" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{myShop?.name ?? "My Shop"}</h1>
        <p className="page-subtitle">Welcome, {profile?.full_name ?? "Staff"}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current stock with opening/closing */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Today's Stock</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Opening</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Sold</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {myStock.map(s => {
                const prod = products.find(p => p.id === s.product_id);
                const snapData = todaySnapshots.find(snap => snap.product_id === s.product_id && snap.location_id === locationId);
                const yesterdaySnap = yesterdaySnaps.find(snap => snap.product_id === s.product_id && snap.location_id === locationId);
                const opening = snapData ? snapData.opening_cartons : (yesterdaySnap ? yesterdaySnap.closing_cartons : s.cartons);
                const added = snapData ? snapData.added_cartons : 0;
                const sold = snapData ? snapData.sold_cartons : 0;
                const balance = s.cartons;
                return prod ? (
                  <tr key={s.product_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{prod.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{opening}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{added}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{sold}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${balance === 0 ? "text-destructive" : balance < 10 ? "text-warning" : "text-foreground"}`}>
                        {balance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        balance === 0 ? "bg-destructive/10 text-destructive" :
                        balance < 10 ? "bg-warning/10 text-warning" :
                        "bg-success/10 text-success"
                      }`}>
                        {balance === 0 ? "Out of stock" : balance < 10 ? "Low" : "OK"}
                      </span>
                    </td>
                  </tr>
                ) : null;
              })}
              {myStock.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No stock assigned to this shop</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <h3 className="text-sm font-semibold text-warning mb-2">⚠ Low Stock Alert</h3>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(s => {
              const prod = products.find(p => p.id === s.product_id);
              return (
                <span key={s.product_id} className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                  {prod?.name}: {s.cartons} ctns
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* My recent sales */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">My Recent Sales</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {mySales.slice(0, 10).map(sale => (
                <tr key={sale.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{sale.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
              {mySales.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShopStaffDashboard;
