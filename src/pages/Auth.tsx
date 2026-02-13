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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } else {
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
            {isLogin ? "Sign In" : "Create Account"}
          </h2>

          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="mt-1" required />
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
