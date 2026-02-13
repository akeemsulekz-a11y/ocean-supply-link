import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface SaleItemLocal {
  product_id: string;
  cartons: number;
  price_per_carton: number;
}

const Sales = () => {
  const { products, locations, sales, addSale, getStock } = useStore();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [items, setItems] = useState<SaleItemLocal[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("");

  const activeProducts = products.filter(p => p.active);
  const total = items.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);

  const addItem = () => {
    if (!selProduct || !selQty || Number(selQty) <= 0) return;
    const prod = products.find(p => p.id === selProduct);
    if (!prod) return;
    if (items.some(i => i.product_id === selProduct)) {
      toast.error("Product already added");
      return;
    }
    const available = getStock(selProduct, locationId);
    if (Number(selQty) > available) {
      toast.error(`Only ${available} cartons available`);
      return;
    }
    setItems(prev => [...prev, { product_id: selProduct, cartons: Number(selQty), price_per_carton: prod.price_per_carton }]);
    setSelProduct("");
    setSelQty("");
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!locationId || items.length === 0) {
      toast.error("Select location and add items");
      return;
    }
    await addSale({ location_id: locationId, customer_name: customerName, items, total_amount: total });
    toast.success("Sale recorded!");
    setOpen(false);
    setItems([]);
    setLocationId("");
    setCustomerName("Walk-in Customer");
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record and view walk-in sales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Record Sale</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Location</label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Customer Name</label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" />
              </div>

              {locationId && (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Items</p>
                  <div className="flex gap-2">
                    <Select value={selProduct} onValueChange={setSelProduct}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({getStock(p.id, locationId)} avail)</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={selQty} onChange={e => setSelQty(e.target.value)} type="number" placeholder="Qty" className="w-20" />
                    <Button variant="secondary" onClick={addItem}>Add</Button>
                  </div>

                  {items.length > 0 && (
                    <div className="space-y-1">
                      {items.map((item, idx) => {
                        const prod = products.find(p => p.id === item.product_id);
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                            <span className="text-foreground">{prod?.name} × {item.cartons}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
                              <button onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive/80">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between pt-2 border-t border-border text-sm font-bold text-foreground">
                        <span>Total</span>
                        <span>{fmt(total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={handleSubmit} disabled={!locationId || items.length === 0}>
                Complete Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sales recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
