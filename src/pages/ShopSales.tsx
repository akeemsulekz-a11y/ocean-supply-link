import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, ShoppingCart, Plus, Package, DollarSign, Clock, Minus, Trash2, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface CartItem {
  product_id: string;
  name: string;
  price_per_carton: number;
  cartons: number;
  available: number;
}

const ShopSales = () => {
  const { products, sales, stock, addSale, getStock } = useStore();
  const { locationId } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<"pos" | "history">("pos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [processing, setProcessing] = useState(false);

  const myStock = stock.filter(s => s.location_id === locationId);
  const mySales = sales.filter(s => s.location_id === locationId);
  const now = new Date();
  const todaySales = mySales.filter(s => new Date(s.created_at).toDateString() === now.toDateString());
  const todayRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);

  const activeProducts = products.filter(p => p.active);
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);
  const cartCount = cart.reduce((s, i) => s + i.cartons, 0);

  const addToCart = (product: typeof activeProducts[0]) => {
    if (!locationId) return;
    const available = getStock(product.id, locationId);
    if (available <= 0) { toast.error("Out of stock"); return; }

    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.cartons >= available) { toast.error(`Only ${available} available`); return prev; }
        return prev.map(i => i.product_id === product.id ? { ...i, cartons: i.cartons + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price_per_carton: product.price_per_carton, cartons: 1, available }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      if (qty > i.available) { toast.error(`Only ${i.available} available`); return i; }
      if (qty < 1) return i;
      return { ...i, cartons: qty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!customerName.trim()) { toast.error("Enter customer name"); return; }
    if (!locationId) return;

    setProcessing(true);
    try {
      await addSale({
        location_id: locationId,
        customer_name: customerName,
        items: cart.map(i => ({ product_id: i.product_id, cartons: i.cartons, price_per_carton: i.price_per_carton })),
        total_amount: cartTotal,
      });
      toast.success("Sale completed!");

      // Open receipt
      const itemsData = cart.map(i => ({ name: i.name, cartons: i.cartons, price_per_carton: i.price_per_carton }));
      const params = new URLSearchParams({
        type: "sale",
        receipt: Date.now().toString(36).toUpperCase().slice(-6),
        date: new Date().toISOString(),
        customer: customerName,
        total: cartTotal.toString(),
        items: encodeURIComponent(JSON.stringify(itemsData)),
      });

      setCart([]);
      setCustomerName("");
      navigate(`/print?${params.toString()}`);
    } catch {
      toast.error("Failed to complete sale");
    }
    setProcessing(false);
  };

  const filteredHistory = mySales.filter(s => {
    const d = new Date(s.created_at);
    const matchDate = dateFilter === "today" ? d.toDateString() === now.toDateString()
      : dateFilter === "week" ? d >= new Date(now.getTime() - 7 * 86400000)
      : true;
    const matchSearch = !historySearch || s.customer_name.toLowerCase().includes(historySearch.toLowerCase());
    return matchDate && matchSearch;
  });

  const openReceipt = (sale: typeof sales[0]) => {
    const itemsData = sale.items.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      return { name: prod?.name ?? "Unknown", cartons: i.cartons, price_per_carton: i.price_per_carton };
    });
    const params = new URLSearchParams({
      type: "sale",
      receipt: sale.id.slice(-6).toUpperCase(),
      date: sale.created_at,
      customer: sale.customer_name,
      total: sale.total_amount.toString(),
      items: encodeURIComponent(JSON.stringify(itemsData)),
    });
    navigate(`/print?${params.toString()}`);
  };

  // History View
  if (view === "history") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("pos")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to POS
          </Button>
          <h1 className="page-title">Sales History</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search customer…" className="pl-9" />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {(["today", "week", "all"] as const).map(f => (
              <button key={f} onClick={() => setDateFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${dateFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "today" ? "Today" : f === "week" ? "This Week" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
              <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No sales found</p>
            </div>
          ) : (
            filteredHistory.map(sale => {
              const itemNames = sale.items.map(i => {
                const prod = products.find(p => p.id === i.product_id);
                return prod ? `${prod.name} ×${i.cartons}` : null;
              }).filter(Boolean);

              return (
                <div key={sale.id} className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{sale.customer_name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">#{sale.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{itemNames.join(", ")}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(sale.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{fmt(sale.total_amount)}</span>
                      <Button variant="ghost" size="icon" onClick={() => openReceipt(sale)} className="text-primary h-8 w-8">
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // POS View
  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Today</p>
                <p className="text-lg font-bold text-foreground">{todaySales.length} sales</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-success">{fmt(todayRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="stat-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setView("history")}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">History</p>
                <p className="text-lg font-bold text-foreground">{mySales.length} total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="pl-9" />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredProducts.map(p => {
              const available = locationId ? getStock(p.id, locationId) : 0;
              const inCart = cart.find(i => i.product_id === p.id);
              const isOut = available <= 0;

              return (
                <button
                  key={p.id}
                  disabled={isOut}
                  onClick={() => addToCart(p)}
                  className={`relative rounded-xl border p-3 text-left transition-all ${
                    isOut
                      ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                      : inCart
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {inCart.cartons}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <Package className={`h-4 w-4 mt-0.5 shrink-0 ${isOut ? "text-muted-foreground" : "text-primary"}`} />
                    <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                      isOut ? "bg-destructive/10 text-destructive" :
                      available < 5 ? "bg-warning/10 text-warning" :
                      "bg-success/10 text-success"
                    }`}>
                      {available}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1.5 truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt(p.price_per_carton)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart Panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col rounded-xl border border-border bg-card overflow-hidden shrink-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground text-sm">Cart</span>
          </div>
          <span className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
        </div>

        {/* Customer name */}
        <div className="px-4 py-3 border-b border-border">
          <Input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name *"
            className="h-9 text-sm"
          />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[40vh] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Tap products to add</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(item.price_per_carton)} × {item.cartons}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => item.cartons > 1 ? updateCartQty(item.product_id, item.cartons - 1) : removeFromCart(item.product_id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">{item.cartons}</span>
                    <button
                      onClick={() => updateCartQty(item.product_id, item.cartons + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <p className="text-sm font-semibold text-foreground">{fmt(item.cartons * item.price_per_carton)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-destructive/60 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        <div className="border-t border-border p-4 space-y-3 bg-muted/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
            <span className="font-semibold text-foreground">{fmt(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{fmt(cartTotal)}</span>
          </div>
          <Button
            className="w-full h-12 text-base font-semibold gap-2"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0 || !customerName.trim() || processing}
          >
            <Check className="h-5 w-5" />
            {processing ? "Processing..." : `Charge ${fmt(cartTotal)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopSales;
