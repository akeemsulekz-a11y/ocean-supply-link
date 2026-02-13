import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Check, AlertTriangle, Eye, Receipt, Printer } from "lucide-react";
import { toast } from "sonner";
import ReceiptDialog from "@/components/ReceiptDialog";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  sent_cartons: number;
  received_cartons: number;
  issue_note: string | null;
}

interface Transfer {
  id: string;
  from_location_id: string;
  to_location_id: string;
  status: "pending" | "accepted" | "disputed";
  created_by: string | null;
  accepted_by: string | null;
  resolved_by: string | null;
  created_at: string;
  items: TransferItem[];
}

interface NewTransferItem {
  product_id: string;
  sent_cartons: number;
}

const Supplies = () => {
  const { products, locations, getStock, refreshData } = useStore();
  const { user, role } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [toLocationId, setToLocationId] = useState("");
  const [newItems, setNewItems] = useState<NewTransferItem[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [responseItems, setResponseItems] = useState<{ id: string; received_cartons: number; issue_note: string }[]>([]);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTransfer, setReceiptTransfer] = useState<Transfer | null>(null);

  const store = locations.find(l => l.type === "store");
  const shops = locations.filter(l => l.type === "shop");
  const activeProducts = products.filter(p => p.active);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const { data: transfersData } = await supabase
      .from("transfers").select("*").order("created_at", { ascending: false });

    if (transfersData && transfersData.length > 0) {
      const ids = transfersData.map(t => t.id);
      const { data: itemsData } = await supabase.from("transfer_items").select("*").in("transfer_id", ids);
      const withItems = transfersData.map(t => ({
        ...t,
        items: (itemsData ?? []).filter(i => (i as any).transfer_id === t.id),
      })) as Transfer[];
      setTransfers(withItems);
    } else {
      setTransfers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const addItem = () => {
    if (!selProduct || !selQty || Number(selQty) <= 0) return;
    if (!store) return;
    if (newItems.some(i => i.product_id === selProduct)) { toast.error("Product already added"); return; }
    const available = getStock(selProduct, store.id);
    if (Number(selQty) > available) { toast.error(`Only ${available} cartons in store`); return; }
    setNewItems(prev => [...prev, { product_id: selProduct, sent_cartons: Number(selQty) }]);
    setSelProduct(""); setSelQty("");
  };

  const handleCreateSupply = async () => {
    if (!store || !toLocationId || newItems.length === 0) { toast.error("Select shop and add items"); return; }

    const { data: transferData, error } = await supabase.from("transfers").insert({
      from_location_id: store.id, to_location_id: toLocationId, status: "pending" as any, created_by: user?.id,
    }).select("id").single();

    if (error || !transferData) { toast.error("Failed to create supply"); return; }

    await supabase.from("transfer_items").insert(
      newItems.map(item => ({ transfer_id: transferData.id, product_id: item.product_id, sent_cartons: item.sent_cartons, received_cartons: 0 }))
    );

    for (const item of newItems) {
      const current = getStock(item.product_id, store.id);
      await supabase.from("stock").upsert({ product_id: item.product_id, location_id: store.id, cartons: Math.max(0, current - item.sent_cartons) }, { onConflict: "product_id,location_id" });
    }

    toast.success("Supply created!");
    setCreateOpen(false); setNewItems([]); setToLocationId("");
    await Promise.all([fetchTransfers(), refreshData()]);
  };

  const openTransfer = (t: Transfer) => {
    setSelectedTransfer(t);
    setResponseItems(t.items.map(i => ({ id: i.id, received_cartons: i.received_cartons || i.sent_cartons, issue_note: i.issue_note || "" })));
    setViewOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedTransfer) return;
    const allMatch = responseItems.every((ri, idx) => ri.received_cartons === selectedTransfer.items[idx].sent_cartons);

    if (allMatch) {
      await supabase.from("transfers").update({ status: "accepted" as any, accepted_by: user?.id }).eq("id", selectedTransfer.id);
      for (const item of selectedTransfer.items) {
        const current = getStock(item.product_id, selectedTransfer.to_location_id);
        await supabase.from("stock").upsert({ product_id: item.product_id, location_id: selectedTransfer.to_location_id, cartons: current + item.sent_cartons }, { onConflict: "product_id,location_id" });
      }
      toast.success("Supply accepted! Stock updated.");
    } else {
      await supabase.from("transfers").update({ status: "disputed" as any }).eq("id", selectedTransfer.id);
      for (const ri of responseItems) {
        await supabase.from("transfer_items").update({ received_cartons: ri.received_cartons, issue_note: ri.issue_note || null }).eq("id", ri.id);
      }
      toast.warning("Supply disputed. Awaiting resolution.");
    }
    setViewOpen(false);
    await Promise.all([fetchTransfers(), refreshData()]);
  };

  const handleResolve = async () => {
    if (!selectedTransfer) return;
    await supabase.from("transfers").update({ status: "accepted" as any, resolved_by: user?.id }).eq("id", selectedTransfer.id);

    for (const ri of responseItems) {
      const item = selectedTransfer.items.find(i => i.id === ri.id);
      if (!item) continue;
      const current = getStock(item.product_id, selectedTransfer.to_location_id);
      await supabase.from("stock").upsert({ product_id: item.product_id, location_id: selectedTransfer.to_location_id, cartons: current + ri.received_cartons }, { onConflict: "product_id,location_id" });
      const diff = item.sent_cartons - ri.received_cartons;
      if (diff > 0 && store) {
        const storeCurrent = getStock(item.product_id, store.id);
        await supabase.from("stock").upsert({ product_id: item.product_id, location_id: store.id, cartons: storeCurrent + diff }, { onConflict: "product_id,location_id" });
      }
    }
    toast.success("Dispute resolved! Stock adjusted.");
    setViewOpen(false);
    await Promise.all([fetchTransfers(), refreshData()]);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-warning/10 text-warning";
      case "accepted": return "bg-success/10 text-success";
      case "disputed": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const canCreate = role === "admin" || role === "store_staff";
  const canResolve = role === "admin" || role === "store_staff";

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Supplies</h1>
          <p className="page-subtitle">Store → Shop supply transfers with confirmation</p>
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Supply</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Supply Transfer</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">From</label>
                  <Input value={store?.name ?? "Main Store"} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">To Shop</label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select shop" /></SelectTrigger>
                    <SelectContent>{shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {toLocationId && store && (
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items to Supply</p>
                    <div className="flex gap-2">
                      <Select value={selProduct} onValueChange={setSelProduct}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {activeProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({getStock(p.id, store.id)} in store)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={selQty} onChange={e => setSelQty(e.target.value)} type="number" placeholder="Qty" className="w-20" />
                      <Button variant="secondary" onClick={addItem}>Add</Button>
                    </div>
                    {newItems.length > 0 && (
                      <div className="space-y-1">
                        {newItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.product_id);
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                              <span className="text-foreground">{prod?.name} × {item.sent_cartons} ctns</span>
                              <button onClick={() => setNewItems(prev => prev.filter((_, i) => i !== idx))} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <Button className="w-full" onClick={handleCreateSupply} disabled={!toLocationId || newItems.length === 0}>Create Supply</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Transfer list */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">To Shop</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => {
              const toLoc = locations.find(l => l.id === t.to_location_id);
              return (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{t.id.slice(-6)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{toLoc?.name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{t.items.length}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openTransfer(t)}><Eye className="h-4 w-4" /></Button>
                      {t.status === "accepted" && (
                        <Button variant="ghost" size="sm" onClick={() => { setReceiptTransfer(t); setReceiptOpen(true); }}>
                          <Receipt className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {transfers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No supplies yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View/Respond dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Supply Details
              {selectedTransfer && (
                <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(selectedTransfer.status)}`}>{selectedTransfer.status}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">From</p><p className="font-medium text-foreground">{locations.find(l => l.id === selectedTransfer.from_location_id)?.name}</p></div>
                <div><p className="text-muted-foreground">To</p><p className="font-medium text-foreground">{locations.find(l => l.id === selectedTransfer.to_location_id)?.name}</p></div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
                {selectedTransfer.items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.product_id);
                  const ri = responseItems[idx];
                  return (
                    <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{prod?.name}</span>
                        <span className="text-sm text-muted-foreground">Sent: {item.sent_cartons} ctns</span>
                      </div>
                      {selectedTransfer.status === "pending" && role === "shop_staff" && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Received cartons</label>
                          <Input type="number" value={ri?.received_cartons ?? item.sent_cartons}
                            onChange={e => setResponseItems(prev => prev.map((r, i) => i === idx ? { ...r, received_cartons: Number(e.target.value) } : r))} className="h-8" />
                          {ri && ri.received_cartons !== item.sent_cartons && (
                            <Textarea placeholder="Describe the issue..." value={ri.issue_note}
                              onChange={e => setResponseItems(prev => prev.map((r, i) => i === idx ? { ...r, issue_note: e.target.value } : r))} className="mt-1" rows={2} />
                          )}
                        </div>
                      )}
                      {selectedTransfer.status === "disputed" && (
                        <div className="text-sm space-y-1">
                          <p className="text-foreground">Received: <span className="font-semibold">{item.received_cartons}</span> ctns</p>
                          {item.issue_note && <p className="text-destructive text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {item.issue_note}</p>}
                          {canResolve && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Adjust received</label>
                              <Input type="number" value={ri?.received_cartons ?? item.received_cartons}
                                onChange={e => setResponseItems(prev => prev.map((r, i) => i === idx ? { ...r, received_cartons: Number(e.target.value) } : r))} className="h-8" />
                            </div>
                          )}
                        </div>
                      )}
                      {selectedTransfer.status === "accepted" && (
                        <p className="text-sm text-success flex items-center gap-1"><Check className="h-3 w-3" /> Received: {item.received_cartons || item.sent_cartons} ctns</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedTransfer.status === "pending" && role === "shop_staff" && (
                <Button className="w-full" onClick={handleAccept}>Confirm Receipt</Button>
              )}
              {selectedTransfer.status === "disputed" && canResolve && (
                <Button className="w-full" onClick={handleResolve}>Resolve & Accept</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Supply Receipt */}
      {receiptTransfer && (
        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          type="supply"
          receiptNumber={receiptTransfer.id.slice(-6).toUpperCase()}
          date={receiptTransfer.created_at}
          fromLocation={locations.find(l => l.id === receiptTransfer.from_location_id)?.name}
          toLocation={locations.find(l => l.id === receiptTransfer.to_location_id)?.name}
          items={receiptTransfer.items.map(i => {
            const prod = products.find(p => p.id === i.product_id);
            return { name: prod?.name ?? "Unknown", cartons: i.received_cartons || i.sent_cartons, price_per_carton: prod?.price_per_carton ?? 0 };
          })}
          total={receiptTransfer.items.reduce((s, i) => {
            const prod = products.find(p => p.id === i.product_id);
            return s + (i.received_cartons || i.sent_cartons) * (prod?.price_per_carton ?? 0);
          }, 0)}
        />
      )}
    </div>
  );
};

export default Supplies;
