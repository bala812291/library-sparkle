import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Library, Loader2, BookOpen, ShieldCheck, BarChart3, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Athenaeum College Library" },
      { name: "description", content: "Sign in or create an account for the college library management system." },
      { property: "og:title", content: "Athenaeum College Library" },
      { property: "og:description", content: "Manage books, circulation, fines and reservations in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

type Mode = "signin" | "signup" | "forgot";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (mode === "signup" && name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (mode !== "forgot" && password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else {
          toast.success("Account created! Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg === "Invalid login credentials" ? "Wrong email or password." : msg);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, [string, string, string]> = {
    signin: ["Welcome back", "Sign in with your college library account.", "Sign in"],
    signup: ["Create your account", "Join the library to borrow and reserve books.", "Create account"],
    forgot: ["Reset password", "We'll email you a link to set a new password.", "Send reset link"],
  };
  const [title, sub, cta] = titles[mode];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Library className="size-5" /></div>
          <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">Athenaeum</span>
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-semibold leading-tight text-sidebar-accent-foreground">The library, organised down to every single copy.</h1>
          <ul className="space-y-4 text-sm">
            {([
              [BookOpen, "Track every accession number, issue and return"],
              [ShieldCheck, "Role-based access for admins, librarians and students"],
              [BarChart3, "Live analytics, fines and exportable reports"],
            ] as const).map(([I, t]) => (
              <li key={t} className="flex items-center gap-3"><I className="size-4 text-sidebar-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/60">© 2026 College Central Library</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:p-12">
        <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-5">
          <div className="space-y-2">
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Library className="size-4" /></div>
              <span className="font-display font-semibold">Athenaeum</span>
            </div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>

          {mode !== "forgot" && (
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
              {(["signin", "signup"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); }}
                  className={`rounded-md py-2 transition ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="h-11" aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" autoComplete="email" className="h-11" aria-invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs font-medium text-info hover:underline">Forgot password?</button>
                )}
              </div>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-11 pr-11" aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
          )}
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} {cta}
          </Button>
          {mode === "forgot" && (
            <button type="button" onClick={() => setMode("signin")} className="w-full text-center text-sm font-medium text-info hover:underline">Back to sign in</button>
          )}
        </form>
      </main>
    </div>
  );
}
