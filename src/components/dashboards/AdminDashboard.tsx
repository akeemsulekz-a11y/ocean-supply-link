import { useStore } from "@/context/StoreContext";
import { Package, MapPin, ShoppingCart, BarChart3, TrendingUp, Boxes } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const COLORS = [
  "hsl(200, 80%, 40%)",
  "hsl(174, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 45%)",
  "hsl(340, 72%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(200, 60%, 60%)",
];

const AdminDashboard = () => {
  const { products, locations, stock, sales } = useStore();

  const totalStock = stock.reduce((s, e) => s + e.cartons, 0);
  const totalRevenue = sales.reduce((s, e) => s + e.total_amount, 0);
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);

  const stats = [
    { label: "Products", value: products.filter(p => p.active).length, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Locations", value: locations.length, icon: MapPin, color: "text-accent", bg: "bg-accent/10" },
    { label: "Total Stock", value: `${totalStock} ctns`, icon: Boxes, color: "text-info", bg: "bg-info/10" },
    { label: "Today's Sales", value: todaySales.length, icon: ShoppingCart, color: "text-success", bg: "bg-success/10" },
    { label: "Today's Revenue", value: fmt(todayRevenue), icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
    { label: "Total Revenue", value: fmt(totalRevenue), icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
  ];

  const stockByLocation = locations.map(loc => ({
    name: loc.name,
    value: stock.filter(s => s.location_id === loc.id).reduce((sum, s) => sum + s.cartons, 0),
  })).filter(d => d.value > 0);

  const revenueByLocation = locations.map(loc => ({
    name: loc.name.length > 12 ? loc.name.slice(0, 12) + "…" : loc.name,
    revenue: sales.filter(s => s.location_id === loc.id).reduce((sum, s) => sum + s.total_amount, 0),
  })).filter(d => d.revenue > 0);

  const productSales: Record<string, number> = {};
  sales.forEach(s => {
    s.items.forEach(i => {
      productSales[i.product_id] = (productSales[i.product_id] ?? 0) + i.cartons;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pid, cartons]) => ({
      name: products.find(p => p.id === pid)?.name ?? "Unknown",
      cartons,
    }));

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontWeight={500}>
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Full overview of OceanGush wholesale operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card animate-fade-in group" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{s.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground group-hover:text-primary transition-colors">{s.value}</p>
              </div>
              <div className={`icon-badge ${s.bg} ${s.color} group-hover:scale-110 transition-transform`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mt-10 lg:grid-cols-2">
        {stockByLocation.length > 0 && (
          <div className="stat-card group animate-slide-in-left">
            <h2 className="section-title mb-6 flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-gradient-to-r from-primary to-accent"></span>
              Stock Distribution
            </h2>
            <div className="rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={stockByLocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                  >
                    {stockByLocation.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} cartons`, "Stock"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {revenueByLocation.length > 0 && (
          <div className="stat-card group animate-slide-in-right">
            <h2 className="section-title mb-6 flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-gradient-to-r from-accent to-primary"></span>
              Revenue by Location
            </h2>
            <div className="rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={revenueByLocation} barSize={36}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [fmt(value), "Revenue"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }}
                  />
                  <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200, 80%, 40%)" />
                      <stop offset="95%" stopColor="hsl(200, 80%, 40% / 0.2)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topProducts.length > 0 && (
          <div className="stat-card lg:col-span-2 animate-slide-in-up">
            <h2 className="section-title mb-6 flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-gradient-to-r from-primary to-accent"></span>
              Top Selling Products
            </h2>
            <div className="rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" barSize={24}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} cartons`, "Sold"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, backdropFilter: "blur(10px)" }}
                  />
                  <Bar dataKey="cartons" fill="url(#colorCartons)" radius={[0, 8, 8, 0]} />
                  <defs>
                    <linearGradient id="colorCartons" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="hsl(174, 60%, 45%)" />
                      <stop offset="95%" stopColor="hsl(174, 60%, 45% / 0.2)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Stock by location */}
      <div className="mt-12">
        <h2 className="section-title mb-6 flex items-center gap-2">
          <span className="inline-block h-1 w-1 rounded-full bg-gradient-to-r from-primary to-accent"></span>
          Stock by Location
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc, idx) => {
            const locStock = stock.filter(s => s.location_id === loc.id);
            const total = locStock.reduce((sum, s) => sum + s.cartons, 0);
            return (
              <div key={loc.id} className="stat-card animate-fade-in group hover-lift" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-block h-3 w-3 rounded-full ${loc.type === "store" ? "bg-gradient-to-r from-primary to-primary/60" : "bg-gradient-to-r from-accent to-accent/60"}`} />
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{loc.name}</h3>
                  <span className="ml-auto badge badge-primary text-[10px] font-semibold">{loc.type}</span>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {total} <span className="text-sm font-normal text-muted-foreground">ctns</span>
                </p>
                <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                  {locStock.slice(0, 3).map(s => {
                    const prod = products.find(p => p.id === s.product_id);
                    return prod ? (
                      <div key={s.product_id} className="flex items-center justify-between text-xs group/item hover:bg-muted/30 px-2 py-1 rounded-lg transition-colors">
                        <span className="text-muted-foreground truncate">{prod.name}</span>
                        <span className={`font-bold transition-colors ${s.cartons === 0 ? "text-destructive" : "text-primary group-hover/item:text-primary/80"}`}>{s.cartons}</span>
                      </div>
                    ) : null;
                  })}
                  {locStock.length > 3 && <p className="text-[10px] text-muted-foreground/60 px-2 py-1">+{locStock.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent sales */}
      <div className="mt-12">
        <h2 className="section-title mb-6 flex items-center gap-2">
          <span className="inline-block h-1 w-1 rounded-full bg-gradient-to-r from-primary to-accent"></span>
          Recent Sales
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-lg">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Location</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Items</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((sale, idx) => {
                  const loc = locations.find(l => l.id === sale.location_id);
                  return (
                    <tr key={sale.id} className="group/row hover:bg-primary/5" style={{ animation: `fade-in 0.4s ease-out forwards`, animationDelay: `${idx * 40}ms` }}>
                      <td className="font-semibold text-foreground group-hover/row:text-primary transition-colors">{loc?.name}</td>
                      <td className="text-muted-foreground">{sale.customer_name}</td>
                      <td className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-muted/40 font-medium">
                          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="text-right font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{fmt(sale.total_amount)}</td>
                      <td className="text-right text-muted-foreground text-xs font-medium">{new Date(sale.created_at).toLocaleDateString("en-GB")}</td>
                    </tr>
                  );
                })}
                {sales.length === 0 && (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <ShoppingCart className="empty-state-icon" />
                      <p className="empty-state-text">No sales yet</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
