import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

interface StaffUser {
  user_id: string;
  role: string;
  location_id: string | null;
  profile_name: string;
  location_name: string | null;
}

const UserManagement = () => {
  const { session } = useAuth();
  const { locations } = useStore();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create staff form
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [locationId, setLocationId] = useState("");
  const [creating, setCreating] = useState(false);

  const shops = locations.filter(l => l.type === "shop");

  const fetchStaff = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role, location_id");

    if (roles) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const mapped: StaffUser[] = roles.map(r => {
        const prof = profiles?.find(p => p.user_id === r.user_id);
        const loc = locations.find(l => l.id === r.location_id);
        return {
          user_id: r.user_id,
          role: r.role,
          location_id: r.location_id,
          profile_name: prof?.full_name ?? "Unknown",
          location_name: loc?.name ?? null,
        };
      });
      setStaff(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, [locations]);

  const handleCreate = async () => {
    if (!email || !password || !fullName || !role) {
      toast.error("Fill all required fields");
      return;
    }
    if (role === "shop_staff" && !locationId) {
      toast.error("Select a shop for shop staff");
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-staff", {
        body: { email, password, full_name: fullName, role, location_id: locationId || null },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${fullName} added as ${role.replace("_", " ")}`);
      setOpen(false);
      setEmail(""); setPassword(""); setFullName(""); setRole(""); setLocationId("");
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff");
    }
    setCreating(false);
  };

  const roleBadge = (r: string) => {
    const map: Record<string, string> = {
      admin: "bg-primary/10 text-primary",
      store_staff: "bg-info/10 text-info",
      shop_staff: "bg-accent/10 text-accent",
    };
    return map[r] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage staff accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Staff Account</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Staff name" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="staff@example.com" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min 6 characters" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={role} onValueChange={(v) => { setRole(v); if (v !== "shop_staff") setLocationId(""); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_staff">Store Manager</SelectItem>
                    <SelectItem value="shop_staff">Shop Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "shop_staff" && (
                <div>
                  <label className="text-sm font-medium text-foreground">Assign to Shop</label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select shop" /></SelectTrigger>
                    <SelectContent>
                      {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.user_id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{s.profile_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleBadge(s.role)}`}>
                    {s.role === "admin" ? "Admin" : s.role === "store_staff" ? "Store Manager" : "Shop Staff"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.location_name ?? "—"}</td>
              </tr>
            ))}
            {staff.length === 0 && !loading && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No staff users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
