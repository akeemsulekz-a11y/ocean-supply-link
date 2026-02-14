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

  const handleDownloadPDF = () => {
    const html = document.getElementById('print-content')?.innerHTML || '';
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${isReport ? 'Report' : 'Receipt'}</title>
            <style>
              * { margin: 0; padding: 0; }
              body { font-family: monospace; }
              @page { 
                size: ${isReport ? 'A4' : '80mm 200mm'}; 
                margin: ${isReport ? '15mm' : '0'};
              }
              body { background: white; color: black; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; }
        
        @media print {
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
          }
          
          body * { visibility: hidden; }
          #print-container, #print-container * { visibility: visible; }
          #print-content, #print-content * { visibility: visible; }
          
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          #print-content {
            margin: 0 !important;
            padding: ${isReport ? '15mm' : '4mm'} !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            width: ${isReport ? '210mm' : '80mm'} !important;
            max-width: ${isReport ? '210mm' : '80mm'} !important;
            font-size: ${isReport ? '11pt' : '10pt'} !important;
            line-height: ${isReport ? '1.5' : '1.3'} !important;
            font-family: 'Courier New', monospace !important;
          }
          
          #print-content h1 { 
            font-size: ${isReport ? '16pt' : '12pt'} !important; 
            margin: 0 0 4pt 0 !important;
            color: black !important;
            font-weight: bold !important;
          }
          
          #print-content h2 { 
            font-size: ${isReport ? '13pt' : '10pt'} !important; 
            margin: 0 0 3pt 0 !important;
            color: black !important;
          }
          
          #print-content p { 
            margin: 0 0 2pt 0 !important;
            color: black !important;
          }
          
          #print-content table { 
            font-size: ${isReport ? '11pt' : '9pt'} !important; 
            width: 100% !important;
            border-collapse: collapse;
            margin: 4pt 0 !important;
          }
          
          #print-content th { 
            background: white !important; 
            color: black !important;
            padding: 2pt 4pt !important;
            text-align: left;
            border-bottom: 1px solid black !important;
            font-weight: bold !important;
          }
          
          #print-content td { 
            padding: 2pt 4pt !important;
            color: black !important;
          }
          
          #print-content .receipt-divider { 
            border-top: 1px dashed #000 !important;
            margin: 3pt 0 !important;
            padding: 0 !important;
          }
          
          #print-content .text-muted-foreground { color: #333 !important; }
          #print-content .text-foreground { color: black !important; }
          
          @page { 
            size: ${isReport ? 'A4' : '80mm 200mm'}; 
            margin: ${isReport ? '15mm' : '0mm'};
            padding: 0;
          }
          
          @page :first {
            margin-top: ${isReport ? '15mm' : '0mm'};
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
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />{isReport ? "Download Report" : "Download Receipt"}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />{isReport ? "Print Report" : "Print Receipt"}
            </Button>
          </div>
        </div>

        {/* Printable content wrapper */}
        <div id="print-container" className="print:m-0 print:p-0">
          <div className="flex justify-center py-8 print:py-0 print:flex print:justify-center">
            <div
              id="print-content"
              className={`bg-white text-black font-mono ${
                isReport 
                  ? "w-[210mm] print:w-[210mm]" 
                  : "w-[80mm] print:w-[80mm]"
              }`}
            >
            {/* Header */}
            <div className="text-center mb-4 print:mb-3">
              <h1 className="font-bold tracking-tight">OceanGush International</h1>
              <p className="text-xs mt-0.5">Wholesale Distribution</p>
              <div className="receipt-divider my-2" />
              <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
              {!isReport && <p className="text-xs mt-1">No: #{receiptNumber}</p>}
              {isReport && reportTitle && <p className="font-semibold mt-1">{reportTitle}</p>}
            </div>

            {/* Meta */}
            <div className="space-y-0.5 mb-3 print:mb-2 text-xs">
              <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              {customerName && !isReport && <p>Customer: {customerName}</p>}
              {fromLocation && <p>Location: {fromLocation}</p>}
              {toLocation && <p>To: {toLocation}</p>}
            </div>

            <div className="receipt-divider my-2" />

            {/* Items table */}
            <table className="w-full mb-1">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 font-bold">{isReport ? "Description" : "Item"}</th>
                  <th className="text-center py-1 font-bold">{isSupply ? "Sent" : "Qty"}</th>
                  {!isSupply && <th className="text-right py-1 font-bold">Price</th>}
                  {!isSupply && <th className="text-right py-1 font-bold">Total</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-300">
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
                <div className="receipt-divider my-2" />
                <div className="flex justify-between font-bold py-1">
                  <span>TOTAL</span>
                  <span>{fmt(total)}</span>
                </div>
              </>
            )}

            <div className="receipt-divider my-2" />

            {/* Footer */}
            <div className="text-center text-xs space-y-1">
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
      </div>
    </>
  );
};

export default PrintReceipt;
