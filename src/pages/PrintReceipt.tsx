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
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box;
        }
        html, body { 
          height: 100%; 
          box-sizing: border-box;
        }
        
        @media print {
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            box-sizing: border-box;
          }
          
          body * { visibility: hidden; }
          #print-container, #print-container * { visibility: visible; }
          #print-content, #print-content * { visibility: visible; }
          
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            box-sizing: border-box;
          }
          
          #print-content {
            margin: 0 !important;
            padding: ${isReport ? '15mm' : '18mm 13mm'} !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
            width: ${isReport ? '210mm' : '148mm'} !important;
            max-width: ${isReport ? '210mm' : '148mm'} !important;
            height: auto !important;
            font-size: ${isReport ? '11pt' : '10pt'} !important;
            line-height: ${isReport ? '1.5' : '1.3'} !important;
            font-family: 'Courier New', monospace !important;
            box-sizing: border-box !important;
          }
          
          #print-content h1 { 
            font-size: ${isReport ? '16pt' : '13pt'} !important; 
            margin: 0 0 3pt 0 !important;
            color: black !important;
            font-weight: bold !important;
          }
          
          #print-content h2 { 
            font-size: ${isReport ? '13pt' : '10pt'} !important; 
            margin: 0 0 2pt 0 !important;
            color: black !important;
          }
          
          #print-content p { 
            margin: 0 !important;
            color: black !important;
          }
          
          #print-content table { 
            font-size: ${isReport ? '11pt' : '9pt'} !important; 
            width: 100% !important;
            border-collapse: collapse;
            margin: 3pt 0 !important;
          }
          
          #print-content th { 
            background: white !important; 
            color: black !important;
            padding: 2pt 3pt !important;
            text-align: left;
            border-bottom: 1px solid black !important;
            font-weight: bold !important;
          }
          
          #print-content td { 
            padding: 2pt 3pt !important;
            color: black !important;
          }
          
          #print-content .receipt-divider { 
            border-top: 1px solid #000 !important;
            margin: 2pt 0 !important;
            padding: 0 !important;
            height: 0 !important;
          }
          
          #print-content .text-muted-foreground { color: black !important; }
          #print-content .text-foreground { color: black !important; }
          
          @page { 
            size: ${isReport ? 'A4' : 'A5'}; 
            margin: ${isReport ? '15mm' : '18mm 13mm'};
            padding: 0;
          }
        }
        
        /* Screen preview styles */
        #print-content {
          background: white;
          color: black;
          font-family: 'Courier New', monospace;
          font-size: ${isReport ? '11pt' : '10pt'};
          line-height: ${isReport ? '1.5' : '1.3'};
          box-sizing: border-box;
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
        <div id="print-container" className="flex justify-center bg-gray-100 py-6 print:p-0 print:bg-white">
          <div
            id="print-content"
            className={`bg-white text-black font-mono shadow-sm print:shadow-none ${
              isReport 
                ? 'w-[210mm] print:w-[210mm]' 
                : 'w-[148mm] print:w-[148mm]'
            }`}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6 print:mb-4">
              <img src="/logo.png" alt="OceanGush Logo" className="h-16 w-auto print:h-12" />
            </div>
            
            {/* Header */}
            <div className="text-center mb-6 print:mb-4">
              <h1 className="font-bold tracking-tight text-lg">OceanGush International</h1>
              <p className="text-xs mt-1">Wholesale Distribution</p>
              <div className="receipt-divider my-4" />
              <p className="text-xs font-bold uppercase tracking-widest">{typeLabel}</p>
              {!isReport && <p className="text-xs mt-2">No: #{receiptNumber}</p>}
              {isReport && reportTitle && <p className="font-semibold mt-2">{reportTitle}</p>}
            </div>

            {/* Meta */}
            <div className="space-y-1 mb-5 print:mb-4 text-xs">
              <p>Date: {new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              {customerName && !isReport && <p>Customer: {customerName}</p>}
              {fromLocation && <p>Location: {fromLocation}</p>}
              {toLocation && <p>To: {toLocation}</p>}
            </div>

            <div className="receipt-divider my-4" />

            {/* Items table */}
            <table className="w-full mb-5 print:mb-4 text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 px-1 font-bold">{isReport ? "Description" : "Item"}</th>
                  <th className="text-center py-2 px-1 font-bold w-12">{isSupply ? "Sent" : "Qty"}</th>
                  {!isSupply && <th className="text-right py-2 px-1 font-bold">Price</th>}
                  {!isSupply && <th className="text-right py-2 px-1 font-bold">Total</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1.5 px-1">{item.name}</td>
                    <td className="py-1.5 px-1 text-center">{item.cartons}</td>
                    {!isSupply && <td className="py-1.5 px-1 text-right">{fmt(item.price_per_carton)}</td>}
                    {!isSupply && <td className="py-1.5 px-1 text-right">{fmt(item.cartons * item.price_per_carton)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {!isSupply && total > 0 && (
              <>
                <div className="receipt-divider my-4" />
                <div className="flex justify-between font-bold py-3 px-1 text-sm border-b-2 border-black">
                  <span>TOTAL</span>
                  <span>{fmt(total)}</span>
                </div>
              </>
            )}

            <div className="receipt-divider my-4" />

            {/* Footer */}
            <div className="text-center text-xs space-y-2 py-4">
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
