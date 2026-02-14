import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Eye, Package, Printer, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { sendNotification } from "@/hooks/useNotifications";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

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
  const navigate = useNavigate();
  const paymentDetails = usePaymentSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const isCustomer = !role;
  const isStaff = role === "admin" || role === "store_staff";
  const store = locations.find(l => l.type === "store");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from("orders").select("*").order("created_at", { ascending: false });

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

  const handleCreateOrder = async (data: { customer_name: string; items: any[]; total_amount: number }) => {
    const { data: custData } = await supabase
      .from("customers").select("id, approved").eq("user_id", user?.id).maybeSingle();
    if (!custData) { toast.error("Customer profile not found."); return; }
    if (!custData.approved) { toast.error("Account pending approval."); return; }

    const { data: orderData, error } = await supabase
      .from("orders").insert({ customer_id: custData.id, total_amount: data.total_amount, status: "pending" as any }).select("id").single();
    if (error || !orderData) { toast.error("Failed to create order"); return; }

    await supabase.from("order_items").insert(
      data.items.map((i: any) => ({ order_id: orderData.id, product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton }))
    );

    await sendNotification({
      type: "new_order",
      title: "New Order Placed",
      message: `${data.customer_name} placed an order for ${fmt(data.total_amount)}`,
      target_roles: ["admin", "store_staff"],
      reference_id: orderData.id,
    });

    toast.success("Order placed!");
    await fetchOrders();
    return orderData.id;
  };

  const handleApprove = async (order: Order) => {
    await supabase.from("orders").update({ status: "approved" as any, approved_by: user?.id }).eq("id", order.id);
    toast.success("Order approved!");
    await fetchOrders();
  };

  const handleReject = async (order: Order) => {
    await supabase.from("orders").update({ status: "rejected" as any }).eq("id", order.id);
    toast.warning("Order rejected.");
    await fetchOrders();
  };

  const handleFulfill = async (order: Order) => {
    if (!store) { toast.error("No store location found"); return; }
    for (const item of order.items) {
      const avail = getStock(item.product_id, store.id);
      if (avail < item.cartons) {
        const prod = products.find(p => p.id === item.product_id);
        toast.error(`Not enough stock for ${prod?.name}. Available: ${avail}`);
        return;
      }
    }
    for (const item of order.items) {
      const current = getStock(item.product_id, store.id);
      await supabase.from("stock").upsert({ product_id: item.product_id, location_id: store.id, cartons: Math.max(0, current - item.cartons) }, { onConflict: "product_id,location_id" });
    }
    const receiptNum = `ORD-${order.id.slice(-6).toUpperCase()}`;
    await supabase.from("sales").insert({ location_id: store.id, customer_name: order.customer_name ?? "Online Customer", total_amount: order.total_amount, created_by: user?.id, receipt_number: receiptNum });
    await supabase.from("orders").update({ status: "fulfilled" as any }).eq("id", order.id);
    toast.success("Order fulfilled!");
    await Promise.all([fetchOrders(), refreshData()]);
  };

  const openReceipt = (order: Order) => {
    const itemsData = order.items.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      return { name: prod?.name ?? "Unknown", cartons: i.cartons, price_per_carton: i.price_per_carton };
    });
    const params = new URLSearchParams({
      type: "order",
      receipt: order.id.slice(-6).toUpperCase(),
      date: order.created_at,
      customer: order.customer_name ?? "",
      total: order.total_amount.toString(),
      items: encodeURIComponent(JSON.stringify(itemsData)),
    });
    navigate(`/print?${params.toString()}`);
  };

  if (showOrderForm && isCustomer) {
    const storeId = store?.id ?? "";
    return (
      <div className="max-w-2xl mx-auto">
        <MultiStepSaleForm
          locationId={storeId}
          onClose={() => setShowOrderForm(false)}
          onComplete={handleCreateOrder}
          mode="order"
          paymentDetails={paymentDetails}
        />
      </div>
    );
  }

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
            <Button onClick={() => setShowOrderForm(true)}>New Order</Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Order ID</th>
              {isStaff && <th className="text-left">Customer</th>}
              <th className="text-center">Items</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Status</th>
              <th className="text-right">Date</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const statusClass = order.status === "pending" ? "badge-warning" : order.status === "approved" ? "badge-info" : order.status === "fulfilled" ? "badge-success" : "badge-destructive";
              return (
                <tr key={order.id}>
                  <td className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</td>
                  {isStaff && <td className="font-medium text-foreground">{order.customer_name}</td>}
                  <td className="text-center text-foreground">{order.items.length}</td>
                  <td className="text-right font-semibold text-foreground">{fmt(order.total_amount)}</td>
                  <td className="text-center">
                    <span className={`badge ${statusClass}`}>{order.status}</span>
                  </td>
                  <td className="text-right text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setViewOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isStaff && order.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleApprove(order)} className="text-success hover:text-success"><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReject(order)} className="text-destructive hover:text-destructive"><X className="h-4 w-4" /></Button>
                        </>
                      )}
                      {isStaff && order.status === "approved" && (
                        <Button variant="ghost" size="sm" onClick={() => handleFulfill(order)} className="text-primary hover:text-primary"><Package className="h-4 w-4" /></Button>
                      )}
                      {order.status === "fulfilled" && (
                        <Button variant="ghost" size="sm" onClick={() => openReceipt(order)}><Printer className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr><td colSpan={isStaff ? 7 : 6}>
                <div className="empty-state">
                  <ClipboardList className="empty-state-icon" />
                  <p className="empty-state-text">No orders found</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View order details */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order Details
              {selectedOrder && (
                <span className={`badge ${selectedOrder.status === "pending" ? "badge-warning" : selectedOrder.status === "approved" ? "badge-info" : selectedOrder.status === "fulfilled" ? "badge-success" : "badge-destructive"}`}>{selectedOrder.status}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Order</span><p className="font-mono text-foreground font-medium mt-0.5">#{selectedOrder.id.slice(-6).toUpperCase()}</p></div>
                {selectedOrder.customer_name && <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Customer</span><p className="font-medium text-foreground mt-0.5">{selectedOrder.customer_name}</p></div>}
                <div className="col-span-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">Date</span><p className="text-foreground mt-0.5">{new Date(selectedOrder.created_at).toLocaleString("en-GB")}</p></div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
                {selectedOrder.items.map((item, i) => {
                  const prod = products.find(p => p.id === item.product_id);
                  return (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-foreground">{prod?.name} × {item.cartons} ctns</span>
                      <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-bold text-foreground text-base">
                <span>Total</span><span>{fmt(selectedOrder.total_amount)}</span>
              </div>
              {selectedOrder.status === "fulfilled" && (
                <Button variant="outline" className="w-full" onClick={() => { setViewOpen(false); openReceipt(selectedOrder); }}>
                  View & Print Receipt
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
