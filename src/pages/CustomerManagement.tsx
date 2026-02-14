import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, EyeOff } from "lucide-react";

interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  approved: boolean;
  created_at: string;
  email?: string;
  last_active?: string;
}

interface Auth {
  id: string;
  email: string;
  last_sign_in_at?: string;
}

const CustomerManagement = () => {
  const { user: adminUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterApproved, setFilterApproved] = useState<"all" | "pending" | "approved">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogType, setDialogType] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Call serverless function to get customers + auth info (admin-only)
      const res = await supabase.functions.invoke("list-customers");
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      const customersWithEmails: Customer[] = res.data?.customers ?? [];
      setCustomers(customersWithEmails);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (customer: Customer) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("customers")
        .update({ approved: true })
        .eq("id", customer.id);

      if (error) throw error;

      toast.success(`${customer.name} approved successfully!`);
      setSelectedCustomer(null);
      setDialogType(null);
      fetchCustomers();
    } catch (error: any) {
      console.error("Error approving customer:", error);
      toast.error("Failed to approve customer");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (customer: Customer) => {
    try {
      setLoading(true);
      // Call serverless function to delete the auth user and customer record (admin-only)
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: customer.user_id, customer_id: customer.id },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`${customer.name} rejected and account deleted`);
      setSelectedCustomer(null);
      setDialogType(null);
      fetchCustomers();
    } catch (error: any) {
      console.error("Error rejecting customer:", error);
      toast.error("Failed to reject customer");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);
    
    if (filterApproved === "pending") return matchesSearch && !c.approved;
    if (filterApproved === "approved") return matchesSearch && c.approved;
    return matchesSearch;
  });

  const pendingCount = customers.filter(c => !c.approved).length;
  const approvedCount = customers.filter(c => c.approved).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customer Management</h1>
        <p className="page-subtitle">Manage wholesale customer accounts and approvals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="stat-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Customers</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{customers.length}</p>
        </div>
        <div className="stat-card border-2 border-warning/30 bg-warning/5">
          <p className="text-xs font-medium uppercase tracking-wider text-warning">Pending Approval</p>
          <p className="mt-2 text-3xl font-bold text-warning">{pendingCount}</p>
        </div>
        <div className="stat-card border-2 border-success/30 bg-success/5">
          <p className="text-xs font-medium uppercase tracking-wider text-success">Approved</p>
          <p className="mt-2 text-3xl font-bold text-success">{approvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="stat-card mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Search</label>
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterApproved === "all" ? "default" : "outline"}
              onClick={() => setFilterApproved("all")}
              size="sm"
            >
              All ({customers.length})
            </Button>
            <Button
              variant={filterApproved === "pending" ? "default" : "outline"}
              onClick={() => setFilterApproved("pending")}
              size="sm"
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant={filterApproved === "approved" ? "default" : "outline"}
              onClick={() => setFilterApproved("approved")}
              size="sm"
            >
              Approved ({approvedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="stat-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {customers.length === 0 ? "No customers yet" : "No customers match your search"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Business</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.email || "-"}</TableCell>
                    <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                    <TableCell>
                      {customer.approved ? (
                        <Badge className="bg-success/20 text-success hover:bg-success/30">
                          <Check className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/20 text-warning hover:bg-warning/30">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString("en-NG")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {customer.last_active
                        ? new Date(customer.last_active).toLocaleDateString("en-NG")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!customer.approved && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success hover:bg-success/90"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDialogType("approve");
                            }}
                            disabled={loading}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDialogType("reject");
                            }}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {customer.approved && (
                        <span className="text-xs text-success font-medium">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      {selectedCustomer && dialogType === "approve" && (
        <AlertDialog open={true} onOpenChange={(open) => !open && (setSelectedCustomer(null), setDialogType(null))}>
          <AlertDialogContent>
            <AlertDialogTitle>Approve Customer Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email}) as a wholesale customer? They will be able to place orders immediately.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end mt-4">
              <AlertDialogCancel
                onClick={() => {
                  setSelectedCustomer(null);
                  setDialogType(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleApprove(selectedCustomer)}
                className="bg-success hover:bg-success/90"
              >
                Approve
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Reject Dialog */}
      {selectedCustomer && dialogType === "reject" && (
        <AlertDialog open={true} onOpenChange={(open) => !open && (setSelectedCustomer(null), setDialogType(null))}>
          <AlertDialogContent>
            <AlertDialogTitle>Reject Customer Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Reject and permanently delete the account for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email})? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end mt-4">
              <AlertDialogCancel
                onClick={() => {
                  setSelectedCustomer(null);
                  setDialogType(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleReject(selectedCustomer)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Reject
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default CustomerManagement;
