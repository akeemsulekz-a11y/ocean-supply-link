import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Sales = () => {
  const { products, locations, sales } = useStore();
  const navigate = useNavigate();
  const { addSale } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [locationId, setLocationId] = useState("");

  const storeLocations = locations.filter(l => l.type === "store");

  const handleComplete = async (data: { customer_name: string; items: any[]; total_amount: number }) => {
    if (!locationId) { toast.error("Select a location"); return; }
    await addSale({ location_id: locationId, ...data });
    toast.success("Sale recorded!");
    return sales[0]?.id; // newest sale
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
          <p className="page-subtitle">Record and view walk-in sales</p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            {!locationId ? (
              <Select value={locationId} onValueChange={v => { setLocationId(v); setShowForm(true); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="New Sale — Select Location" /></SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />New Sale</Button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => {
              const loc = locations.find(l => l.id === sale.location_id);
              return (
                <tr key={sale.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{sale.id.slice(-6)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{loc?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{sale.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openReceipt(sale)} className="text-primary hover:text-primary/80">
                      <Receipt className="h-4 w-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
