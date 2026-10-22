import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { Field, PageHeader, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => headMeta("My Profile", "Your account details and password."),
  component: () => <AppShell title="My Profile"><ProfilePage /></AppShell>,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  useEffect(() => { if (me) { setName(me.name); setPhone(me.student?.phone ?? ""); } }, [me]);
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.rpc("update_my_profile", { p_full_name: name, p_phone: phone });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["current-user"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const changePw = useMutation({
    mutationFn: async () => {
      if (pw.length < 8) throw new Error("Use at least 8 characters");
      if (pw !== pw2) throw new Error("Passwords don't match");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password changed"); setPw(""); setPw2(""); },
    onError: (e) => toast.error(/weak|pwned|leaked/i.test(errMsg(e)) ? "That password is too common. Choose a stronger one." : errMsg(e)),
  });
  const s = me?.student;
  return (
    <>
      <PageHeader title="My Profile" description="Update your details or change your password." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
              <Field label="Email"><Input value={me?.email ?? ""} disabled /></Field>
              <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" /></Field>
              <p className="text-sm text-muted-foreground">Role: <b>{me?.role}</b></p>
              <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {s && (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Student record</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[["Register no.", s.register_no ?? "Not set yet"], ["Department", s.department ?? "—"], ["Course", s.course ?? "—"], ["Year", s.academic_year ?? "—"]].map(([k, v]) => (
                    <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                  <div><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={s.is_active ? "active" : "inactive"} /></dd></div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">Register number and department are set by the library. Ask the librarian to update them.</p>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); changePw.mutate(); }}>
                <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
                <Field label="Confirm password"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field>
                <Button type="submit" variant="outline" disabled={changePw.isPending}>{changePw.isPending && <Loader2 className="size-4 animate-spin" />}Change password</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
