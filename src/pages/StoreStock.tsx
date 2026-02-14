import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Save, X, Download, Printer, AlertTriangle, History } from "lucide-react";
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

interface StockAdjustment {
  id: string;
  product_id: string;
  location_id: string;
  previous_cartons: number;
  new_cartons: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

const StoreStock = () => {
  const { products, locations, stock, sales, getStock, refreshData } = useStore();
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [yesterdaySnapshots, setYesterdaySnapshots] = useState<SnapshotRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, { opening: number; added: number; sold: number; closing: number }>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const canAdjust = role === "admin" || role === "store_staff";
  const activeProducts = products.filter(p => p.active);
  const store = locations.find(l => l.type === "store");
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const fetchSnapshots = useCallback(async () => {
    if (!store) return;
    const yesterday = new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split("T")[0];
    const [todayRes, yesterdayRes] = await Promise.all([
      supabase
        .from("daily_stock_snapshots")
        .select("product_id, location_id, opening_cartons, added_cartons, sold_cartons, closing_cartons")
        .eq("snapshot_date", selectedDate)
        .eq("location_id", store.id),
      supabase
        .from("daily_stock_snapshots")
        .select("product_id, location_id, opening_cartons, added_cartons, sold_cartons, closing_cartons")
        .eq("snapshot_date", yesterday)
        .eq("location_id", store.id),
    ]);
    setSnapshots((todayRes.data as SnapshotRow[]) ?? []);
    setYesterdaySnapshots((yesterdayRes.data as SnapshotRow[]) ?? []);
  }, [selectedDate, store?.id]);

  const fetchAdjustments = useCallback(async () => {
    if (!store) return;
    const { data } = await supabase
      .from("stock_adjustments")
      .select("*")
      .eq("location_id", store.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setAdjustments((data as StockAdjustment[]) ?? []);
  }, [store?.id]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);
  useEffect(() => { if (showHistory) fetchAdjustments(); }, [showHistory, fetchAdjustments]);

  const getRowData = (productId: string) => {
    if (!store) return { opening: 0, added: 0, total: 0, sold: 0, closing: 0 };
    const snap = snapshots.find(s => s.product_id === productId && s.location_id === store.id);
    if (snap) {
      return {
        opening: snap.opening_cartons,
        added: snap.added_cartons,
        total: snap.opening_cartons + snap.added_cartons,
        sold: snap.sold_cartons,
        closing: snap.closing_cartons,
      };
    }
    const yesterdaySnap = yesterdaySnapshots.find(s => s.product_id === productId && s.location_id === store.id);
    const opening = yesterdaySnap ? yesterdaySnap.closing_cartons : getStock(productId, store.id);
    if (isToday) {
      const today = new Date().toDateString();
      const todaySold = sales
        .filter(s => s.location_id === store.id && new Date(s.created_at).toDateString() === today)
        .reduce((sum, s) => {
          const item = s.items.find(i => i.product_id === productId);
          return sum + (item ? item.cartons : 0);
        }, 0);
      const currentStock = getStock(productId, store.id);
      const added = Math.max(0, currentStock + todaySold - opening);
      return { opening, added, total: opening + added, sold: todaySold, closing: currentStock };
    }
    return { opening: 0, added: 0, total: 0, sold: 0, closing: 0 };
  };

  const enterEditMode = () => {
    const data: typeof editData = {};
    activeProducts.forEach(p => {
      const row = getRowData(p.id);
      data[p.id] = { opening: row.opening, added: row.added, sold: row.sold, closing: row.closing };
    });
    setEditData(data);
    setEditMode(true);
  };

  const updateCell = (productId: string, field: "opening" | "added" | "sold" | "closing", value: number) => {
    setEditData(prev => {
      const row = prev[productId] ?? { opening: 0, added: 0, sold: 0, closing: 0 };
      const newRow = { ...row, [field]: value };
      if (field !== "closing") {
        newRow.closing = newRow.opening + newRow.added - newRow.sold;
      }
      return { ...prev, [productId]: newRow };
    });
  };

  const handleSave = async () => {
    if (!store) return;
    const upserts: any[] = [];
    const stockUpdates: any[] = [];

    for (const [productId, row] of Object.entries(editData)) {
      upserts.push({
        product_id: productId,
        location_id: store.id,
        snapshot_date: selectedDate,
        opening_cartons: row.opening,
        added_cartons: row.added,
        sold_cartons: row.sold,
        closing_cartons: row.closing,
      });
      if (isToday) {
        stockUpdates.push({ product_id: productId, location_id: store.id, cartons: row.closing });
      }
    }

    for (const u of upserts) {
      await supabase.from("daily_stock_snapshots").upsert(u, { onConflict: "product_id,location_id,snapshot_date" });
    }
    for (const s of stockUpdates) {
      await supabase.from("stock").upsert(s, { onConflict: "product_id,location_id" });
    }

    toast.success("Store stock data saved!");
    setEditMode(false);
    await Promise.all([fetchSnapshots(), refreshData()]);
  };

  const handleManualAdjust = async () => {
    if (!store || !adjustProduct || !adjustQty || !adjustReason.trim()) {
      toast.error("Fill all fields"); return;
    }
    const prev = getStock(adjustProduct, store.id);
    const newQty = Number(adjustQty);

    await supabase.from("stock_adjustments").insert({
      product_id: adjustProduct,
      location_id: store.id,
      previous_cartons: prev,
      new_cartons: newQty,
      reason: adjustReason,
      adjusted_by: user?.id ?? "",
    });

    await supabase.from("stock").upsert(
      { product_id: adjustProduct, location_id: store.id, cartons: newQty },
      { onConflict: "product_id,location_id" }
    );

    toast.success("Store stock adjusted");
    setAdjustOpen(false);
    setAdjustProduct(""); setAdjustQty(""); setAdjustReason("");
    await Promise.all([fetchSnapshots(), refreshData(), fetchAdjustments()]);
  };

  const exportCSV = () => {
    if (!store) return;
    let csv = "Product,Opening,Added,Total,Price/Ctn,Sold,Sale Value,Balance\n";
    activeProducts.forEach(p => {
      const data = getRowData(p.id);
      csv += `"${p.name}",${data.opening},${data.added},${data.total},${p.price_per_carton},${data.sold},${data.sold * p.price_per_carton},${data.closing}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `store-stock-${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!store) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-muted-foreground">
        No store location found. Please create a store location first.
      </div>
    );
  }

  // Adjustment History View
  if (showHistory) {
    return (
      <div>
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Store Adjustment History</h1>
            <p className="page-subtitle">Audit log of store stock changes</p>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(false)}>← Back to Store Stock</Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Previous</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">New</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Change</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(adj => {
                const prod = products.find(p => p.id === adj.product_id);
                const diff = adj.new_cartons - adj.previous_cartons;
                return (
                  <tr key={adj.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(adj.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{prod?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{adj.previous_cartons}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{adj.new_cartons}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        diff > 0 ? "bg-success/10 text-success" : diff < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">{adj.reason}</td>
                  </tr>
                );
              })}
              {adjustments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No adjustments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Store Stock</h1>
          <p className="page-subtitle">Main store inventory — {store.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setEditMode(false); }}
            className="w-40"
          />
          {canAdjust && !editMode && (
            <>
              <Button variant="outline" onClick={enterEditMode}>
                <Settings2 className="mr-2 h-4 w-4" />Adjust
              </Button>
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <AlertTriangle className="mr-2 h-4 w-4" />Manual Adjust
              </Button>
              <Button variant="outline" onClick={() => setShowHistory(true)}>
                <History className="mr-2 h-4 w-4" />History
              </Button>
            </>
          )}
          {editMode && (
            <>
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </>
          )}
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="font-bold text-lg">OceanGush International Services</h2>
        <p className="text-sm">Store Stock Report — {new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card print:border print:rounded-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Opening</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Added</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price/Ctn</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Dispatched</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map(p => {
              const row = editMode && editData[p.id] ? editData[p.id] : null;
              const data = row
                ? { opening: row.opening, added: row.added, total: row.opening + row.added, sold: row.sold, closing: row.closing }
                : getRowData(p.id);

              if (editMode && row) {
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                    <td className="px-2 py-2">
                      <Input type="number" value={row.opening} onChange={e => updateCell(p.id, "opening", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" value={row.added} onChange={e => updateCell(p.id, "added", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                    </td>
                    <td className="px-4 py-2 text-center font-semibold text-foreground">{row.opening + row.added}</td>
                    <td className="px-4 py-2 text-right text-foreground">{fmt(p.price_per_carton)}</td>
                    <td className="px-2 py-2">
                      <Input type="number" value={row.sold} onChange={e => updateCell(p.id, "sold", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground">{fmt(row.sold * p.price_per_carton)}</td>
                    <td className="px-2 py-2">
                      <Input type="number" value={row.closing} onChange={e => updateCell(p.id, "closing", Number(e.target.value))} className="h-8 w-20 mx-auto text-center" />
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
                const row = editMode && editData[p.id] ? editData[p.id] : null;
                const data = row
                  ? { opening: row.opening, added: row.added, total: row.opening + row.added, sold: row.sold, closing: row.closing }
                  : getRowData(p.id);
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

      {/* Manual Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Store Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Product</label>
              <Select value={adjustProduct} onValueChange={setAdjustProduct}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {activeProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (current: {getStock(p.id, store.id)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">New Quantity (cartons)</label>
              <Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="mt-1" placeholder="e.g. 100" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Reason *</label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="mt-1" placeholder="e.g. New shipment received, counted 100 cartons..." rows={3} />
            </div>
            <Button className="w-full" onClick={handleManualAdjust}>Submit Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreStock;
