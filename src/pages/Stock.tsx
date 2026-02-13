import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Stock = () => {
  const { products, locations, getStock } = useStore();
  const [filter, setFilter] = useState("all");

  const activeProducts = products.filter(p => p.active);
  const filteredLocations = filter === "all" ? locations : locations.filter(l => l.id === filter);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Carton inventory across all locations</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50">Product</th>
              {filteredLocations.map(l => (
                <th key={l.id} className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">{l.name}</th>
              ))}
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map(p => {
              const total = filteredLocations.reduce((s, l) => s + getStock(p.id, l.id), 0);
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">{p.name}</td>
                  {filteredLocations.map(l => {
                    const qty = getStock(p.id, l.id);
                    return (
                      <td key={l.id} className="px-4 py-3 text-center">
                        <span className={`font-semibold ${qty === 0 ? "text-destructive" : qty < 10 ? "text-warning" : "text-foreground"}`}>
                          {qty}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-bold text-foreground">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stock;
