import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import appLogo from "@/assets/logo.png";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
      if (!fullName.trim()) { toast.error("Full name is required"); setLoading(false); return; }
      const { error, user } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        if (user) {
          await supabase.from("customers").insert({
            user_id: user.id,
            name: fullName.trim(),
            phone: phone || null,
            approved: false,
          });
        }
        toast.success("Account created! Please sign in. Admin will approve your account.");
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <img src={appLogo} alt="OceanGush" className="h-14 w-14 rounded-2xl object-contain shadow-lg" />
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">OceanGush</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium mt-0.5">Wholesale Management System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLogin ? "Sign in to your account" : "Register as a wholesale customer. Staff accounts are created by the Admin."}
            </p>
          </div>

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
            <div className="relative mt-1">
              <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="pr-10" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground">Phone (optional)</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="mt-1" />
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Register as Customer"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Wholesale customer?" : "Already have an account?"}{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Register here" : "Sign In"}
            </button>
          </p>
          {isLogin && (
            <p className="text-center text-[11px] text-muted-foreground/70">
              Staff members: Use credentials provided by your Admin.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;
