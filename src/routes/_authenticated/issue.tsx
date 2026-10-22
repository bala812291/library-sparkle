import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, UserRound, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { ConfirmDialog, PageHeader, RequireRole, SearchBox, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-current-user";
import { addDaysISO, errMsg, fmtDate, inr, safeTerm, txnCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/issue")({
  head: () => headMeta("Issue Book", "Issue a physical book copy to a student."),
  component: () => <AppShell title="Issue Book"><RequireRole roles={["admin", "librarian"]}><IssuePage /></RequireRole></AppShell>,
});

type Student = Tables<"students">;
type CopyRow = { id: string; accession_no: string; book_id: string; title: string; authors: string };

function IssuePage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [sq, setSq] = useState("");
  const [bq, setBq] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [copy, setCopy] = useState<CopyRow | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ txn: number; due: string } | null>(null);

  const students = useQuery({
    queryKey: ["issue-students", sq],
    enabled: safeTerm(sq).length >= 2,
    queryFn: async () => {
      const t = safeTerm(sq);
      const { data } = await supabase.from("students").select("*").or(`register_no.ilike.%${t}%,full_name.ilike.%${t}%,email.ilike.%${t}%`).limit(6);
      return data ?? [];
    },
  });
  const status = useQuery({
    queryKey: ["issue-student-status", student?.id],
    enabled: !!student,
    queryFn: async () => {
      const [tx, fines] = await Promise.all([
        supabase.from("transactions_view").select("*").eq("student_id", student!.id).eq("status", "issued"),
        supabase.from("fines_view").select("outstanding").eq("student_id", student!.id),
      ]);
      return { active: tx.data ?? [], outstanding: (fines.data ?? []).reduce((s, f) => s + Number(f.outstanding ?? 0), 0) };
    },
  });
  const copies = useQuery({
    queryKey: ["issue-copies", bq],
    enabled: safeTerm(bq).length >= 2,
    queryFn: async () => {
      const t = safeTerm(bq);
      const { data: books } = await supabase.from("books_catalog").select("id,title,author_names").or(`title.ilike.%${t}%,isbn.ilike.%${t}%,author_names.ilike.%${t}%`).limit(10);
      const { data: byAcc } = await supabase.from("book_copies").select("id,accession_no,book_id,status").ilike("accession_no", `%${t}%`).eq("status", "available").limit(10);
      const ids = Array.from(new Set([...(books ?? []).map((b) => b.id!), ...(byAcc ?? []).map((c) => c.book_id)]));
      if (!ids.length) return [];
      const [{ data: cs }, { data: bs }] = await Promise.all([
        supabase.from("book_copies").select("id,accession_no,book_id").in("book_id", ids).eq("status", "available").order("accession_no").limit(30),
        supabase.from("books_catalog").select("id,title,author_names").in("id", ids),
      ]);
      const bm = new Map((bs ?? []).map((b) => [b.id, b]));
      return (cs ?? []).map((c) => ({ ...c, title: bm.get(c.book_id)?.title ?? "", authors: bm.get(c.book_id)?.author_names ?? "" })) as CopyRow[];
    },
  });

  const max = settings?.max_books ?? 3;
  const activeCount = status.data?.active.length ?? 0;
  const blockers: string[] = [];
  if (student && !student.is_active) blockers.push("Student account is deactivated.");
  if (student && status.data && activeCount >= max) blockers.push(`Borrowing limit reached (${activeCount}/${max}).`);
  if (student && status.data?.active.some((t) => t.book_id === copy?.book_id)) blockers.push("Student already has a copy of this book.");
  const due = addDaysISO(settings?.loan_days ?? 14);

  const issue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("issue_book", { p_student: student!.id, p_copy: copy!.id });
      if (error) throw error;
      const { data: tx } = await supabase.from("borrowing_transactions").select("txn_no,due_date").eq("id", data).single();
      return tx;
    },
    onSuccess: (tx) => {
      toast.success("Book issued successfully");
      setDone({ txn: tx?.txn_no ?? 0, due: tx?.due_date ?? due });
      setConfirm(false); setCopy(null); setBq("");
      qc.invalidateQueries();
    },
    onError: (e) => { setConfirm(false); toast.error(errMsg(e)); },
  });

  return (
    <>
      <PageHeader title="Issue Book" description={`Loan period ${settings?.loan_days ?? 14} days · up to ${max} books per student · fine ${inr(settings?.fine_per_day ?? 10)}/day late.`} />
      {done && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <CheckCircle2 className="size-6 text-success" />
            <div className="flex-1"><p className="font-medium">Issued · {txnCode(done.txn)}</p><p className="text-sm text-muted-foreground">Due back on {fmtDate(done.due)}</p></div>
            <Button variant="outline" size="sm" onClick={() => setDone(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4" />1. Find student</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SearchBox value={sq} onChange={(v) => { setSq(v); setStudent(null); }} placeholder="Register no., name or email" />
            {!student && students.data?.map((s) => (
              <button key={s.id} onClick={() => setStudent(s)} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted">
                <div><p className="text-sm font-medium">{s.full_name}</p><p className="text-xs text-muted-foreground">{s.register_no ?? "No reg. no."} · {s.department ?? "—"}</p></div>
                <StatusBadge status={s.is_active ? "active" : "inactive"} />
              </button>
            ))}
            {!student && students.data?.length === 0 && <p className="text-sm text-muted-foreground">No student matches.</p>}
            {student && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between"><p className="font-semibold">{student.full_name}</p><StatusBadge status={student.is_active ? "active" : "inactive"} /></div>
                <p className="text-muted-foreground">{student.register_no ?? "No reg. no."} · {student.department ?? "—"} · {student.email}</p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="rounded-md bg-card p-2"><p className="text-xs text-muted-foreground">Borrowed</p><p className="font-semibold">{activeCount}/{max}</p></div>
                  <div className="rounded-md bg-card p-2"><p className="text-xs text-muted-foreground">Overdue</p><p className="font-semibold">{status.data?.active.filter((t) => t.is_overdue).length ?? 0}</p></div>
                  <div className="rounded-md bg-card p-2"><p className="text-xs text-muted-foreground">Fines due</p><p className="font-semibold">{inr(status.data?.outstanding)}</p></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStudent(null)}>Change student</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" />2. Select available copy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SearchBox value={bq} onChange={(v) => { setBq(v); setCopy(null); }} placeholder="Title, ISBN, author or accession no." />
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {copies.data?.map((c) => (
                <button key={c.id} onClick={() => setCopy(c)} className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted ${copy?.id === c.id ? "border-primary bg-accent" : ""}`}>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{c.title}</p><p className="truncate text-xs text-muted-foreground">{c.authors}</p></div>
                  <span className="shrink-0 font-mono text-xs">{c.accession_no}</span>
                </button>
              ))}
              {copies.data?.length === 0 && <p className="text-sm text-muted-foreground">No available copies match.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">3. Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Student</dt><dd className="font-medium">{student?.full_name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Book</dt><dd className="font-medium">{copy ? `${copy.title} (${copy.accession_no})` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Issue date</dt><dd className="font-medium">{fmtDate(new Date().toISOString())}</dd></div>
            <div><dt className="text-muted-foreground">Due date</dt><dd className="font-medium">{fmtDate(due)}</dd></div>
          </dl>
          {blockers.map((b) => <p key={b} className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" />{b}</p>)}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!student || !copy || blockers.length > 0 || issue.isPending} onClick={() => setConfirm(true)}>Issue book</Button>
            <Button variant="outline" asChild><Link to="/transactions">View transactions</Link></Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Confirm issue" confirmText="Issue" loading={issue.isPending}
        description={<>Issue <b>{copy?.title}</b> ({copy?.accession_no}) to <b>{student?.full_name}</b>, due {fmtDate(due)}?</>}
        onConfirm={() => issue.mutate()} />
    </>
  );
}
