import { useStore } from "@/context/StoreContext";
import { Truck } from "lucide-react";

const Supplies = () => {
  const { locations } = useStore();
  const shops = locations.filter(l => l.type === "shop");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Supplies</h1>
        <p className="page-subtitle">Store → Shop supply transfers (coming in Phase 2)</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <Truck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">Supply Management</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Track supplies from the Main Store to {shops.length} shops with confirmation & dispute workflows.
          This module will be available in Phase 2.
        </p>
      </div>
    </div>
  );
};

export default Supplies;
