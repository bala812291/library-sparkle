import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Athenaeum Library" },
      { name: "description", content: "Set a new password for your library account." },
      { property: "og:title", content: "Reset password — Athenaeum Library" },
      { property: "og:description", content: "Set a new password for your library account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  };
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button className="h-11 w-full" disabled={loading}>Update password</Button>
      </form>
    </main>
  );
}
