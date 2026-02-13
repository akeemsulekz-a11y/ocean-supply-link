import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Search, Receipt } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface CartItem {
  product_id: string;
  name: string;
  cartons: number;
  price_per_carton: number;
  available: number;
}

const ShopSales = () => {
  const { products, sales, addSale, getStock } = useStore();
  const { locationId, profile } = useAuth();

  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");

  const activeProducts = products.filter(p => p.active);
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);
  const cartCount = cart.reduce((s, i) => s + i.cartons, 0);

  const mySales = sales.filter(s => s.location_id === locationId);
  const now = new Date();
  const filteredSales = mySales.filter(s => {
    const d = new Date(s.created_at);
    if (dateFilter === "today") return d.toDateString() === now.toDateString();
    if (dateFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    return true;
  });

  const todayRevenue = mySales
    .filter(s => new Date(s.created_at).toDateString() === now.toDateString())
    .reduce((s, e) => s + e.total_amount, 0);
  const todayCount = mySales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()).length;

  const addToCart = (product: typeof activeProducts[0]) => {
    if (!locationId) return;
    const available = getStock(product.id, locationId);
    if (available <= 0) { toast.error("Out of stock"); return; }

    setCart(prev => {
      const existing = prev.find(c => c.product_id === product.id);
      if (existing) {
        if (existing.cartons >= available) { toast.error("Max stock reached"); return prev; }
        return prev.map(c => c.product_id === product.id ? { ...c, cartons: c.cartons + 1 } : c);
      }
      return [...prev, { product_id: product.id, name: product.name, cartons: 1, price_per_carton: product.price_per_carton, available }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.product_id !== productId));
      return;
    }
    setCart(prev => prev.map(c => {
      if (c.product_id !== productId) return c;
      if (qty > c.available) { toast.error(`Only ${c.available} available`); return c; }
      return { ...c, cartons: qty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product_id !== productId));
  };

  const handleCheckout = async () => {
    if (!locationId || cart.length === 0) return;
    await addSale({
      location_id: locationId,
      customer_name: customerName,
      items: cart.map(c => ({ product_id: c.product_id, cartons: c.cartons, price_per_carton: c.price_per_carton })),
      total_amount: cartTotal,
    });
    toast.success("Sale completed!");
    setCart([]);
    setCustomerName("Walk-in Customer");
  };

  const receiptSale = showReceipt ? mySales.find(s => s.id === showReceipt) : null;

  return (
    <div>
      {/* Top stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat-card">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Sales</p>
          <p className="text-xl font-bold text-foreground">{todayCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today's Revenue</p>
          <p className="text-xl font-bold text-success">{fmt(todayRevenue)}</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cart Items</p>
          <p className="text-xl font-bold text-primary">{cartCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cart Total</p>
          <p className="text-xl font-bold text-warning">{fmt(cartTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Product grid - left */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredProducts.map(p => {
              const avail = locationId ? getStock(p.id, locationId) : 0;
              const inCart = cart.find(c => c.product_id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={avail <= 0}
                  className={`group relative rounded-xl border p-3 text-left transition-all ${
                    avail <= 0
                      ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                      : inCart
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt(p.price_per_carton)}/ctn</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[11px] font-medium ${avail === 0 ? "text-destructive" : avail < 5 ? "text-warning" : "text-success"}`}>
                      {avail} avail
                    </span>
                    {inCart && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {inCart.cartons} in cart
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart - right */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-display text-base font-semibold text-foreground">Cart</h2>
            </div>

            <div className="mb-3">
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="text-sm"
              />
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tap products to add to cart</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{fmt(item.price_per_carton)} × {item.cartons}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product_id, item.cartons - 1)} className="flex h-7 w-7 items-center justify-center rounded bg-background border border-border text-foreground text-sm font-bold">−</button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">{item.cartons}</span>
                      <button onClick={() => updateQty(item.product_id, item.cartons + 1)} className="flex h-7 w-7 items-center justify-center rounded bg-background border border-border text-foreground text-sm font-bold">+</button>
                    </div>
                    <p className="text-sm font-semibold text-foreground w-20 text-right">{fmt(item.cartons * item.price_per_carton)}</p>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">Total ({cartCount} ctns)</span>
                  <span className="text-lg font-bold text-foreground">{fmt(cartTotal)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Complete Sale — {fmt(cartTotal)}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales history */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Sales History</h2>
          <div className="flex gap-1">
            {(["today", "week", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  dateFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "today" ? "Today" : f === "week" ? "This Week" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">View</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{sale.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setShowReceipt(sale.id)} className="text-primary hover:text-primary/80">
                      <Receipt className="h-4 w-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sales found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt dialog */}
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sale Receipt</DialogTitle></DialogHeader>
          {receiptSale && (
            <div className="space-y-3 text-sm">
              <div className="text-center border-b border-border pb-3">
                <p className="font-display font-bold text-foreground">OceanGush International</p>
                <p className="text-xs text-muted-foreground">Receipt #{receiptSale.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(receiptSale.created_at).toLocaleString("en-GB")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer: <span className="font-medium text-foreground">{receiptSale.customer_name}</span></p>
              </div>
              <div className="space-y-1">
                {receiptSale.items.map((item, i) => {
                  const prod = products.find(p => p.id === item.product_id);
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-foreground">{prod?.name} × {item.cartons}</span>
                      <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                <span>Total</span>
                <span>{fmt(receiptSale.total_amount)}</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => window.print()}>Print Receipt</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopSales;
