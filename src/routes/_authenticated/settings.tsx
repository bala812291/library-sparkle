import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { Field, PageHeader, RequireRole } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-current-user";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => headMeta("Settings", "Library rules: loan period, limits and fines."),
  component: () => <AppShell title="Settings"><RequireRole roles={["admin"]}><SettingsPage /></RequireRole></AppShell>,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [f, setF] = useState({ library_name: "", max_books: "3", loan_days: "14", fine_per_day: "10", reservation_hold_days: "3" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setF({ library_name: data.library_name, max_books: String(data.max_books), loan_days: String(data.loan_days), fine_per_day: String(data.fine_per_day), reservation_hold_days: String(data.reservation_hold_days) });
  }, [data]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("library_settings").update({
        library_name: f.library_name.trim(), max_books: Number(f.max_books), loan_days: Number(f.loan_days),
        fine_per_day: Number(f.fine_per_day), reservation_hold_days: Number(f.reservation_hold_days), updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const jobs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("process_library_jobs");
      if (error) throw error;
      return data as { expired: number; due_soon: number; overdue: number };
    },
    onSuccess: (r) => toast.success(`Done: ${r.due_soon} due-soon reminders, ${r.overdue} overdue alerts, ${r.expired} reservations expired`),
    onError: (e) => toast.error(errMsg(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.library_name.trim()) er.library_name = "Required";
    if (!(Number(f.max_books) >= 1 && Number(f.max_books) <= 50)) er.max_books = "1–50";
    if (!(Number(f.loan_days) >= 1 && Number(f.loan_days) <= 365)) er.loan_days = "1–365";
    if (!(Number(f.fine_per_day) >= 0)) er.fine_per_day = "0 or more";
    if (!(Number(f.reservation_hold_days) >= 1 && Number(f.reservation_hold_days) <= 30)) er.reservation_hold_days = "1–30";
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  return (
    <>
      <PageHeader title="Settings" description="These rules apply to every new issue, return and reservation." />
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Library rules</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Library name" required error={errs.library_name} className="sm:col-span-2"><Input value={f.library_name} onChange={set("library_name")} maxLength={80} /></Field>
            <Field label="Max books per student" required error={errs.max_books}><Input type="number" value={f.max_books} onChange={set("max_books")} /></Field>
            <Field label="Loan period (days)" required error={errs.loan_days}><Input type="number" value={f.loan_days} onChange={set("loan_days")} /></Field>
            <Field label="Fine per overdue day (₹)" required error={errs.fine_per_day}><Input type="number" step="0.5" value={f.fine_per_day} onChange={set("fine_per_day")} /></Field>
            <Field label="Reservation hold (days)" required error={errs.reservation_hold_days}><Input type="number" value={f.reservation_hold_days} onChange={set("reservation_hold_days")} /></Field>
            <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save settings</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Automatic reminders</CardTitle>
          <CardDescription>Every night the system sends due-date reminders and overdue alerts, and expires uncollected reservations. You can also run it now.</CardDescription></CardHeader>
        <CardContent><Button variant="outline" disabled={jobs.isPending} onClick={() => jobs.mutate()}>{jobs.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}Run now</Button></CardContent>
      </Card>
    </>
  );
}
