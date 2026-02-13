import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Clock, CheckCircle, Package } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

const CustomerDashboard = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    supabase.from("orders").select("id, status, total_amount, created_at").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setOrders(data as Order[]); });
  }, []);

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome, {profile?.full_name ?? "Customer"}</h1>
        <p className="page-subtitle">Your wholesale order dashboard</p>
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

      {/* Order history */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">My Orders</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{o.id.slice(-8)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(o.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No orders yet. Place your first order!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
