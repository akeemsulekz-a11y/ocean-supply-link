import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, CheckCircle, Package, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { sendNotification } from "@/hooks/useNotifications";
import MultiStepSaleForm from "@/components/MultiStepSaleForm";

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
  const { products, locations } = useStore();
  const navigate = useNavigate();
  const paymentDetails = usePaymentSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<{ id: string; approved: boolean } | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const store = locations.find(l => l.type === "store");

  useEffect(() => {
    const fetchData = async () => {
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

  const handleCreateOrder = async (data: { customer_name: string; items: any[]; total_amount: number }) => {
    if (!customer || !customer.approved) { toast.error("Your account is pending approval"); return; }

    const { data: orderData, error } = await supabase
      .from("orders").insert({ customer_id: customer.id, total_amount: data.total_amount, status: "pending" as any }).select("id").single();
    if (error || !orderData) { toast.error("Failed to place order"); return; }

    await supabase.from("order_items").insert(
      data.items.map((i: any) => ({ order_id: orderData.id, product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton }))
    );

    await sendNotification({
      type: "new_order",
      title: "New Order Placed",
      message: `${profile?.full_name ?? "Customer"} placed an order for ${fmt(data.total_amount)}`,
      target_roles: ["admin", "store_staff"],
      reference_id: orderData.id,
    });

    toast.success("Order placed!");
    // Refresh orders
    const { data: custData } = await supabase.from("customers").select("id").eq("user_id", user?.id).maybeSingle();
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
      }
    }
    return orderData.id;
  };

  if (showOrderForm) {
    if (!store) {
      return (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          <p>No main store location found. Please contact admin.</p>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto">
        <MultiStepSaleForm
          locationId={store.id}
          onClose={() => setShowOrderForm(false)}
          onComplete={handleCreateOrder}
          mode="order"
          customerName={profile?.full_name ?? "Customer"}
          paymentDetails={paymentDetails}
        />
      </div>
    );
  }

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
          <Button size="lg" onClick={() => setShowOrderForm(true)} className="gap-2">
            <Plus className="h-5 w-5" />
            Place New Order
          </Button>
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
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
