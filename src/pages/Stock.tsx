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

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Stock = () => {
  const { products, locations, stock, sales, getStock, refreshData } = useStore();
  const { user, role, locationId: myLocationId } = useAuth();
  const [filter, setFilter] = useState("all");

  // Adjust stock dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState("");
  const [adjLocationId, setAdjLocationId] = useState("");
  const [adjNewQty, setAdjNewQty] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const isShopStaff = role === "shop_staff";
  const canAdjust = role === "admin" || role === "store_staff";

  const activeProducts = products.filter(p => p.active);

  // Shop staff sees only their location
  const visibleLocations = isShopStaff && myLocationId
    ? locations.filter(l => l.id === myLocationId)
    : locations;

  const shops = visibleLocations.filter(l => l.type === "shop");
  const filteredShops = filter === "all" ? shops : shops.filter(l => l.id === filter);

  // For each product at each shop, compute daily columns
  const getShopProductData = (productId: string, locId: string) => {
    const currentStock = getStock(productId, locId);
    const prod = products.find(p => p.id === productId);
    const price = prod?.price_per_carton ?? 0;

    // Today's sales for this product at this location
    const today = new Date().toDateString();
    const todaySalesForProduct = sales
      .filter(s => s.location_id === locId && new Date(s.created_at).toDateString() === today)
      .reduce((sum, s) => {
        const item = s.items.find(i => i.product_id === productId);
        return sum + (item ? item.cartons : 0);
      }, 0);

    // Opening stock = current + sold today (approximation — actual opening needs daily snapshots)
    const openingStock = currentStock + todaySalesForProduct;
    // Added stock today from transfers (we approximate as 0 for now, can be enhanced with transfer data)
    const addedStock = 0;
    const totalStock = openingStock + addedStock;
    const saleCartons = todaySalesForProduct;
    const salePrice = saleCartons * price;
    const balanceStock = currentStock;

    return { openingStock, addedStock, totalStock, price, saleCartons, salePrice, balanceStock };
  };

  const handleAdjust = async () => {
    if (!adjProductId || !adjLocationId || adjNewQty === "" || !adjReason.trim()) {
      toast.error("Fill all fields including reason");
      return;
    }

    const current = getStock(adjProductId, adjLocationId);
    const newQty = Number(adjNewQty);

    const { error: logError } = await supabase.from("stock_adjustments").insert({
      product_id: adjProductId,
      location_id: adjLocationId,
      previous_cartons: current,
      new_cartons: newQty,
      reason: adjReason.trim(),
      adjusted_by: user!.id,
    });

    if (logError) { toast.error("Failed to log adjustment"); return; }

    await supabase.from("stock").upsert({
      product_id: adjProductId,
      location_id: adjLocationId,
      cartons: newQty,
    }, { onConflict: "product_id,location_id" });

    toast.success(`Stock adjusted: ${current} → ${newQty} cartons`);
    setAdjustOpen(false);
    setAdjProductId(""); setAdjLocationId(""); setAdjNewQty(""); setAdjReason("");
    await refreshData();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">
            {isShopStaff ? "Your shop's carton inventory" : "Carton inventory by shop"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isShopStaff && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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

      {/* Render a table per shop */}
      {filteredShops.map(shop => {
        const shopProducts = activeProducts.filter(p => {
          const s = stock.find(st => st.product_id === p.id && st.location_id === shop.id);
          return s && s.cartons > 0 || sales.some(sa => sa.location_id === shop.id && sa.items.some(i => i.product_id === p.id));
        });
        // Show all active products for better visibility
        const displayProducts = activeProducts;

        return (
          <div key={shop.id} className="mb-8">
            {!isShopStaff && (
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
                <h2 className="font-display text-base font-semibold text-foreground">{shop.name}</h2>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Opening Stock</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Added</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total Stock</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price/Ctn</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Sale (ctns)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sale Price</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map(p => {
                    const data = getShopProductData(p.id, shop.id);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-center text-foreground">{data.openingStock}</td>
                        <td className="px-4 py-3 text-center text-foreground">{data.addedStock}</td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{data.totalStock}</td>
                        <td className="px-4 py-3 text-right text-foreground">{fmt(data.price)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${data.saleCartons > 0 ? "text-success" : "text-muted-foreground"}`}>
                            {data.saleCartons}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(data.salePrice)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            data.balanceStock === 0 ? "text-destructive" :
                            data.balanceStock < 10 ? "text-warning" : "text-foreground"
                          }`}>
                            {data.balanceStock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filteredShops.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-muted-foreground">
          No shops found
        </div>
      )}
    </div>
  );
};

export default Stock;
