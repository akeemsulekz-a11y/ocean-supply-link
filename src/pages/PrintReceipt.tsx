import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const PrintReceipt = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const type = params.get("type") ?? "sale";
  const receiptNumber = params.get("receipt") ?? "";
  const date = params.get("date") ?? new Date().toISOString();
  const customerName = params.get("customer") ?? "";
  const fromLocation = params.get("from") ?? "";
  const toLocation = params.get("to") ?? "";
  const total = Number(params.get("total") ?? 0);

  let items: { name: string; cartons: number; price_per_carton: number }[] = [];
  try {
    items = JSON.parse(decodeURIComponent(params.get("items") ?? "[]"));
  } catch { items = []; }

  const typeLabel = type === "sale" ? "SALE RECEIPT" : type === "order" ? "ORDER RECEIPT" : "SUPPLY RECEIPT";

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles - only the receipt prints, not the action bar */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-printable, #receipt-printable * { visibility: visible !important; }
          #receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            font-size: 11px !important;
          }
          #receipt-printable table { font-size: 10px !important; }
          #receipt-printable h1 { font-size: 14px !important; }
          #receipt-printable .receipt-divider { 
            border-top: 1px dashed #333 !important; 
          }
          @page { 
            size: 80mm auto; 
            margin: 0;
          }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Action bar - hidden on print */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />Print Receipt
            </Button>
          </div>
        </div>

        {/* Receipt content - this is what prints */}
        <div className="flex justify-center py-8">
          <div
            id="receipt-printable"
            className="w-[320px] bg-card rounded-xl border border-border shadow-lg p-6 font-mono text-foreground"
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="font-display text-lg font-bold tracking-tight">OceanGush International</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Wholesale Distribution</p>
              <div className="receipt-divider border-t border-dashed border-border my-3" />
              <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-1">No: #{receiptNumber}</p>
            </div>

            {/* Meta */}
            <div className="text-[11px] space-y-0.5 mb-3">
              <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              {customerName && <p>Customer: {customerName}</p>}
              {fromLocation && <p>From: {fromLocation}</p>}
              {toLocation && <p>To: {toLocation}</p>}
            </div>

            <div className="receipt-divider border-t border-dashed border-border my-3" />

            {/* Items */}
            <table className="w-full text-[11px] mb-1">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 font-semibold">Item</th>
                  <th className="text-center py-1 font-semibold">Qty</th>
                  <th className="text-right py-1 font-semibold">Price</th>
                  <th className="text-right py-1 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-center">{item.cartons}</td>
                    <td className="py-1 text-right">{fmt(item.price_per_carton)}</td>
                    <td className="py-1 text-right">{fmt(item.cartons * item.price_per_carton)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-divider border-t border-dashed border-border my-2" />

            {/* Total */}
            <div className="flex justify-between text-sm font-bold py-1">
              <span>TOTAL</span>
              <span>{fmt(total)}</span>
            </div>

            <div className="receipt-divider border-t border-dashed border-border my-3" />

            {/* Footer */}
            <div className="text-center text-[9px] text-muted-foreground space-y-1">
              <p>Thank you for your patronage!</p>
              <p>OceanGush International Services</p>
              <p>— Goods bought in good condition —</p>
              <p>— are not returnable —</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintReceipt;
