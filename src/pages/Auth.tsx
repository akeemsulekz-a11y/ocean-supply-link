import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Waves } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
      if (!fullName.trim()) { toast.error("Full name is required"); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Waves className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">OceanGush</h1>
          <p className="text-sm text-muted-foreground">Wholesale Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {isLogin ? "Sign In" : "Customer Registration"}
          </h2>
          {!isLogin && (
            <p className="text-xs text-muted-foreground -mt-2">
              Only wholesale customers can register here. Staff accounts are created by the Admin.
            </p>
          )}

          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground">Full Name / Business Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name or business" className="mt-1" required />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="mt-1" required minLength={6} />
          </div>
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground">Phone (optional)</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="mt-1" />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Register as Customer"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Wholesale customer?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Register here" : "Sign In"}
            </button>
          </p>
          {isLogin && (
            <p className="text-center text-[11px] text-muted-foreground">
              Staff members: Use credentials provided by your Admin.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;
