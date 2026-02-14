import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calendar, Filter, Download, Printer, DollarSign, Target, TrendingDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });
const fmtNumber = (n: number) => n.toLocaleString("en-NG", { minimumFractionDigits: 0 });

interface RevenueBreakdown {
  date: string;
  revenue: number;
  transactions: number;
}

interface LocationRevenue {
  location: string;
  revenue: number;
  percentage: number;
  transactions: number;
}

interface ProductRevenue {
  product: string;
  revenue: number;
  cartonsSold: number;
  percentage: number;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

const Revenue = () => {
  const { products, locations, sales } = useStore();
  const { role } = useAuth();
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationFilter, setLocationFilter] = useState("all");

  const getDates = useMemo(() => {
    const now = new Date();
    let start = new Date();

    switch (dateRange) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start, end: now };
      case "week":
        start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        return { start, end: now };
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now };
      case "custom":
        return { start: new Date(customStart), end: new Date(customEnd) };
    }
  }, [dateRange, customStart, customEnd]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.created_at);
      const inRange = saleDate >= getDates.start && saleDate <= getDates.end;
      const locationMatch = locationFilter === "all" || s.location_id === locationFilter;
      return inRange && locationMatch;
    });
  }, [sales, getDates, locationFilter]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total_amount, 0), [filteredSales]);
  
  const totalTransactions = filteredSales.length;
  
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const totalCartonsSold = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.items?.reduce((itemSum, item) => itemSum + item.cartons, 0) ?? 0), 0);
  }, [filteredSales]);

  // Daily revenue breakdown
  const dailyRevenue = useMemo(() => {
    const daily: Record<string, { revenue: number; transactions: number }> = {};

    filteredSales.forEach(s => {
      const date = new Date(s.created_at).toISOString().split("T")[0];
      if (!daily[date]) daily[date] = { revenue: 0, transactions: 0 };
      daily[date].revenue += s.total_amount;
      daily[date].transactions += 1;
    });

    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        revenue: data.revenue,
        transactions: data.transactions,
      }));
  }, [filteredSales]);

  // Location-wise revenue
  const locationRevenue = useMemo(() => {
    const byLocation: Record<string, { revenue: number; transactions: number }> = {};

    filteredSales.forEach(s => {
      if (!byLocation[s.location_id]) byLocation[s.location_id] = { revenue: 0, transactions: 0 };
      byLocation[s.location_id].revenue += s.total_amount;
      byLocation[s.location_id].transactions += 1;
    });

    return Object.entries(byLocation)
      .map(([locId, data]) => {
        const loc = locations.find(l => l.id === locId);
        return {
          location: loc?.name ?? "Unknown",
          revenue: data.revenue,
          transactions: data.transactions,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, locations, totalRevenue]);

  // Product-wise revenue
  const productRevenue = useMemo(() => {
    const byProduct: Record<string, { revenue: number; cartons: number }> = {};

    filteredSales.forEach(s => {
      s.items?.forEach(item => {
        if (!byProduct[item.product_id]) byProduct[item.product_id] = { revenue: 0, cartons: 0 };
        const itemRevenue = item.cartons * item.price_per_carton;
        byProduct[item.product_id].revenue += itemRevenue;
        byProduct[item.product_id].cartons += item.cartons;
      });
    });

    return Object.entries(byProduct)
      .map(([prodId, data]) => {
        const prod = products.find(p => p.id === prodId);
        return {
          product: prod?.name ?? "Unknown",
          revenue: data.revenue,
          cartonsSold: data.cartons,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products, totalRevenue]);

  // Comparison with previous period
  const previousPeriodRevenue = useMemo(() => {
    const prevStart = new Date(getDates.start);
    const daysInPeriod = Math.floor((getDates.end.getTime() - getDates.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    prevStart.setDate(prevStart.getDate() - daysInPeriod);

    return sales.filter(s => {
      const saleDate = new Date(s.created_at);
      const inRange = saleDate >= prevStart && saleDate < getDates.start;
      const locationMatch = locationFilter === "all" || s.location_id === locationFilter;
      return inRange && locationMatch;
    }).reduce((sum, s) => sum + s.total_amount, 0);
  }, [sales, getDates, locationFilter]);

  const revenueGrowth = previousPeriodRevenue > 0 ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;

  const handleExportCSV = () => {
    let csv = "Date,Location,Product,Quantity,Unit Price,Amount\n";
    filteredSales.forEach(s => {
      const location = locations.find(l => l.id === s.location_id)?.name ?? "Unknown";
      s.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id)?.name ?? "Unknown";
        const amount = item.cartons * item.price_per_carton;
        csv += `"${new Date(s.created_at).toLocaleDateString("en-GB")}","${location}","${product}",${item.cartons},${fmt(item.price_per_carton)},"${fmt(amount)}"\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .page-header {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Revenue Management</h1>
          <p className="page-subtitle">Track earnings and financial performance across locations and products</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={dateRange} onValueChange={(val) => setDateRange(val as any)}>
          <SelectTrigger className="w-40">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
          </>
        )}

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalRevenue)}</div>
            <p className={`text-xs ${revenueGrowth >= 0 ? "text-success" : "text-destructive"}`}>
              {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(totalTransactions)}</div>
            <p className="text-xs text-muted-foreground">Sales recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(averageTransaction)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartons Sold</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(totalCartonsSold)}</div>
            <p className="text-xs text-muted-foreground">Total units moved</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="mb-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="daily">Daily Trend</TabsTrigger>
          <TabsTrigger value="location">By Location</TabsTrigger>
          <TabsTrigger value="product">By Product</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
              <CardDescription>Revenue performance over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => fmt(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Location</CardTitle>
              </CardHeader>
              <CardContent>
                {locationRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={locationRevenue}
                        dataKey="revenue"
                        nameKey="location"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {locationRevenue.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmt(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locationRevenue.map(loc => (
                    <div key={loc.location} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{loc.location}</p>
                        <p className="text-xs text-muted-foreground">{loc.transactions} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmt(loc.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{loc.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="product" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {productRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => fmt(value as number)} />
                      <Bar dataKey="revenue" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {productRevenue.map(prod => (
                    <div key={prod.product} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{prod.product}</p>
                        <p className="text-xs text-muted-foreground">{fmtNumber(prod.cartonsSold)} cartons</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{fmt(prod.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{prod.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Detailed breakdown of all sales in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Location</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-center">Items</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map(sale => (
                      <tr key={sale.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2 font-medium">{locations.find(l => l.id === sale.location_id)?.name ?? "—"}</td>
                        <td className="px-4 py-2">{sale.customer_name}</td>
                        <td className="px-4 py-2 text-center">
                          {sale.items?.reduce((sum, item) => sum + item.cartons, 0) ?? 0}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">{fmt(sale.total_amount)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Revenue;
