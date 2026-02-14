import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, Pencil, Trash2 } from "lucide-react";
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

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [locationId, setLocationId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editing, setEditing] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState("");

  const shops = locations.filter(l => l.type === "shop");

  const fetchStaff = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, location_id");
    if (roles) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const mapped: StaffUser[] = roles.map(r => {
        const prof = profiles?.find(p => p.user_id === r.user_id);
        const loc = locations.find(l => l.id === r.location_id);
        return { user_id: r.user_id, role: r.role, location_id: r.location_id, profile_name: prof?.full_name ?? "Unknown", location_name: loc?.name ?? null };
      });
      setStaff(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [locations]);

  const handleCreate = async () => {
    if (!email || !password || !fullName || !role) { toast.error("Fill all required fields"); return; }
    if (role === "shop_staff" && !locationId) { toast.error("Select a shop for shop staff"); return; }
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

  const openEdit = (user: StaffUser) => {
    setSelectedUser(user);
    setEditFullName(user.profile_name);
    setEditRole(user.role);
    setEditLocationId(user.location_id || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editFullName || !editRole || !selectedUser) { toast.error("Fill all fields"); return; }
    if (editRole === "shop_staff" && !editLocationId) { toast.error("Select a shop for shop staff"); return; }
    setEditing(true);
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editFullName })
        .eq("user_id", selectedUser.user_id);
      if (profileError) throw profileError;

      // Update user role and location
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: editRole, location_id: editRole === "shop_staff" ? editLocationId : null })
        .eq("user_id", selectedUser.user_id);
      if (roleError) throw roleError;

      toast.success("User updated successfully");
      setEditOpen(false);
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
    setEditing(false);
  };

  const confirmDelete = (userId: string) => {
    setDeleteUserId(userId);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setEditing(true);
    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(deleteUserId);
      if (authError) throw authError;

      toast.success("User deleted successfully");
      setDeleteOpen(false);
      setDeleteUserId("");
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
    setEditing(false);
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

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Role</th>
              <th className="text-left">Location</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.user_id}>
                <td className="font-medium text-foreground">{s.profile_name}</td>
                <td>
                  <span className={`badge ${s.role === "admin" ? "badge-primary" : s.role === "store_staff" ? "badge-info" : "badge-success"}`}>
                    {s.role === "admin" ? "Admin" : s.role === "store_staff" ? "Store Manager" : "Shop Staff"}
                  </span>
                </td>
                <td className="text-muted-foreground">{s.location_name ?? "—"}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {s.role !== "admin" && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => confirmDelete(s.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && !loading && (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <Users className="empty-state-icon" />
                  <p className="empty-state-text">No staff users yet</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={editRole} onValueChange={(v) => { setEditRole(v); if (v !== "shop_staff") setEditLocationId(""); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_staff">Store Manager</SelectItem>
                    <SelectItem value="shop_staff">Shop Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === "shop_staff" && (
                <div>
                  <label className="text-sm font-medium text-foreground">Assign to Shop</label>
                  <Select value={editLocationId} onValueChange={setEditLocationId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select shop" /></SelectTrigger>
                    <SelectContent>
                      {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={handleEdit} disabled={editing}>
                {editing ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this user? This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={editing}>
              {editing ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
