import { Dialog, DialogContent } from "@/components/ui/dialog";
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
      <DialogContent className="w-[320px] max-w-[320px] p-0 border-0 print:max-w-full print:border-0 print:shadow-none">
        <div className="bg-white text-black font-mono text-xs overflow-y-auto max-h-[90vh]" id="receipt-print">
          {/* Header */}
          <div className="text-center border-b border-black p-3 pb-2">
            <p className="font-bold text-sm">OceanGush International</p>
            <p className="text-[10px] mt-0.5">Wholesale Distribution</p>
            <div className="border-t border-black my-1" />
            <p className="text-[10px] font-bold uppercase tracking-widest">{typeLabel}</p>
            <p className="text-[10px] mt-0.5">No: #{receiptNumber}</p>
          </div>

          {/* Meta */}
          <div className="space-y-0.5 p-3 pb-2 text-[10px]">
            <p>{new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            {customerName && <p>Customer: {customerName}</p>}
            {fromLocation && <p>From: {fromLocation}</p>}
            {toLocation && <p>To: {toLocation}</p>}
          </div>

          <div className="border-t border-black" />

          {/* Items */}
          <div className="p-3 space-y-1 border-b border-black">
            <div className="flex justify-between font-bold text-[9px] pb-1 border-b border-gray-300">
              <span>Item</span>
              <span>Amount</span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="flex-1">{item.name} × {item.cartons}</span>
                <span className="font-medium">{fmt(item.cartons * item.price_per_carton)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between border-b border-black font-bold p-3 pb-2 text-[11px]">
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
          </div>

          {/* Footer */}
          <div className="text-center text-[9px] space-y-0.5 p-3">
            <p>Thank you for your patronage!</p>
            <p>OceanGush International</p>
            <p>— Goods bought in good condition —</p>
            <p>— are not returnable —</p>
          </div>

          {/* Print Button */}
          <div className="border-t border-black p-3 pt-2 print:hidden">
            <Button className="w-full h-8 text-xs" onClick={() => window.print()}>
              <Printer className="mr-2 h-3 w-3" />Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
