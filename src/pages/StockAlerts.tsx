import { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, Package, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

const StockAlerts = () => {
  const { products, locations, stockAlerts, dismissStockAlert } = useStore();
  const { role } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState(stockAlerts);
  const [filter, setFilter] = useState<"all" | "low_stock" | "stockout_predicted" | "overstock">("all");

  useEffect(() => {
    setActiveAlerts(stockAlerts);
  }, [stockAlerts]);

  const filteredAlerts = filter === "all" 
    ? activeAlerts 
    : activeAlerts.filter(a => a.alert_type === filter);

  const handleDismiss = async (alertId: string) => {
    try {
      await dismissStockAlert(alertId);
      toast.success("Alert dismissed");
    } catch (error) {
      toast.error("Failed to dismiss alert");
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-5 h-5 text-orange-500" />;
      case "stockout_predicted":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case "overstock":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "low_stock":
        return "bg-orange-50 border-orange-200";
      case "stockout_predicted":
        return "bg-red-50 border-red-200";
      case "overstock":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Low Stock</Badge>;
      case "stockout_predicted":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Stockout Predicted</Badge>;
      case "overstock":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Overstock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name ?? "Unknown Product";
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name ?? "Unknown Location";
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Stock Alerts</h1>
        <p className="page-subtitle">Monitor inventory alerts and predicted stockouts</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
        >
          All Alerts ({activeAlerts.length})
        </Button>
        <Button
          variant={filter === "low_stock" ? "default" : "outline"}
          onClick={() => setFilter("low_stock")}
          size="sm"
        >
          Low Stock ({activeAlerts.filter(a => a.alert_type === "low_stock").length})
        </Button>
        <Button
          variant={filter === "stockout_predicted" ? "default" : "outline"}
          onClick={() => setFilter("stockout_predicted")}
          size="sm"
        >
          Predicted Stockout ({activeAlerts.filter(a => a.alert_type === "stockout_predicted").length})
        </Button>
        <Button
          variant={filter === "overstock" ? "default" : "outline"}
          onClick={() => setFilter("overstock")}
          size="sm"
        >
          Overstock ({activeAlerts.filter(a => a.alert_type === "overstock").length})
        </Button>
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-gray-600">No active alerts at the moment. All stock levels looking good! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`border-2 ${getAlertColor(alert.alert_type)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {getAlertIcon(alert.alert_type)}
                    <div className="flex-1">
                      <CardTitle className="text-base">{getProductName(alert.product_id)}</CardTitle>
                      <CardDescription className="text-xs">{getLocationName(alert.location_id)}</CardDescription>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  {getAlertBadge(alert.alert_type)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Current Stock</p>
                    <p className="text-lg font-semibold">{alert.current_stock} ctns</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Threshold</p>
                    <p className="text-lg font-semibold text-orange-600">{alert.threshold_value} ctns</p>
                  </div>
                </div>

                <div className="text-sm border-t pt-3">
                  <p className="text-gray-600">Daily Sales Velocity</p>
                  <p className="font-semibold">{alert.sales_velocity.toFixed(1)} ctns/day</p>
                </div>

                {alert.days_to_stockout && (
                  <div className="text-sm bg-red-100 rounded p-2">
                    <p className="text-gray-700">
                      <span className="font-semibold">Stockout in: </span>
                      <span className="text-red-700 font-bold">{alert.days_to_stockout} days</span>
                    </p>
                    {alert.predicted_stockout_date && (
                      <p className="text-xs text-gray-600">
                        (~{new Date(alert.predicted_stockout_date).toLocaleDateString("en-GB")})
                      </p>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // TODO: Navigate to stock management for this product/location
                  }}
                >
                  Manage Stock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How Stock Alerts Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Low Stock:</strong> Inventory falls below your configured threshold
          </p>
          <p>
            <strong>Predicted Stockout:</strong> Based on daily sales velocity, we predict when you'll run out
          </p>
          <p>
            <strong>Overstock:</strong> Excessive inventory that indicates slow movement
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAlerts;
