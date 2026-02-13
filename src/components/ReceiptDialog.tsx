import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

interface ReceiptItem {
  name: string;
  cartons: number;
  price_per_carton: number;
}

interface ReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "sale" | "order" | "supply";
  receiptNumber: string;
  date: string;
  customerName?: string;
  fromLocation?: string;
  toLocation?: string;
  items: ReceiptItem[];
  total: number;
}

const ReceiptDialog = ({ open, onOpenChange, type, receiptNumber, date, customerName, fromLocation, toLocation, items, total }: ReceiptProps) => {
  const typeLabel = type === "sale" ? "Sale Receipt" : type === "order" ? "Order Receipt" : "Supply Receipt";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm print:max-w-full print:border-0 print:shadow-none">
        <DialogHeader><DialogTitle>{typeLabel}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm" id="receipt-print">
          <div className="text-center border-b border-border pb-3">
            <p className="font-display font-bold text-lg text-foreground">OceanGush International</p>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
            <p className="text-xs font-mono text-muted-foreground">#{receiptNumber}</p>
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">{new Date(date).toLocaleString("en-GB")}</p>
            {customerName && <p className="text-foreground">Customer: <span className="font-medium">{customerName}</span></p>}
            {fromLocation && <p className="text-foreground">From: <span className="font-medium">{fromLocation}</span></p>}
            {toLocation && <p className="text-foreground">To: <span className="font-medium">{toLocation}</span></p>}
          </div>

          <div className="border-t border-border pt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Item</span><span>Amount</span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-foreground">{item.name} × {item.cartons}</span>
                <span className="font-medium text-foreground">{fmt(item.cartons * item.price_per_carton)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground text-base">
            <span>Total</span><span>{fmt(total)}</span>
          </div>

          <div className="text-center text-[10px] text-muted-foreground border-t border-border pt-2">
            Thank you for your business!
          </div>

          <Button variant="outline" className="w-full print:hidden" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
