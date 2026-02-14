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
      <DialogContent className="w-[420px] max-w-[420px] p-0 border-0 rounded-lg print:max-w-full print:border-0 print:shadow-none">
        <div className="bg-white text-black font-mono text-xs overflow-y-auto max-h-[90vh]" id="receipt-print">
          {/* Header */}
          <div className="text-center border-b-2 border-black p-4">
            <p className="font-bold text-base" style={{ letterSpacing: '0.05em' }}>OceanGush International</p>
            <p className="text-xs mt-1 font-mono" style={{ fontFamily: 'Courier New' }}>Wholesale Distribution</p>
            <div className="border-t border-black my-2" />
            <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
            <p className="text-xs mt-1 font-mono">No: #{receiptNumber}</p>
          </div>

          {/* Meta */}
          <div className="space-y-0.5 px-4 py-3 text-xs font-mono border-b border-black">
            <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            {customerName && <p>Customer: {customerName}</p>}
            {fromLocation && <p>From: {fromLocation}</p>}
            {toLocation && <p>To: {toLocation}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse border-b border-black">
            <thead>
              <tr className="border-b border-black text-xs">
                <th className="text-left p-2 font-bold border-r border-black">Item</th>
                <th className="text-center p-2 font-bold border-r border-black w-12">Qty</th>
                <th className="text-right p-2 font-bold border-r border-black w-20">Price</th>
                <th className="text-right p-2 font-bold w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-300 text-xs font-mono">
                  <td className="text-left p-2 border-r border-gray-300">{item.name}</td>
                  <td className="text-center p-2 border-r border-gray-300">{item.cartons}</td>
                  <td className="text-right p-2 border-r border-gray-300">{fmt(item.price_per_carton)}</td>
                  <td className="text-right p-2">{fmt(item.cartons * item.price_per_carton)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-between border-b-2 border-black font-bold p-3 text-sm font-mono">
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
          </div>

          {/* Footer */}
          <div className="text-center text-xs space-y-1 py-3 px-4 font-mono">
            <p>Thank you for your patronage!</p>
            <p>OceanGush International Services</p>
            <p>— Goods bought in good condition —</p>
            <p>— are not returnable —</p>
          </div>

          {/* Print Button */}
          <div className="border-t border-black p-3 print:hidden bg-gray-50">
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
