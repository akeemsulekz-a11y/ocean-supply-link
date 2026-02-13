import { useStore } from "@/context/StoreContext";
import { Package, MapPin, ShoppingCart, BarChart3, TrendingUp, Boxes } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Dashboard = () => {
  const { products, locations, stock, sales } = useStore();

  const totalStock = stock.reduce((s, e) => s + e.cartons, 0);
  const totalRevenue = sales.reduce((s, e) => s + e.total_amount, 0);
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);

  const stats = [
    { label: "Products", value: products.filter(p => p.active).length, icon: Package, color: "text-primary" },
    { label: "Locations", value: locations.length, icon: MapPin, color: "text-accent" },
    { label: "Total Stock", value: `${totalStock} ctns`, icon: Boxes, color: "text-info" },
    { label: "Today's Sales", value: todaySales.length, icon: ShoppingCart, color: "text-success" },
    { label: "Today's Revenue", value: fmt(todayRevenue), icon: TrendingUp, color: "text-warning" },
    { label: "Total Revenue", value: fmt(totalRevenue), icon: BarChart3, color: "text-primary" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of OceanGush wholesale operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Stock by location */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Stock by Location</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc) => {
            const locStock = stock.filter(s => s.location_id === loc.id);
            const total = locStock.reduce((sum, s) => sum + s.cartons, 0);
            return (
              <div key={loc.id} className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-block h-2 w-2 rounded-full ${loc.type === "store" ? "bg-primary" : "bg-accent"}`} />
                  <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {loc.type}
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{total} <span className="text-sm font-normal text-muted-foreground">cartons</span></p>
                <div className="mt-3 space-y-1">
                  {locStock.map(s => {
                    const prod = products.find(p => p.id === s.product_id);
                    return prod ? (
                      <div key={s.product_id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{prod.name}</span>
                        <span className="font-medium text-foreground">{s.cartons}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent sales */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recent Sales</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 10).map(sale => {
                const loc = locations.find(l => l.id === sale.location_id);
                return (
                  <tr key={sale.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{loc?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sale.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sale.items.length} product(s)</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {new Date(sale.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
