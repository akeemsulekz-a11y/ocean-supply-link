import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Check, X, Eye, Package, Receipt } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface OrderItem {
  id: string;
  product_id: string;
  cartons: number;
  price_per_carton: number;
}

interface Order {
  id: string;
  customer_id: string;
  status: "pending" | "approved" | "fulfilled" | "rejected";
  total_amount: number;
  created_at: string;
  approved_by: string | null;
  items: OrderItem[];
  customer_name?: string;
}

const Orders = () => {
  const { user, role } = useAuth();
  const { products, locations, getStock, refreshData } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create order (customer)
  const [createOpen, setCreateOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ product_id: string; cartons: number; price_per_carton: number }[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("");

  // View order
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const activeProducts = products.filter(p => p.active);
  const store = locations.find(l => l.type === "store");
  const isCustomer = !role; // customers don't have a role in user_roles
  const isStaff = role === "admin" || role === "store_staff";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersData && ordersData.length > 0) {
      const ids = ordersData.map(o => o.id);
      const custIds = [...new Set(ordersData.map(o => o.customer_id))];
      
      const [itemsRes, custRes] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", ids),
        supabase.from("customers").select("id, name").in("id", custIds),
      ]);

      const withItems = ordersData.map(o => ({
        ...o,
        items: (itemsRes.data ?? []).filter((i: any) => i.order_id === o.id) as OrderItem[],
        customer_name: (custRes.data ?? []).find((c: any) => c.id === o.customer_id)?.name ?? "Unknown",
      })) as Order[];
      setOrders(withItems);
    } else {
      setOrders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  // Customer: create order
  const addItem = () => {
    if (!selProduct || !selQty || Number(selQty) <= 0) return;
    const prod = products.find(p => p.id === selProduct);
    if (!prod) return;
    if (orderItems.some(i => i.product_id === selProduct)) { toast.error("Already added"); return; }
    setOrderItems(prev => [...prev, { product_id: selProduct, cartons: Number(selQty), price_per_carton: prod.price_per_carton }]);
    setSelProduct(""); setSelQty("");
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) { toast.error("Add items"); return; }

    // Get customer record
    const { data: custData } = await supabase
      .from("customers")
      .select("id, approved")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!custData) { toast.error("Customer profile not found. Please contact admin."); return; }
    if (!custData.approved) { toast.error("Your account is pending approval."); return; }

    const total = orderItems.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);
    const { data: orderData, error } = await supabase
      .from("orders")
      .insert({ customer_id: custData.id, total_amount: total, status: "pending" as any })
      .select("id")
      .single();

    if (error || !orderData) { toast.error("Failed to create order"); return; }

    await supabase.from("order_items").insert(
      orderItems.map(i => ({ order_id: orderData.id, product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton }))
    );

    toast.success("Order placed successfully!");
    setCreateOpen(false); setOrderItems([]);
    await fetchOrders();
  };

  // Staff: approve order
  const handleApprove = async (order: Order) => {
    await supabase.from("orders").update({ status: "approved" as any, approved_by: user?.id }).eq("id", order.id);
    toast.success("Order approved!");
    await fetchOrders();
  };

  // Staff: reject order
  const handleReject = async (order: Order) => {
    await supabase.from("orders").update({ status: "rejected" as any }).eq("id", order.id);
    toast.warning("Order rejected.");
    await fetchOrders();
  };

  // Staff: fulfill order (deduct stock, create sale)
  const handleFulfill = async (order: Order) => {
    if (!store) { toast.error("No store location found"); return; }

    // Check stock availability
    for (const item of order.items) {
      const avail = getStock(item.product_id, store.id);
      if (avail < item.cartons) {
        const prod = products.find(p => p.id === item.product_id);
        toast.error(`Not enough stock for ${prod?.name}. Available: ${avail}`);
        return;
      }
    }

    // Deduct stock from store
    for (const item of order.items) {
      const current = getStock(item.product_id, store.id);
      await supabase.from("stock").upsert({
        product_id: item.product_id,
        location_id: store.id,
        cartons: Math.max(0, current - item.cartons),
      }, { onConflict: "product_id,location_id" });
    }

    // Create sale record
    const receiptNum = `ORD-${order.id.slice(-6).toUpperCase()}`;
    await supabase.from("sales").insert({
      location_id: store.id,
      customer_name: order.customer_name ?? "Online Customer",
      total_amount: order.total_amount,
      created_by: user?.id,
      receipt_number: receiptNum,
    });

    // Update order status
    await supabase.from("orders").update({ status: "fulfilled" as any }).eq("id", order.id);

    toast.success("Order fulfilled! Stock deducted & sale recorded.");
    await Promise.all([fetchOrders(), refreshData()]);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-warning/10 text-warning";
      case "approved": return "bg-info/10 text-info";
      case "fulfilled": return "bg-success/10 text-success";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const orderTotal = orderItems.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{isCustomer ? "Place and track your wholesale orders" : "Manage customer orders"}</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {isCustomer && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Order</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Place Order</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Products</p>
                    <div className="flex gap-2">
                      <Select value={selProduct} onValueChange={setSelProduct}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.price_per_carton)}/ctn</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input value={selQty} onChange={e => setSelQty(e.target.value)} type="number" placeholder="Qty" className="w-20" />
                      <Button variant="secondary" onClick={addItem}>Add</Button>
                    </div>
                    {orderItems.length > 0 && (
                      <div className="space-y-1">
                        {orderItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.product_id);
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                              <span className="text-foreground">{prod?.name} × {item.cartons} ctns</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
                                <button onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex justify-between pt-2 border-t border-border text-sm font-bold text-foreground">
                          <span>Total</span><span>{fmt(orderTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleCreateOrder} disabled={orderItems.length === 0}>
                    Place Order — {fmt(orderTotal)}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Orders list */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
              {isStaff && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>}
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</td>
                {isStaff && <td className="px-4 py-3 font-medium text-foreground">{order.customer_name}</td>}
                <td className="px-4 py-3 text-center text-foreground">{order.items.length}</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(order.total_amount)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(order.status)}`}>{order.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setViewOpen(true); setShowReceipt(false); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isStaff && order.status === "pending" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(order)} className="text-success hover:text-success">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleReject(order)} className="text-destructive hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isStaff && order.status === "approved" && (
                      <Button variant="ghost" size="sm" onClick={() => handleFulfill(order)} className="text-primary hover:text-primary">
                        <Package className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === "fulfilled" && (
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setShowReceipt(true); setViewOpen(true); }}>
                        <Receipt className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan={isStaff ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View / Receipt dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{showReceipt ? "Order Receipt" : "Order Details"}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm" id="receipt-content">
              {showReceipt && (
                <div className="text-center border-b border-border pb-3">
                  <p className="font-display font-bold text-foreground">OceanGush International</p>
                  <p className="text-xs text-muted-foreground">Order Receipt</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Order:</span> <span className="font-mono text-foreground">#{selectedOrder.id.slice(-6).toUpperCase()}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className={`capitalize font-semibold ${selectedOrder.status === "fulfilled" ? "text-success" : "text-foreground"}`}>{selectedOrder.status}</span></div>
                {selectedOrder.customer_name && (
                  <div className="col-span-2"><span className="text-muted-foreground">Customer:</span> <span className="font-medium text-foreground">{selectedOrder.customer_name}</span></div>
                )}
                <div className="col-span-2"><span className="text-muted-foreground">Date:</span> <span className="text-foreground">{new Date(selectedOrder.created_at).toLocaleString("en-GB")}</span></div>
              </div>
              <div className="space-y-1 border-t border-border pt-2">
                {selectedOrder.items.map((item, i) => {
                  const prod = products.find(p => p.id === item.product_id);
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-foreground">{prod?.name} × {item.cartons} ctns</span>
                      <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                <span>Total</span><span>{fmt(selectedOrder.total_amount)}</span>
              </div>
              {showReceipt && (
                <Button variant="outline" className="w-full" onClick={() => window.print()}>Print Receipt</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
