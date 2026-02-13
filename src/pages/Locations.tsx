import { useStore } from "@/context/StoreContext";
import { Store, ShoppingBag } from "lucide-react";

const Locations = () => {
  const { locations, getTotalStockForLocation, sales } = useStore();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Locations</h1>
        <p className="page-subtitle">Your store and shop locations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc, i) => {
          const totalStock = getTotalStockForLocation(loc.id);
          const locSales = sales.filter(s => s.location_id === loc.id);
          const revenue = locSales.reduce((sum, s) => sum + s.total_amount, 0);
          return (
            <div key={loc.id} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${loc.type === "store" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                  {loc.type === "store" ? <Store className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">{loc.type}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Stock</p>
                  <p className="text-lg font-bold text-foreground">{totalStock} <span className="text-xs font-normal text-muted-foreground">ctns</span></p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sales</p>
                  <p className="text-lg font-bold text-foreground">{locSales.length}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-foreground">₦{revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Locations;
