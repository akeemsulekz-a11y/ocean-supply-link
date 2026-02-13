import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Clock, CheckCircle, Package, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: { product_id: string; cartons: number; price_per_carton: number }[];
}

const CustomerDashboard = () => {
  const { user, profile } = useAuth();
  const { products } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<{ id: string; approved: boolean } | null>(null);

  // Create order
  const [createOpen, setCreateOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ product_id: string; cartons: number; price_per_carton: number }[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("");

  const activeProducts = products.filter(p => p.active);

  useEffect(() => {
    const fetchData = async () => {
      // Get customer record
      const { data: custData } = await supabase
        .from("customers").select("id, approved").eq("user_id", user?.id).maybeSingle();
      setCustomer(custData);

      if (custData) {
        const { data: ordersData } = await supabase
          .from("orders").select("id, status, total_amount, created_at").eq("customer_id", custData.id).order("created_at", { ascending: false }).limit(50);

        if (ordersData && ordersData.length > 0) {
          const ids = ordersData.map(o => o.id);
          const { data: itemsData } = await supabase.from("order_items").select("order_id, product_id, cartons, price_per_carton").in("order_id", ids);
          setOrders(ordersData.map(o => ({
            ...o,
            items: (itemsData ?? []).filter((i: any) => i.order_id === o.id).map((i: any) => ({
              product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton,
            })),
          })) as Order[]);
        } else {
          setOrders([]);
        }
      }
    };
    if (user) fetchData();
  }, [user]);

  const pending = orders.filter(o => o.status === "pending").length;
  const approved = orders.filter(o => o.status === "approved").length;
  const fulfilled = orders.filter(o => o.status === "fulfilled").length;
  const rejected = orders.filter(o => o.status === "rejected").length;

  const stats = [
    { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "text-primary" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approved, icon: Package, color: "text-info" },
    { label: "Fulfilled", value: fulfilled, icon: CheckCircle, color: "text-success" },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-warning/10 text-warning";
      case "approved": return "bg-info/10 text-info";
      case "fulfilled": return "bg-success/10 text-success";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const addItem = () => {
    if (!selProduct || !selQty || Number(selQty) <= 0) return;
    const prod = products.find(p => p.id === selProduct);
    if (!prod) return;
    if (orderItems.some(i => i.product_id === selProduct)) { toast.error("Already added"); return; }
    setOrderItems(prev => [...prev, { product_id: selProduct, cartons: Number(selQty), price_per_carton: prod.price_per_carton }]);
    setSelProduct(""); setSelQty("");
  };

  const orderTotal = orderItems.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);

  const handleCreateOrder = async () => {
    if (!customer || !customer.approved) { toast.error("Your account is pending approval"); return; }
    if (orderItems.length === 0) { toast.error("Add items"); return; }

    const { data: orderData, error } = await supabase
      .from("orders").insert({ customer_id: customer.id, total_amount: orderTotal, status: "pending" as any }).select("id").single();
    if (error || !orderData) { toast.error("Failed to place order"); return; }

    await supabase.from("order_items").insert(
      orderItems.map(i => ({ order_id: orderData.id, product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton }))
    );

    toast.success("Order placed!");
    setCreateOpen(false); setOrderItems([]);
    // Refresh
    window.location.reload();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome, {profile?.full_name ?? "Customer"}</h1>
          <p className="page-subtitle">
            {customer?.approved ? "Your wholesale order dashboard" : "⏳ Account pending approval. Contact admin."}
          </p>
        </div>
        {customer?.approved && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Place Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Place New Order</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products</p>
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
                            <span className="text-foreground">{prod?.name} × {item.cartons}</span>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">My Orders</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{o.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-center text-foreground">{o.items.length}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(o.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No orders yet. Place your first order!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
