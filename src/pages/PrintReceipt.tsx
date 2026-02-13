import { useSearchParams, useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const PrintReceipt = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { products } = useStore();

  const type = params.get("type") ?? "sale";
  const receiptNumber = params.get("receipt") ?? "";
  const date = params.get("date") ?? new Date().toISOString();
  const customerName = params.get("customer") ?? "";
  const fromLocation = params.get("from") ?? "";
  const toLocation = params.get("to") ?? "";
  const total = Number(params.get("total") ?? 0);

  // Items are encoded as JSON in the URL
  let items: { name: string; cartons: number; price_per_carton: number }[] = [];
  try {
    items = JSON.parse(decodeURIComponent(params.get("items") ?? "[]"));
  } catch { items = []; }

  const typeLabel = type === "sale" ? "Sale Receipt" : type === "order" ? "Order Receipt" : "Supply Receipt";

  return (
    <div className="min-h-screen bg-background">
      {/* Action bar - hidden on print */}
      <div className="print:hidden flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
        </div>
      </div>

      {/* Receipt content */}
      <div className="mx-auto max-w-[400px] bg-card p-8 my-8 print:my-0 print:p-6 print:max-w-full print:shadow-none rounded-xl border border-border print:border-0 shadow-lg">
        {/* Header */}
        <div className="text-center border-b border-border pb-4 mb-4">
          <h1 className="font-display text-xl font-bold text-foreground">OceanGush International</h1>
          <p className="text-sm text-muted-foreground mt-1">{typeLabel}</p>
          <p className="font-mono text-xs text-muted-foreground mt-1">#{receiptNumber}</p>
        </div>

        {/* Meta */}
        <div className="space-y-1 text-sm mb-4">
          <p className="text-muted-foreground">{new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          {customerName && <p className="text-foreground">Customer: <span className="font-medium">{customerName}</span></p>}
          {fromLocation && <p className="text-foreground">From: <span className="font-medium">{fromLocation}</span></p>}
          {toLocation && <p className="text-foreground">To: <span className="font-medium">{toLocation}</span></p>}
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-muted-foreground">Product</th>
              <th className="text-center py-2 font-medium text-muted-foreground">Qty</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Unit Price</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 text-foreground">{item.name}</td>
                <td className="py-2 text-center text-foreground">{item.cartons}</td>
                <td className="py-2 text-right text-muted-foreground">{fmt(item.price_per_carton)}</td>
                <td className="py-2 text-right font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-between border-t-2 border-foreground/20 pt-3 text-base font-bold text-foreground">
          <span>Grand Total</span>
          <span>{fmt(total)}</span>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground border-t border-border pt-4 mt-6">
          <p>Thank you for your business!</p>
          <p className="mt-1">OceanGush International • All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipt;
