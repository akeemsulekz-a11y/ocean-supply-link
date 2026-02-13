import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

const Stock = () => {
  const { products, locations, getStock, refreshData } = useStore();
  const { user, role } = useAuth();
  const [filter, setFilter] = useState("all");

  // Adjust stock dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState("");
  const [adjLocationId, setAdjLocationId] = useState("");
  const [adjNewQty, setAdjNewQty] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const activeProducts = products.filter(p => p.active);
  const filteredLocations = filter === "all" ? locations : locations.filter(l => l.id === filter);

  const canAdjust = role === "admin" || role === "store_staff";

  const handleAdjust = async () => {
    if (!adjProductId || !adjLocationId || adjNewQty === "" || !adjReason.trim()) {
      toast.error("Fill all fields including reason");
      return;
    }

    const current = getStock(adjProductId, adjLocationId);
    const newQty = Number(adjNewQty);

    // Log adjustment
    const { error: logError } = await supabase.from("stock_adjustments").insert({
      product_id: adjProductId,
      location_id: adjLocationId,
      previous_cartons: current,
      new_cartons: newQty,
      reason: adjReason.trim(),
      adjusted_by: user!.id,
    });

    if (logError) {
      toast.error("Failed to log adjustment");
      return;
    }

    // Update stock
    await supabase.from("stock").upsert({
      product_id: adjProductId,
      location_id: adjLocationId,
      cartons: newQty,
    }, { onConflict: "product_id,location_id" });

    toast.success(`Stock adjusted: ${current} → ${newQty} cartons`);
    setAdjustOpen(false);
    setAdjProductId("");
    setAdjLocationId("");
    setAdjNewQty("");
    setAdjReason("");
    await refreshData();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Carton inventory across all locations</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {canAdjust && (
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />Adjust</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Location</label>
                    <Select value={adjLocationId} onValueChange={setAdjLocationId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Product</label>
                    <Select value={adjProductId} onValueChange={setAdjProductId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {activeProducts.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {adjLocationId ? `(${getStock(p.id, adjLocationId)} current)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {adjProductId && adjLocationId && (
                    <p className="text-sm text-muted-foreground">
                      Current: <span className="font-semibold text-foreground">{getStock(adjProductId, adjLocationId)}</span> cartons
                    </p>
                  )}
                  <div>
                    <label className="text-sm font-medium text-foreground">New Quantity</label>
                    <Input value={adjNewQty} onChange={e => setAdjNewQty(e.target.value)} type="number" placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Reason (audit log)</label>
                    <Textarea value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Physical count correction" className="mt-1" rows={2} />
                  </div>
                  <Button className="w-full" onClick={handleAdjust}>Apply Adjustment</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50">Product</th>
              {filteredLocations.map(l => (
                <th key={l.id} className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">{l.name}</th>
              ))}
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map(p => {
              const total = filteredLocations.reduce((s, l) => s + getStock(p.id, l.id), 0);
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">{p.name}</td>
                  {filteredLocations.map(l => {
                    const qty = getStock(p.id, l.id);
                    return (
                      <td key={l.id} className="px-4 py-3 text-center">
                        <span className={`font-semibold ${qty === 0 ? "text-destructive" : qty < 10 ? "text-warning" : "text-foreground"}`}>
                          {qty}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-bold text-foreground">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stock;
