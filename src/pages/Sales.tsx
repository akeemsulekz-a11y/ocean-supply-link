import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Search, TrendingUp, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Sales = () => {
  const { products, locations, sales, addSale } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");

  const now = new Date();
  const filteredSales = sales.filter(s => {
    const d = new Date(s.created_at);
    const matchDate = dateFilter === "today" ? d.toDateString() === now.toDateString()
      : dateFilter === "week" ? d >= new Date(now.getTime() - 7 * 86400000)
      : true;
    const matchSearch = !searchQuery || s.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDate && matchSearch;
  });

  const todayRevenue = sales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()).reduce((s, e) => s + e.total_amount, 0);
  const todayCount = sales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()).length;

  const handleComplete = async (data: { customer_name: string; items: any[]; total_amount: number }) => {
    if (!locationId) { toast.error("Select a location"); return; }
    const saleId = await addSale({ location_id: locationId, ...data });
    toast.success("Sale recorded!");
    return saleId;
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
          onClose={() => { setShowForm(false); setLocationId(""); }}
          onComplete={handleComplete}
          mode="sale"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record and manage walk-in sales</p>
        </div>
        {!showForm && (
          <Select value={locationId} onValueChange={v => { setLocationId(v); setShowForm(true); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="➕ New Sale — Select Location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Sales</p>
              <p className="text-2xl font-bold text-foreground mt-1">{todayCount}</p>
            </div>
            <div className="icon-badge bg-success/10 text-success">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Revenue</p>
              <p className="text-2xl font-bold text-success mt-1">{fmt(todayRevenue)}</p>
            </div>
            <div className="icon-badge bg-warning/10 text-warning">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search customer..." className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["today", "week", "all"] as const).map(f => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`filter-chip ${dateFilter === f ? "filter-chip-active" : "filter-chip-inactive"}`}>
              {f === "today" ? "Today" : f === "week" ? "This Week" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Receipt #</th>
              <th className="text-left">Location</th>
              <th className="text-left">Customer</th>
              <th className="text-center">Items</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Date</th>
              <th className="text-center">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => {
              const loc = locations.find(l => l.id === sale.location_id);
              return (
                <tr key={sale.id}>
                  <td className="text-xs text-muted-foreground font-mono">#{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="font-medium text-foreground">{loc?.name}</td>
                  <td className="text-muted-foreground">{sale.customer_name}</td>
                  <td className="text-center text-foreground">{sale.items.length}</td>
                  <td className="text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                  <td className="text-right text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => openReceipt(sale)} className="text-primary hover:text-primary/80">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filteredSales.length === 0 && (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <ShoppingCart className="empty-state-icon" />
                  <p className="empty-state-text">No sales found</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
