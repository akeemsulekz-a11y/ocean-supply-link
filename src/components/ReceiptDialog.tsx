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
      <DialogContent className="w-auto max-w-none p-0 border-0 rounded-lg flex items-center justify-center print:border-0 print:shadow-none print:p-0" style={{ margin: '0 auto' }}>
        <div className="bg-gray-50 p-4 rounded-lg" style={{ width: '500px' }}>
          <div className="bg-white text-black font-mono text-xs" id="receipt-print">
            {/* Receipt Border Container */}
            <div className="border-4 border-black p-12">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img src="/logo.png" alt="OceanGush Logo" className="h-16 w-auto" />
              </div>
              
              {/* Header */}
              <div className="text-center border-b-2 border-black pb-5 mb-5">
                <p className="font-bold text-xl" style={{ letterSpacing: '0.05em' }}>OceanGush International</p>
                <p className="text-xs mt-2 font-mono" style={{ fontFamily: 'Courier New' }}>Wholesale Distribution</p>
                <div className="border-t border-black my-3" />
                <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
                <p className="text-xs mt-2 font-mono">No: #{receiptNumber}</p>
              </div>

              {/* Meta */}
              <div className="space-y-1 px-1 py-4 text-xs font-mono border-b border-black mb-5 pb-4">
                <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                {customerName && <p>Customer: {customerName}</p>}
                {fromLocation && <p>From: {fromLocation}</p>}
                {toLocation && <p>To: {toLocation}</p>}
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-5 mt-4">
                <thead>
                  <tr className="border-b-2 border-black text-xs">
                    <th className="text-left px-2 py-2 font-bold">Item</th>
                    <th className="text-center px-2 py-2 font-bold w-14">Qty</th>
                    <th className="text-right px-2 py-2 font-bold">Price</th>
                    <th className="text-right px-2 py-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-300 text-xs font-mono">
                      <td className="text-left px-2 py-1.5">{item.name}</td>
                      <td className="text-center px-2 py-1.5">{item.cartons}</td>
                      <td className="text-right px-2 py-1.5">{fmt(item.price_per_carton)}</td>
                      <td className="text-right px-2 py-1.5">{fmt(item.cartons * item.price_per_carton)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="flex justify-between border-b-2 border-t-2 border-black font-bold px-2 py-4 text-sm font-mono mb-5">
                <span>TOTAL</span>
                <span>{fmt(total)}</span>
              </div>

              {/* Footer */}
              <div className="text-center text-xs space-y-2 py-4 px-2 font-mono border-t border-black">
                <p>Thank you for your patronage!</p>
                <p>OceanGush International Services</p>
                <p className="text-[10px] pt-1">— Goods bought in good condition —</p>
                <p className="text-[10px]">— are not returnable —</p>
              </div>
            </div>

            {/* Print Button */}
            <div className="p-4 print:hidden bg-gray-100 border-t border-gray-200">
              <button 
                onClick={() => window.print()}
                className="w-full h-9 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
