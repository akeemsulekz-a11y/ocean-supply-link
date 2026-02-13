import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, CreditCard } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { role } = useAuth();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [settingsId, setSettingsId] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    supabase.from("payment_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setBankName(data.bank_name);
        setAccountNumber(data.account_number);
        setAccountName(data.account_name);
        setAdditionalInfo(data.additional_info ?? "");
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("payment_settings").update({
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      additional_info: additionalInfo || null,
    }).eq("id", settingsId);
    if (error) toast.error("Failed to save settings");
    else toast.success("Payment settings saved!");
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage system configuration</p>
      </div>

      <div className="max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Payment Account Details</h2>
              <p className="text-xs text-muted-foreground">Displayed to customers when placing orders</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Bank Name</label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. First Bank" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Account Number</label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 1234567890" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Account Name</label>
            <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. OceanGush International" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Additional Info (optional)</label>
            <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="e.g. Send payment proof to WhatsApp" className="mt-1" disabled={!isAdmin} rows={3} />
          </div>

          {isAdmin && (
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Payment Settings"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
