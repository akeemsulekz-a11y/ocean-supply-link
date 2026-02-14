import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct, toggleProduct, getTotalStockForProduct } = useStore();
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!name || !price) return;
    await addProduct({ name, price_per_carton: Number(price), active: true });
    setName(""); setPrice(""); setOpen(false);
    toast.success("Product added");
  };

  const openEdit = (p: typeof products[0]) => {
    setEditId(p.id); setEditName(p.name); setEditPrice(String(p.price_per_carton));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editName || !editPrice) return;
    await updateProduct(editId, { name: editName, price_per_carton: Number(editPrice) });
    setEditOpen(false);
    toast.success("Product updated");
  };

  const confirmDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true); };

  const handleDelete = async () => {
    await deleteProduct(deleteId);
    setDeleteOpen(false);
    toast.success("Product deleted");
  };

  const isAdmin = role === "admin";

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Product Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cream Crackers" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Price per Carton (₦)</label>
                <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="e.g. 4500" className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleAdd}>Add Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-right">Price / Carton</th>
              <th className="text-right">Total Stock</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-foreground">{p.name}</td>
                <td className="text-right text-foreground">{fmt(p.price_per_carton)}</td>
                <td className="text-right text-foreground">{getTotalStockForProduct(p.id)} ctns</td>
                <td className="text-center">
                  <span className={`badge ${p.active ? "badge-success" : "badge-destructive"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleProduct(p.id)}>
                      {p.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => confirmDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="empty-state"><span className="empty-state-text">No products found</span></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Product Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Price per Carton (₦)</label>
              <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this product? This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
