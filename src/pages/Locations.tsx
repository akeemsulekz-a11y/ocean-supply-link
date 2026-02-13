import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, ShoppingBag, Plus } from "lucide-react";
import { toast } from "sonner";

const Locations = () => {
  const { locations, getTotalStockForLocation, sales, refreshData } = useStore();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"store" | "shop">("shop");

  const canAdd = role === "admin";

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Enter a location name");
      return;
    }
    const { error } = await supabase.from("locations").insert({
      name: name.trim(),
      type: type as any,
    });
    if (error) {
      toast.error("Failed to add location");
      return;
    }
    toast.success(`${type === "store" ? "Store" : "Shop"} "${name}" added!`);
    setName("");
    setType("shop");
    setOpen(false);
    await refreshData();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Your store and shop locations</p>
        </div>
        {canAdd && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Location</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Location Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shop E – Westside" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Type</label>
                  <Select value={type} onValueChange={(v) => setType(v as "store" | "shop")}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="shop">Shop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAdd}>Add Location</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
