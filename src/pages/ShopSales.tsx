import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, ShoppingCart, TrendingUp, Plus, Package, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const ShopSales = () => {
  const { products, sales, stock, addSale } = useStore();
  const { locationId } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [searchQuery, setSearchQuery] = useState("");

  const mySales = sales.filter(s => s.location_id === locationId);
  const myStock = stock.filter(s => s.location_id === locationId);
  const now = new Date();

  const filteredSales = mySales.filter(s => {
    const d = new Date(s.created_at);
    const matchDate = dateFilter === "today" ? d.toDateString() === now.toDateString()
      : dateFilter === "week" ? d >= new Date(now.getTime() - 7 * 86400000)
      : true;
    const matchSearch = !searchQuery || s.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDate && matchSearch;
  });

  const todaySales = mySales.filter(s => new Date(s.created_at).toDateString() === now.toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);
  const todayCount = todaySales.length;
  const totalItems = todaySales.reduce((s, e) => s + e.items.reduce((sum, i) => sum + i.cartons, 0), 0);
  const totalStockCount = myStock.reduce((sum, s) => sum + s.cartons, 0);
  const lowStockCount = myStock.filter(s => s.cartons > 0 && s.cartons < 10).length;
  const outOfStockCount = myStock.filter(s => s.cartons === 0).length;

  const handleComplete = async (data: { customer_name: string; items: any[]; total_amount: number }) => {
    if (!locationId) return;
    await addSale({ location_id: locationId, ...data });
    toast.success("Sale completed!");
    return mySales[0]?.id;
  };

  const openReceipt = (sale: typeof sales[0]) => {
    const itemsData = sale.items.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      return { name: prod?.name ?? "Unknown", cartons: i.cartons, price_per_carton: i.price_per_carton };
    });
    const params = new URLSearchParams({
      type: "sale",
      receipt: sale.id.slice(-6).toUpperCase(),
      date: sale.created_at,
      customer: sale.customer_name,
      total: sale.total_amount.toString(),
      items: encodeURIComponent(JSON.stringify(itemsData)),
    });
    navigate(`/print?${params.toString()}`);
  };

  if (showForm && locationId) {
    return (
      <div className="max-w-2xl mx-auto">
        <MultiStepSaleForm
          locationId={locationId}
          onClose={() => setShowForm(false)}
          onComplete={handleComplete}
          mode="sale"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Point of Sale</h1>
          <p className="page-subtitle">Record and manage walk-in sales</p>
        </div>
        <Button size="lg" onClick={() => setShowForm(true)} className="gap-2 shadow-md text-base px-6">
          <Plus className="h-5 w-5" />
          New Sale
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sales Today</p>
              <p className="text-2xl font-bold text-foreground">{todayCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold text-success">{fmt(todayRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Items Sold</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stock</p>
              <p className="text-lg font-bold text-foreground">
                {totalStockCount}
                {(lowStockCount > 0 || outOfStockCount > 0) && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({lowStockCount > 0 && <span className="text-warning">{lowStockCount} low</span>}
                    {lowStockCount > 0 && outOfStockCount > 0 && ", "}
                    {outOfStockCount > 0 && <span className="text-destructive">{outOfStockCount} out</span>})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stock Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {myStock.slice(0, 10).map(s => {
          const prod = products.find(p => p.id === s.product_id);
          if (!prod) return null;
          const statusClass = s.cartons === 0
            ? "border-destructive/30 bg-destructive/5"
            : s.cartons < 10
            ? "border-warning/30 bg-warning/5"
            : "border-border bg-card";
          return (
            <div key={s.product_id} className={`rounded-lg border p-2.5 ${statusClass}`}>
              <p className="text-xs font-medium text-foreground truncate">{prod.name}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.cartons === 0 ? "text-destructive" : s.cartons < 10 ? "text-warning" : "text-foreground"}`}>
                {s.cartons} <span className="text-[10px] font-normal text-muted-foreground">ctns</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customer…" className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["today", "week", "all"] as const).map(f => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${dateFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "today" ? "Today" : f === "week" ? "This Week" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-2">
        {filteredSales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No sales found</p>
            <p className="text-xs text-muted-foreground mt-1">Click "New Sale" to record a transaction</p>
          </div>
        ) : (
          filteredSales.map(sale => {
            const itemNames = sale.items.map(i => {
              const prod = products.find(p => p.id === i.product_id);
              return prod ? `${prod.name} ×${i.cartons}` : null;
            }).filter(Boolean);

            return (
              <div key={sale.id} className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{sale.customer_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">#{sale.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{itemNames.join(", ")}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sale.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </span>
                      <span>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">{fmt(sale.total_amount)}</span>
                    <Button variant="ghost" size="icon" onClick={() => openReceipt(sale)} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary h-8 w-8">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ShopSales;
