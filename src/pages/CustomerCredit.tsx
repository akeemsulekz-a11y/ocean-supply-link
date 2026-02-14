import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign, Calendar, AlertCircle, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface CustomerWithCredit {
  id: string;
  name: string;
  phone?: string;
  approved: boolean;
  credit?: {
    id: string;
    credit_limit: number;
    current_balance: number;
    payment_terms_days: number;
    status: "active" | "suspended" | "closed";
  };
  invoices: any[];
  payments: any[];
}

const CustomerCredit = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { customerCredits } = useStore();
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithCredit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  const fmt = (n: number) => n.toLocaleString("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 });

  useEffect(() => {
    if (role && (role === "admin" || role === "store_staff")) {
      fetchCustomers();
    }
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, approved");

      if (customersError) throw customersError;

      // Cast to any to handle new tables not yet in type system
      const { data: creditsData } = await (supabase as any).from("customer_credit")
        .select("id, customer_id, credit_limit, current_balance, payment_terms_days, status");

      const { data: invoicesData } = await (supabase as any).from("customer_invoices")
        .select("id, customer_id, amount_due, amount_paid, status, due_date");

      const { data: paymentsData } = await (supabase as any).from("customer_payments")
        .select("id, customer_id, amount, paid_date, reference");

      const enrichedCustomers: CustomerWithCredit[] = (customersData || []).map(c => ({
        ...c,
        credit: creditsData?.find((cr: any) => cr.customer_id === c.id),
        invoices: invoicesData?.filter((inv: any) => inv.customer_id === c.id) || [],
        payments: paymentsData?.filter((p: any) => p.customer_id === c.id) || [],
      }));

      setCustomers(enrichedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedCustomer || !paymentAmount) {
      toast.error("Please enter payment amount");
      return;
    }

    try {
      const { error } = await (supabase as any).from("customer_payments").insert({
        customer_id: selectedCustomer.id,
        amount: parseFloat(paymentAmount),
        paid_date: new Date().toISOString(),
        reference: paymentRef || null,
      });

      if (error) throw error;

      // Update customer credit balance
      const newBalance = Math.max(0, (selectedCustomer.credit?.current_balance || 0) - parseFloat(paymentAmount));
      await (supabase as any)
        .from("customer_credit")
        .update({ current_balance: newBalance })
        .eq("customer_id", selectedCustomer.id);

      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentRef("");
      fetchCustomers();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const handleUpdateCreditLimit = async () => {
    if (!selectedCustomer || !creditLimit) {
      toast.error("Please enter credit limit");
      return;
    }

    try {
      const creditId = selectedCustomer.credit?.id;
      if (creditId) {
        const { error } = await (supabase as any)
          .from("customer_credit")
          .update({ credit_limit: parseFloat(creditLimit) })
          .eq("id", creditId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("customer_credit").insert({
          customer_id: selectedCustomer.id,
          credit_limit: parseFloat(creditLimit),
          current_balance: 0,
          payment_terms_days: 30,
          status: "active",
        });
        if (error) throw error;
      }

      toast.success("Credit limit updated");
      setShowCreditDialog(false);
      setCreditLimit("");
      fetchCustomers();
    } catch (error) {
      console.error("Error updating credit:", error);
      toast.error("Failed to update credit limit");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case "closed":
        return <Badge className="bg-red-100 text-red-800">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getInvoiceStatus = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "partial":
        return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "unpaid":
        return <Badge className="bg-gray-100 text-gray-800">Unpaid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Customer Credit Management</h1>
        <p className="page-subtitle">Manage customer credit limits, payments, and invoices</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Credits Extended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(customerCredits.reduce((sum, c) => sum + c.credit_limit, 0))}</div>
            <p className="text-xs text-gray-600 mt-1">of approved customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(customerCredits.reduce((sum, c) => sum + c.current_balance, 0))}</div>
            <p className="text-xs text-gray-600 mt-1">awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerCredits.length > 0
                ? (
                    (customerCredits.reduce((sum, c) => sum + c.current_balance, 0) /
                      customerCredits.reduce((sum, c) => sum + c.credit_limit, 0)) *
                    100
                  ).toFixed(0)
                : "0"}
              %
            </div>
            <p className="text-xs text-gray-600 mt-1">of total limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCredits.length}</div>
            <p className="text-xs text-gray-600 mt-1">with credit accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Credit Accounts</CardTitle>
          <CardDescription>Manage credit limits and view payment history</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.filter(c => c.credit).length === 0 ? (
            <p className="text-center py-8 text-gray-600">No customers with credit accounts</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Credit Limit</th>
                    <th className="pb-3 font-semibold">Current Balance</th>
                    <th className="pb-3 font-semibold">Utilization</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Payment Terms</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    if (!customer.credit) return null;
                    const utilization = (customer.credit.current_balance / customer.credit.credit_limit) * 100;
                    return (
                      <tr key={customer.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-gray-600">{customer.phone || "No phone"}</p>
                        </td>
                        <td className="py-3">{fmt(customer.credit.credit_limit)}</td>
                        <td className="py-3 font-semibold text-orange-600">{fmt(customer.credit.current_balance)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${utilization > 80 ? "bg-red-500" : "bg-blue-500"}`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs">{utilization.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-3">{getStatusColor(customer.credit.status)}</td>
                        <td className="py-3">{customer.credit.payment_terms_days} days</td>
                        <td className="py-3 flex gap-2">
                          <Dialog open={showPaymentDialog && selectedCustomer?.id === customer.id} onOpenChange={setShowPaymentDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                Add Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Record Payment</DialogTitle>
                                <DialogDescription>
                                  Record payment for {selectedCustomer?.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Reference</label>
                                  <Input
                                    placeholder="Check #, bank transfer ref, etc"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                  />
                                </div>
                                <Button onClick={handleAddPayment} className="w-full">
                                  Record Payment
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={showCreditDialog && selectedCustomer?.id === customer.id} onOpenChange={setShowCreditDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setCreditLimit(customer.credit?.credit_limit.toString() || "");
                                }}
                              >
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Credit Limit</DialogTitle>
                                <DialogDescription>
                                  Update credit limit for {selectedCustomer?.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Credit Limit</label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={creditLimit}
                                    onChange={(e) => setCreditLimit(e.target.value)}
                                  />
                                </div>
                                <Button onClick={handleUpdateCreditLimit} className="w-full">
                                  Update Limit
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customers
              .flatMap(c =>
                c.payments.map(p => ({
                  ...p,
                  customer_name: c.name,
                }))
              )
              .sort((a, b) => new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime())
              .slice(0, 10)
              .map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{payment.customer_name}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(payment.paid_date).toLocaleDateString("en-GB")}
                      {payment.reference && ` • ${payment.reference}`}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">{fmt(payment.amount)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerCredit;
