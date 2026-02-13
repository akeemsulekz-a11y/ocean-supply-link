import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt } from "lucide-react";
import { toast } from "sonner";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const ShopSales = () => {
  const { products, sales, addSale } = useStore();
  const { locationId } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");

  const mySales = sales.filter(s => s.location_id === locationId);
  const now = new Date();
  const filteredSales = mySales.filter(s => {
    const d = new Date(s.created_at);
    if (dateFilter === "today") return d.toDateString() === now.toDateString();
    if (dateFilter === "week") { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    return true;
  });

  const todayRevenue = mySales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()).reduce((s, e) => s + e.total_amount, 0);
  const todayCount = mySales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()).length;

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
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Sales</p><p className="text-xl font-bold text-foreground">{todayCount}</p></div>
        <div className="stat-card"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Revenue</p><p className="text-xl font-bold text-success">{fmt(todayRevenue)}</p></div>
        <div className="stat-card sm:col-span-1 col-span-2">
          <Button className="w-full h-full min-h-[60px] text-base" onClick={() => setShowForm(true)}>
            New Sale
          </Button>
        </div>
      </div>

      {/* Sales History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Sales History</h2>
          <div className="flex gap-1">
            {(["today", "week", "all"] as const).map(f => (
              <button key={f} onClick={() => setDateFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${dateFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f === "today" ? "Today" : f === "week" ? "This Week" : "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{sale.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openReceipt(sale)} className="text-primary hover:text-primary/80">
                      <Receipt className="h-4 w-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sales found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShopSales;
