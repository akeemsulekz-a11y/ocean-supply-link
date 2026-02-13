import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface SelectedProduct {
  product_id: string;
  name: string;
  price_per_carton: number;
  cartons: number;
  available: number;
}

interface MultiStepSaleFormProps {
  locationId: string;
  onClose: () => void;
  onComplete: (data: {
    customer_name: string;
    items: { product_id: string; cartons: number; price_per_carton: number }[];
    total_amount: number;
  }) => Promise<string | undefined>;
  mode: "sale" | "order";
  customerName?: string;
  paymentDetails?: string;
}

const MultiStepSaleForm = ({ locationId, onClose, onComplete, mode, customerName: initialCustomer, paymentDetails }: MultiStepSaleFormProps) => {
  const { products, getStock } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<"select" | "preview" | "done">("select");
  const [selected, setSelected] = useState<SelectedProduct[]>([]);
  const [customerName, setCustomerName] = useState(initialCustomer ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);

  const activeProducts = products.filter(p => p.active);
  const filtered = activeProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleProduct = (product: typeof activeProducts[0]) => {
    setSelected(prev => {
      const exists = prev.find(s => s.product_id === product.id);
      if (exists) return prev.filter(s => s.product_id !== product.id);
      const available = getStock(product.id, locationId);
      return [...prev, { product_id: product.id, name: product.name, price_per_carton: product.price_per_carton, cartons: 1, available }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setSelected(prev => prev.map(s => {
      if (s.product_id !== productId) return s;
      if (qty > s.available && mode === "sale") { toast.error(`Only ${s.available} available`); return s; }
      if (qty < 1) return s;
      return { ...s, cartons: qty };
    }));
  };

  const total = selected.reduce((s, i) => s + i.cartons * i.price_per_carton, 0);

  const handleProceed = () => {
    if (selected.length === 0) { toast.error("Select at least one product"); return; }
    if (mode === "sale" && !customerName.trim()) { toast.error("Enter customer name"); return; }
    for (const s of selected) {
      if (s.cartons < 1) { toast.error(`Set quantity for ${s.name}`); return; }
      if (mode === "sale" && s.cartons > s.available) { toast.error(`${s.name}: only ${s.available} available`); return; }
    }
    setStep("preview");
  };

  const handleSubmit = async () => {
    const saleId = await onComplete({
      customer_name: customerName || "Customer",
      items: selected.map(s => ({ product_id: s.product_id, cartons: s.cartons, price_per_carton: s.price_per_carton })),
      total_amount: total,
    });
    setCompletedSaleId(saleId ?? null);
    setStep("done");
  };

  const openPrintReceipt = () => {
    const itemsData = selected.map(s => ({ name: s.name, cartons: s.cartons, price_per_carton: s.price_per_carton }));
    const params = new URLSearchParams({
      type: mode,
      receipt: completedSaleId?.slice(-6).toUpperCase() ?? "000000",
      date: new Date().toISOString(),
      customer: customerName,
      total: total.toString(),
      items: encodeURIComponent(JSON.stringify(itemsData)),
    });
    navigate(`/print?${params.toString()}`);
  };

  // Step 1: Product selection
  if (step === "select") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {mode === "sale" ? "New Sale" : "Place Order"}
            </h3>
            <p className="text-sm text-muted-foreground">Select products and quantities</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="mr-1 h-4 w-4" />Cancel</Button>
        </div>

        {mode === "sale" && (
          <div>
            <label className="text-sm font-medium text-foreground">Customer Name</label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1" placeholder="Enter customer name" />
          </div>
        )}

        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." />

        <div className="max-h-[50vh] overflow-y-auto space-y-0 rounded-xl border border-border">
          {filtered.map(p => {
            const available = getStock(p.id, locationId);
            const isSelected = selected.some(s => s.product_id === p.id);
            const sel = selected.find(s => s.product_id === p.id);
            const isAvailable = mode === "order" || available > 0;

            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${isSelected ? "bg-primary/5" : ""} ${!isAvailable ? "opacity-40" : ""}`}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => isAvailable && toggleProduct(p)}
                  disabled={!isAvailable}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(p.price_per_carton)}/carton</p>
                </div>
                <div className="text-right shrink-0">
                  {mode === "sale" ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      available === 0 ? "bg-destructive/10 text-destructive" : 
                      available < 5 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                    }`}>
                      {available > 0 ? `Available (${available})` : "Not Available"}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      available > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {available > 0 ? `Available (${available})` : "Available (On demand)"}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Input
                    type="number"
                    min={1}
                    max={mode === "sale" ? sel?.available : undefined}
                    value={sel?.cartons ?? 1}
                    onChange={e => updateQty(p.id, Number(e.target.value))}
                    className="w-20 text-center"
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No products found</p>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{selected.length} product{selected.length > 1 ? "s" : ""} selected</span>
            </div>
            <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleProceed} disabled={selected.length === 0}>
          Preview {mode === "sale" ? "Sale" : "Order"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Step 2: Preview
  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {mode === "sale" ? "Sale Preview" : "Order Preview"}
            </h3>
            <p className="text-sm text-muted-foreground">Review before confirming</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("select")}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        </div>

        {customerName && (
          <div className="text-sm">
            <span className="text-muted-foreground">Customer:</span>{" "}
            <span className="font-medium text-foreground">{customerName}</span>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qty (ctns)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {selected.map(s => (
                <tr key={s.product_id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{s.cartons}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmt(s.price_per_carton)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(s.cartons * s.price_per_carton)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between px-4 py-3 bg-muted/30 font-bold text-foreground border-t border-border">
            <span>Grand Total</span>
            <span className="text-lg">{fmt(total)}</span>
          </div>
        </div>

        {mode === "order" && paymentDetails && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">💳 Payment Details</p>
            <div className="text-sm text-foreground whitespace-pre-wrap font-medium">{paymentDetails}</div>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleSubmit}>
          <Check className="mr-2 h-4 w-4" />
          {mode === "sale" ? `Complete Sale — ${fmt(total)}` : `Place Order — ${fmt(total)}`}
        </Button>
      </div>
    );
  }

  // Step 3: Done
  return (
    <div className="space-y-6 text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
        <Check className="h-8 w-8 text-success" />
      </div>
      <div>
        <h3 className="font-display text-xl font-bold text-foreground">
          {mode === "sale" ? "Sale Completed!" : "Order Placed!"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "sale" ? "Stock has been deducted." : "Your order is pending approval."}
        </p>
        <p className="text-lg font-bold text-foreground mt-2">{fmt(total)}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
        <Button className="flex-1" onClick={openPrintReceipt}>View & Print Receipt</Button>
      </div>
    </div>
  );
};

export default MultiStepSaleForm;
