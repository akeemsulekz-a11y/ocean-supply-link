import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

const Products = () => {
  const { products, addProduct, toggleProduct, getTotalStockForProduct } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!name || !price) return;
    addProduct({ name, pricePerCarton: Number(price), active: true });
    setName("");
    setPrice("");
    setOpen(false);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your biscuit product catalog</p>
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

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price / Carton</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Stock</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3 text-right text-foreground">{fmt(p.pricePerCarton)}</td>
                <td className="px-4 py-3 text-right text-foreground">{getTotalStockForProduct(p.id)} ctns</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button variant="ghost" size="sm" onClick={() => toggleProduct(p.id)}>
                    {p.active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;
