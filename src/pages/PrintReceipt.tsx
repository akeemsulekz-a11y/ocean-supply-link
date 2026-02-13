import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";

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
  const reportTitle = params.get("reportTitle") ?? "";

  let items: { name: string; cartons: number; price_per_carton: number }[] = [];
  try {
    items = JSON.parse(decodeURIComponent(params.get("items") ?? "[]"));
  } catch { items = []; }

  const isReport = type === "report";
  const isSupply = type === "supply";

  const typeLabel = isReport
    ? "REPORT"
    : type === "sale"
    ? "SALE RECEIPT"
    : type === "order"
    ? "ORDER RECEIPT"
    : "SUPPLY RECEIPT";

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-content, #print-content * { visibility: visible !important; }
          #print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isReport ? '210mm' : '80mm'} !important;
            max-width: ${isReport ? '210mm' : '80mm'} !important;
            padding: ${isReport ? '10mm' : '4mm'} !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            font-size: ${isReport ? '12px' : '11px'} !important;
          }
          #print-content table { font-size: ${isReport ? '11px' : '10px'} !important; width: 100% !important; }
          #print-content h1 { font-size: ${isReport ? '18px' : '14px'} !important; color: black !important; }
          #print-content h2 { font-size: ${isReport ? '14px' : '12px'} !important; color: black !important; }
          #print-content .receipt-divider { border-top: 1px dashed #333 !important; }
          #print-content .text-muted-foreground { color: #666 !important; }
          #print-content .text-foreground { color: black !important; }
          @page { 
            size: ${isReport ? 'A4' : '80mm auto'}; 
            margin: ${isReport ? '10mm' : '0'};
          }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Action bar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />{isReport ? "Print Report" : "Print Receipt"}
            </Button>
          </div>
        </div>

        {/* Printable content */}
        <div className="flex justify-center py-8 print:py-0">
          <div
            id="print-content"
            className={`bg-card rounded-xl border border-border shadow-lg p-6 font-mono text-foreground ${
              isReport ? "w-full max-w-3xl" : "w-[320px]"
            }`}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="font-display text-lg font-bold tracking-tight">OceanGush International</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Wholesale Distribution</p>
              <div className="receipt-divider border-t border-dashed border-border my-3" />
              <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
              {!isReport && <p className="text-[10px] text-muted-foreground mt-1">No: #{receiptNumber}</p>}
              {isReport && reportTitle && <p className="text-sm font-semibold text-foreground mt-1">{reportTitle}</p>}
            </div>

            {/* Meta */}
            <div className="text-[11px] space-y-0.5 mb-3">
              <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              {customerName && !isReport && <p>Customer: {customerName}</p>}
              {fromLocation && <p>Location: {fromLocation}</p>}
              {toLocation && <p>To: {toLocation}</p>}
            </div>

            <div className="receipt-divider border-t border-dashed border-border my-3" />

            {/* Items table */}
            <table className="w-full text-[11px] mb-1">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 font-semibold">{isReport ? "Description" : "Item"}</th>
                  <th className="text-center py-1 font-semibold">{isSupply ? "Sent" : "Qty"}</th>
                  {!isSupply && <th className="text-right py-1 font-semibold">Price</th>}
                  {!isSupply && <th className="text-right py-1 font-semibold">Total</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-center">{item.cartons}</td>
                    {!isSupply && <td className="py-1 text-right">{fmt(item.price_per_carton)}</td>}
                    {!isSupply && <td className="py-1 text-right">{fmt(item.cartons * item.price_per_carton)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {!isSupply && total > 0 && (
              <>
                <div className="receipt-divider border-t border-dashed border-border my-2" />
                <div className="flex justify-between text-sm font-bold py-1">
                  <span>TOTAL</span>
                  <span>{fmt(total)}</span>
                </div>
              </>
            )}

            <div className="receipt-divider border-t border-dashed border-border my-3" />

            {/* Footer */}
            <div className="text-center text-[9px] text-muted-foreground space-y-1">
              {isReport ? (
                <p>Generated on {new Date().toLocaleString("en-GB")} • OceanGush Wholesale Management System</p>
              ) : (
                <>
                  <p>Thank you for your patronage!</p>
                  <p>OceanGush International Services</p>
                  <p>— Goods bought in good condition —</p>
                  <p>— are not returnable —</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintReceipt;
