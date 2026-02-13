import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Save, X, Printer } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface SnapshotRow {
  product_id: string;
  location_id: string;
  opening_cartons: number;
  added_cartons: number;
  sold_cartons: number;
  closing_cartons: number;
}

const Stock = () => {
  const { products, locations, stock, sales, getStock, refreshData } = useStore();
  const { user, role, locationId: myLocationId } = useAuth();
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, Record<string, { opening: number; added: number; sold: number; closing: number }>>>({});

  const isShopStaff = role === "shop_staff";
  const canAdjust = role === "admin" || role === "store_staff";
  const activeProducts = products.filter(p => p.active);

  const visibleLocations = isShopStaff && myLocationId
    ? locations.filter(l => l.id === myLocationId)
    : locations;

  const shops = visibleLocations.filter(l => l.type === "shop");
  const filteredShops = filter === "all" ? shops : shops.filter(l => l.id === filter);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Fetch snapshots for selected date
  const fetchSnapshots = useCallback(async () => {
    const { data } = await supabase
      .from("daily_stock_snapshots")
      .select("product_id, location_id, opening_cartons, added_cartons, sold_cartons, closing_cartons")
      .eq("snapshot_date", selectedDate);
    setSnapshots((data as SnapshotRow[]) ?? []);
  }, [selectedDate]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  // Get snapshot or compute live data for today
  const getRowData = (productId: string, locId: string) => {
    const snap = snapshots.find(s => s.product_id === productId && s.location_id === locId);
    if (snap) {
      return {
        opening: snap.opening_cartons,
        added: snap.added_cartons,
        total: snap.opening_cartons + snap.added_cartons,
        sold: snap.sold_cartons,
        closing: snap.closing_cartons,
      };
    }

    if (isToday) {
      // Compute from live data
      const currentStock = getStock(productId, locId);
      const today = new Date().toDateString();
      const todaySold = sales
        .filter(s => s.location_id === locId && new Date(s.created_at).toDateString() === today)
        .reduce((sum, s) => {
          const item = s.items.find(i => i.product_id === productId);
          return sum + (item ? item.cartons : 0);
        }, 0);
      const opening = currentStock + todaySold; // approximation
      return { opening, added: 0, total: opening, sold: todaySold, closing: currentStock };
    }

    return { opening: 0, added: 0, total: 0, sold: 0, closing: 0 };
  };

  // Enter edit mode - populate editData from current values
  const enterEditMode = () => {
    const data: typeof editData = {};
    filteredShops.forEach(shop => {
      data[shop.id] = {};
      activeProducts.forEach(p => {
        const row = getRowData(p.id, shop.id);
        data[shop.id][p.id] = { opening: row.opening, added: row.added, sold: row.sold, closing: row.closing };
      });
    });
    setEditData(data);
    setEditMode(true);
  };

  const updateCell = (shopId: string, productId: string, field: "opening" | "added" | "sold" | "closing", value: number) => {
    setEditData(prev => {
      const updated = { ...prev };
      if (!updated[shopId]) updated[shopId] = {};
      const row = updated[shopId][productId] ?? { opening: 0, added: 0, sold: 0, closing: 0 };
      const newRow = { ...row, [field]: value };
      // Auto-calculate closing = opening + added - sold
      if (field !== "closing") {
        newRow.closing = newRow.opening + newRow.added - newRow.sold;
      }
      updated[shopId] = { ...updated[shopId], [productId]: newRow };
      return updated;
    });
  };

  const handleSave = async () => {
    const upserts: any[] = [];
    const stockUpdates: any[] = [];

    for (const [shopId, products_map] of Object.entries(editData)) {
      for (const [productId, row] of Object.entries(products_map)) {
        upserts.push({
          product_id: productId,
          location_id: shopId,
          snapshot_date: selectedDate,
          opening_cartons: row.opening,
          added_cartons: row.added,
          sold_cartons: row.sold,
          closing_cartons: row.closing,
        });
        // If today, also update actual stock to match closing
        if (isToday) {
          stockUpdates.push({
            product_id: productId,
            location_id: shopId,
            cartons: row.closing,
          });
        }
      }
    }

    // Upsert snapshots
    for (const u of upserts) {
      await supabase.from("daily_stock_snapshots").upsert(u, { onConflict: "product_id,location_id,snapshot_date" });
    }

    // Update actual stock if today
    for (const s of stockUpdates) {
      await supabase.from("stock").upsert(s, { onConflict: "product_id,location_id" });
    }

    toast.success("Stock data saved!");
    setEditMode(false);
    await Promise.all([fetchSnapshots(), refreshData()]);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Daily Stock</h1>
          <p className="page-subtitle">
            {isShopStaff ? "Your shop's daily carton inventory" : "Daily carton inventory by shop"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setEditMode(false); }}
            className="w-40"
          />
          {!isShopStaff && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {canAdjust && !editMode && (
            <Button variant="outline" onClick={enterEditMode}>
              <Settings2 className="mr-2 h-4 w-4" />Adjust
            </Button>
          )}
          {editMode && (
            <>
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="font-bold text-lg">OceanGush International Services</h2>
        <p className="text-sm">Daily Stock Report — {new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {filteredShops.map(shop => {
        return (
          <div key={shop.id} className="mb-8">
            {!isShopStaff && (
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
                <h2 className="font-display text-base font-semibold text-foreground">{shop.name}</h2>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-border bg-card print:border print:rounded-none">
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
                  {activeProducts.map(p => {
                    const row = editMode && editData[shop.id]?.[p.id]
                      ? editData[shop.id][p.id]
                      : null;
                    const data = row
                      ? { opening: row.opening, added: row.added, total: row.opening + row.added, sold: row.sold, closing: row.closing }
                      : getRowData(p.id, shop.id);

                    if (editMode && row) {
                      return (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                          <td className="px-2 py-2">
                            <Input type="number" value={row.opening} onChange={e => updateCell(shop.id, p.id, "opening", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" value={row.added} onChange={e => updateCell(shop.id, p.id, "added", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                          </td>
                          <td className="px-4 py-2 text-center font-semibold text-foreground">{row.opening + row.added}</td>
                          <td className="px-4 py-2 text-right text-foreground">{fmt(p.price_per_carton)}</td>
                          <td className="px-2 py-2">
                            <Input type="number" value={row.sold} onChange={e => updateCell(shop.id, p.id, "sold", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-foreground">{fmt(row.sold * p.price_per_carton)}</td>
                          <td className="px-2 py-2">
                            <Input type="number" value={row.closing} onChange={e => updateCell(shop.id, p.id, "closing", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-center text-foreground">{data.opening}</td>
                        <td className="px-4 py-3 text-center text-foreground">{data.added}</td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{data.total}</td>
                        <td className="px-4 py-3 text-right text-foreground">{fmt(p.price_per_carton)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${data.sold > 0 ? "text-success" : "text-muted-foreground"}`}>{data.sold}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(data.sold * p.price_per_carton)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${data.closing === 0 ? "text-destructive" : data.closing < 10 ? "text-warning" : "text-foreground"}`}>
                            {data.closing}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  {(() => {
                    const totals = activeProducts.reduce((acc, p) => {
                      const row = editMode && editData[shop.id]?.[p.id] ? editData[shop.id][p.id] : null;
                      const data = row
                        ? { opening: row.opening, added: row.added, total: row.opening + row.added, sold: row.sold, closing: row.closing }
                        : getRowData(p.id, shop.id);
                      return {
                        opening: acc.opening + data.opening,
                        added: acc.added + data.added,
                        total: acc.total + data.total,
                        sold: acc.sold + data.sold,
                        salePrice: acc.salePrice + data.sold * p.price_per_carton,
                        closing: acc.closing + data.closing,
                      };
                    }, { opening: 0, added: 0, total: 0, sold: 0, salePrice: 0, closing: 0 });
                    return (
                      <tr className="bg-muted/50 font-semibold">
                        <td className="px-4 py-3 text-foreground">Total</td>
                        <td className="px-4 py-3 text-center text-foreground">{totals.opening}</td>
                        <td className="px-4 py-3 text-center text-foreground">{totals.added}</td>
                        <td className="px-4 py-3 text-center text-foreground">{totals.total}</td>
                        <td className="px-4 py-3 text-right text-foreground">—</td>
                        <td className="px-4 py-3 text-center text-foreground">{totals.sold}</td>
                        <td className="px-4 py-3 text-right text-foreground">{fmt(totals.salePrice)}</td>
                        <td className="px-4 py-3 text-center text-foreground">{totals.closing}</td>
                      </tr>
                    );
                  })()}
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
