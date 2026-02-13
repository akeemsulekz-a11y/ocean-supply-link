import { useStore } from "@/context/StoreContext";
import { Package, MapPin, ShoppingCart, TrendingUp, Boxes, Truck } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const StoreStaffDashboard = () => {
  const { products, locations, stock, sales } = useStore();

  const store = locations.find(l => l.type === "store");
  const shops = locations.filter(l => l.type === "shop");
  const totalStock = stock.reduce((s, e) => s + e.cartons, 0);
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);
  const storeStock = store ? stock.filter(s => s.location_id === store.id).reduce((sum, s) => sum + s.cartons, 0) : 0;

  const stats = [
    { label: "Store Stock", value: `${storeStock} ctns`, icon: Boxes, color: "text-primary" },
    { label: "Total Stock", value: `${totalStock} ctns`, icon: Package, color: "text-info" },
    { label: "Shops", value: shops.length, icon: MapPin, color: "text-accent" },
    { label: "Today's Sales", value: todaySales.length, icon: ShoppingCart, color: "text-success" },
    { label: "Today's Revenue", value: fmt(todayRevenue), icon: TrendingUp, color: "text-warning" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Store Manager Dashboard</h1>
        <p className="page-subtitle">Manage Main Store and all shop operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      {/* Shop overview */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Shop Overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shops.map((shop) => {
            const shopStock = stock.filter(s => s.location_id === shop.id);
            const total = shopStock.reduce((sum, s) => sum + s.cartons, 0);
            const shopSales = sales.filter(s => s.location_id === shop.id);
            const shopRevToday = shopSales
              .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
              .reduce((sum, s) => sum + s.total_amount, 0);
            return (
              <div key={shop.id} className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                  <h3 className="text-sm font-semibold text-foreground">{shop.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Stock</p>
                    <p className="font-bold text-foreground">{total} ctns</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today Rev.</p>
                    <p className="font-bold text-foreground">{fmt(shopRevToday)}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  {shopStock.slice(0, 4).map(s => {
                    const prod = products.find(p => p.id === s.product_id);
                    return prod ? (
                      <div key={s.product_id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{prod.name}</span>
                        <span className={`font-medium ${s.cartons < 5 ? "text-destructive" : "text-foreground"}`}>{s.cartons}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent sales across all */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recent Sales (All Locations)</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 8).map(sale => {
                const loc = locations.find(l => l.id === sale.location_id);
                return (
                  <tr key={sale.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{loc?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sale.customer_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No sales yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoreStaffDashboard;
