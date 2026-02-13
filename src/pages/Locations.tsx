import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, ShoppingBag, Plus, Edit2, Users } from "lucide-react";
import { toast } from "sonner";

const Locations = () => {
  const { locations, getTotalStockForLocation, sales, refreshData } = useStore();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"store" | "shop">("shop");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"store" | "shop">("shop");

  // Assign staff dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLocId, setAssignLocId] = useState("");
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string; role: string }[]>([]);

  const canManage = role === "admin";

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Enter a location name"); return; }
    const { error } = await supabase.from("locations").insert({ name: name.trim(), type: type as any });
    if (error) { toast.error("Failed to add location"); return; }
    toast.success(`${type === "store" ? "Store" : "Shop"} "${name}" added!`);
    setName(""); setType("shop"); setOpen(false);
    await refreshData();
  };

  const openEdit = (loc: typeof locations[0]) => {
    setEditId(loc.id); setEditName(loc.name); setEditType(loc.type); setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editName.trim()) { toast.error("Enter a name"); return; }
    const { error } = await supabase.from("locations").update({ name: editName.trim(), type: editType as any }).eq("id", editId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Location updated!");
    setEditOpen(false);
    await refreshData();
  };

  const openAssign = async (locId: string) => {
    setAssignLocId(locId);
    // Fetch staff assigned to this location
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("location_id", locId);
    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      setStaffList(roles.map(r => ({
        user_id: r.user_id,
        role: r.role,
        full_name: (profiles ?? []).find(p => p.user_id === r.user_id)?.full_name ?? "Unknown",
      })));
    } else {
      setStaffList([]);
    }
    setAssignOpen(true);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Your store and shop locations</p>
        </div>
        {canManage && (
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
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">{loc.type}</span>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(loc)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openAssign(loc.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Staff">
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
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

      {/* Edit Location Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={editType} onValueChange={(v) => setEditType(v as "store" | "shop")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="shop">Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assigned Staff — {locations.find(l => l.id === assignLocId)?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {staffList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff assigned. Add staff from the Users page.</p>
            ) : (
              staffList.map(s => (
                <div key={s.user_id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{s.full_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{s.role.replace("_", " ")}</span>
                </div>
              ))
            )}
            <p className="text-xs text-muted-foreground">Manage staff assignments in the <a href="/users" className="text-primary underline">Users</a> page.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;
