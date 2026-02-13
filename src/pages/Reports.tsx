import { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

type ReportType = "daily-sales" | "daily-supply" | "stock" | "period-sales" | "weekly" | "monthly";

const Reports = () => {
  const { products, locations, stock, sales, getStock } = useStore();
  const { role } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("daily-sales");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const isAdmin = role === "admin";

  useEffect(() => {
    supabase.from("transfers").select("*, transfer_items(*)").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setTransfers(data);
    });
    supabase.from("daily_stock_snapshots").select("*").gte("snapshot_date", dateFrom).lte("snapshot_date", dateTo).then(({ data }) => {
      if (data) setSnapshots(data);
    });
  }, [dateFrom, dateTo]);

  // Auto-set date range for weekly/monthly
  useEffect(() => {
    const now = new Date();
    if (reportType === "weekly") {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      setDateFrom(start.toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    } else if (reportType === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(start.toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    }
  }, [reportType]);

  const isPeriod = ["period-sales", "weekly", "monthly"].includes(reportType);

  const filteredSales = sales.filter(s => {
    const d = new Date(s.created_at).toISOString().split("T")[0];
    const inDate = isPeriod ? d >= dateFrom && d <= dateTo : d === dateFrom;
    const inLoc = locationFilter === "all" || s.location_id === locationFilter;
    return inDate && inLoc;
  });

  const filteredTransfers = transfers.filter(t => {
    const d = new Date(t.created_at).toISOString().split("T")[0];
    const inDate = isPeriod ? d >= dateFrom && d <= dateTo : d === dateFrom;
    const inLoc = locationFilter === "all" || t.to_location_id === locationFilter;
    return inDate && inLoc;
  });

  const filteredLocations = locationFilter === "all" ? locations : locations.filter(l => l.id === locationFilter);

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    let csv = "";
    if (reportType === "daily-sales" || isPeriod) {
      csv = "Location,Customer,Items,Amount,Date\n";
      filteredSales.forEach(s => {
        const loc = locations.find(l => l.id === s.location_id);
        csv += `"${loc?.name}","${s.customer_name}",${s.items.length},${s.total_amount},"${new Date(s.created_at).toLocaleString("en-GB")}"\n`;
      });
    } else if (reportType === "stock") {
      csv = "Product," + filteredLocations.map(l => l.name).join(",") + ",Total\n";
      products.filter(p => p.active).forEach(p => {
        const vals = filteredLocations.map(l => getStock(p.id, l.id));
        csv += `"${p.name}",${vals.join(",")},${vals.reduce((a, b) => a + b, 0)}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${reportType}-${dateFrom}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and print operational reports</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          )}
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily-sales">Daily Sales</SelectItem>
            <SelectItem value="daily-supply">Daily Supply</SelectItem>
            <SelectItem value="stock">Stock Report</SelectItem>
            <SelectItem value="period-sales">Custom Period</SelectItem>
            <SelectItem value="weekly">Weekly Report</SelectItem>
            <SelectItem value="monthly">Monthly Report</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        {isPeriod && (
          <>
            <span className="self-center text-sm text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          </>
        )}
      </div>

      {/* Report */}
      <div className="rounded-xl border border-border bg-card p-6 print:border-0 print:p-0 print:shadow-none" id="report-content">
        <div className="text-center mb-6 border-b border-border pb-4">
          <h2 className="font-display text-xl font-bold text-foreground">OceanGush International Services</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {reportType === "daily-sales" && `Daily Sales Report — ${new Date(dateFrom).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
            {reportType === "daily-supply" && `Daily Supply Report — ${new Date(dateFrom).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
            {reportType === "stock" && "Stock Report — All Locations"}
            {reportType === "period-sales" && `Sales Report — ${new Date(dateFrom).toLocaleDateString("en-GB")} to ${new Date(dateTo).toLocaleDateString("en-GB")}`}
            {reportType === "weekly" && `Weekly Report — ${new Date(dateFrom).toLocaleDateString("en-GB")} to ${new Date(dateTo).toLocaleDateString("en-GB")}`}
            {reportType === "monthly" && `Monthly Report — ${new Date(dateFrom).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
          </p>
          {locationFilter !== "all" && (
            <p className="text-xs text-muted-foreground">{locations.find(l => l.id === locationFilter)?.name}</p>
          )}
        </div>

        {/* Sales reports */}
        {(reportType === "daily-sales" || isPeriod) && (
          <div>
            {filteredSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sales for this period</p>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">Items</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map(sale => {
                      const loc = locations.find(l => l.id === sale.location_id);
                      return (
                        <tr key={sale.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-foreground">{loc?.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{sale.customer_name}</td>
                          <td className="px-3 py-2 text-center text-foreground">{sale.items.length}</td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(sale.total_amount)}</td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="text-sm font-medium text-muted-foreground">Total ({filteredSales.length} sales)</span>
                  <span className="text-lg font-bold text-foreground">{fmt(filteredSales.reduce((s, e) => s + e.total_amount, 0))}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Daily Supply */}
        {reportType === "daily-supply" && (
          <div>
            {filteredTransfers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No supplies for this date</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">To Shop</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Sent</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Received</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map(t => {
                    const toLoc = locations.find(l => l.id === t.to_location_id);
                    return (t.transfer_items || []).map((item: any, idx: number) => {
                      const prod = products.find(p => p.id === item.product_id);
                      return (
                        <tr key={`${t.id}-${idx}`} className="border-b border-border last:border-0">
                          {idx === 0 && <td className="px-3 py-2 font-medium text-foreground" rowSpan={t.transfer_items?.length || 1}>{toLoc?.name}</td>}
                          <td className="px-3 py-2 text-foreground">{prod?.name}</td>
                          <td className="px-3 py-2 text-center text-foreground">{item.sent_cartons}</td>
                          <td className="px-3 py-2 text-center text-foreground">{item.received_cartons}</td>
                          {idx === 0 && (
                            <td className="px-3 py-2 text-center capitalize" rowSpan={t.transfer_items?.length || 1}>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                t.status === "accepted" ? "bg-success/10 text-success" :
                                t.status === "disputed" ? "bg-destructive/10 text-destructive" :
                                "bg-warning/10 text-warning"
                              }`}>{t.status}</span>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Stock Report */}
        {reportType === "stock" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                {filteredLocations.map(l => (
                  <th key={l.id} className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">{l.name}</th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => p.active).map(p => {
                const total = filteredLocations.reduce((s, l) => s + getStock(p.id, l.id), 0);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                    {filteredLocations.map(l => (
                      <td key={l.id} className="px-3 py-2 text-center">
                        <span className={`font-semibold ${getStock(p.id, l.id) === 0 ? "text-destructive" : "text-foreground"}`}>{getStock(p.id, l.id)}</span>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-foreground">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <p>Generated on {new Date().toLocaleString("en-GB")} • OceanGush Wholesale Management System</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
