import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { Field, PageHeader, Pager, PAGE_SIZE, QueryState, RequireRole, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSticky } from "@/hooks/use-sticky";
import { DEPARTMENTS, errMsg, fmtDate, inr, safeTerm, txnCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => headMeta("Students", "Manage student accounts, borrowing and fines."),
  component: () => <AppShell title="Students"><RequireRole roles={["admin", "librarian"]}><StudentsPage /></RequireRole></AppShell>,
});

type Student = Tables<"students">;

function StudentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useSticky("students-q", "");
  const [dept, setDept] = useSticky("students-dept", "all");
  const [status, setStatus] = useSticky("students-status", "all");
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Student | "new" | null>(null);
  const [view, setView] = useState<Student | null>(null);

  const list = useQuery({
    queryKey: ["students", q, dept, status, page],
    queryFn: async () => {
      let qb = supabase.from("students").select("*", { count: "exact" }).order("full_name");
      const t = safeTerm(q);
      if (t) qb = qb.or(`full_name.ilike.%${t}%,register_no.ilike.%${t}%,email.ilike.%${t}%`);
      if (dept !== "all") qb = qb.eq("department", dept);
      if (status !== "all") qb = qb.eq("is_active", status === "active");
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const toggle = async (s: Student) => {
    const { error } = await supabase.from("students").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(errMsg(error));
    toast.success(s.is_active ? "Student deactivated" : "Student activated");
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  return (
    <>
      <PageHeader title="Students" description="Registered students. Students who sign up appear here automatically."
        actions={<Button onClick={() => setEdit("new")}><Plus className="size-4" />Add student</Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Name, register no. or email…" />
        <Select value={dept} onValueChange={(v) => { setDept(v); setPage(0); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All departments</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText="No students found.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Register no.</th><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Department</th>
                <th className={th}>Course / Year</th><th className={th}>Phone</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className={`${td} font-mono text-xs`}>{s.register_no ?? <span className="text-warning">Not set</span>}</td>
                    <td className={`${td} whitespace-nowrap font-medium`}>{s.full_name}</td>
                    <td className={`${td} text-muted-foreground`}>{s.email}</td>
                    <td className={`${td} whitespace-nowrap`}>{s.department ?? "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{[s.course, s.academic_year].filter(Boolean).join(" · ") || "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{s.phone ?? "—"}</td>
                    <td className={td}><div className="flex items-center gap-2"><Switch checked={s.is_active} onCheckedChange={() => toggle(s)} aria-label="Active" /><StatusBadge status={s.is_active ? "active" : "inactive"} /></div></td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(s)}><Eye className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(s)}><Pencil className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
      {edit && <StudentForm student={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {view && <StudentProfile student={view} onClose={() => setView(null)} />}
    </>
  );
}

function StudentForm({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    register_no: student?.register_no ?? "", full_name: student?.full_name ?? "", email: student?.email ?? "",
    department: student?.department ?? "", course: student?.course ?? "", academic_year: student?.academic_year ?? "", phone: student?.phone ?? "",
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: async () => {
      const p = {
        register_no: f.register_no.trim().toUpperCase(), full_name: f.full_name.trim(), email: f.email.trim().toLowerCase(),
        department: f.department || null, course: f.course.trim() || null, academic_year: f.academic_year || null, phone: f.phone.trim() || null,
      };
      const { error } = student ? await supabase.from("students").update(p).eq("id", student.id) : await supabase.from("students").insert(p);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(student ? "Student updated" : "Student added"); qc.invalidateQueries({ queryKey: ["students"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.register_no.trim()) er.register_no = "Register number is required";
    if (!f.full_name.trim()) er.full_name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = "Enter a valid email";
    if (!f.department) er.department = "Choose a department";
    if (f.phone && !/^[+\d\s-]{7,15}$/.test(f.phone)) er.phone = "Enter a valid phone number";
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Register number" required error={errs.register_no}><Input value={f.register_no} onChange={set("register_no")} maxLength={30} /></Field>
          <Field label="Full name" required error={errs.full_name}><Input value={f.full_name} onChange={set("full_name")} maxLength={100} /></Field>
          <Field label="Email" required error={errs.email} className="sm:col-span-2"><Input type="email" value={f.email} onChange={set("email")} disabled={!!student?.user_id} /></Field>
          <Field label="Department" required error={errs.department}>
            <Select value={f.department} onValueChange={(v) => setF({ ...f, department: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Course"><Input value={f.course} onChange={set("course")} placeholder="B.E. / B.Tech / MCA" maxLength={50} /></Field>
          <Field label="Academic year">
            <Select value={f.academic_year} onValueChange={(v) => setF({ ...f, academic_year: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Phone" error={errs.phone}><Input value={f.phone} onChange={set("phone")} inputMode="tel" maxLength={15} /></Field>
          {!student && <p className="text-xs text-muted-foreground sm:col-span-2">When this student signs up with the same email, their login is linked to this record automatically.</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudentProfile({ student, onClose }: { student: Student; onClose: () => void }) {
  const data = useQuery({
    queryKey: ["student-profile", student.id],
    queryFn: async () => {
      const [tx, fines] = await Promise.all([
        supabase.from("transactions_view").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("fines_view").select("*").eq("student_id", student.id).order("created_at", { ascending: false }),
      ]);
      return { tx: tx.data ?? [], fines: fines.data ?? [] };
    },
  });
  const current = data.data?.tx.filter((t) => t.status === "issued") ?? [];
  const overdue = current.filter((t) => t.is_overdue);
  const outstanding = data.data?.fines.reduce((s, f) => s + Number(f.outstanding ?? 0), 0) ?? 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{student.full_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{student.register_no ?? "No register no."} · {student.email} · {student.department ?? "—"}</p></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Borrowed", current.length], ["Overdue", overdue.length], ["Fines due", inr(outstanding)]].map(([k, v]) => (
            <div key={k as string} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-lg font-semibold">{v}</p></div>
          ))}
        </div>
        <Tabs defaultValue="current">
          <TabsList className="w-full"><TabsTrigger value="current">Borrowed</TabsTrigger><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="fines">Fines</TabsTrigger></TabsList>
          <TabsContent value="current"><MiniList rows={current.map((t) => [t.book_title, `Due ${fmtDate(t.due_date)}`, t.is_overdue ? "overdue" : "issued"])} /></TabsContent>
          <TabsContent value="history"><MiniList rows={(data.data?.tx ?? []).map((t) => [t.book_title, `${txnCode(t.txn_no)} · ${fmtDate(t.issue_date)}`, t.status])} /></TabsContent>
          <TabsContent value="fines"><MiniList rows={(data.data?.fines ?? []).map((f) => [f.book_title, `${inr(f.amount)} · paid ${inr(f.amount_paid)}`, f.status])} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MiniList({ rows }: { rows: (string | null)[][] }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show.</p>;
  return (
    <div className="divide-y rounded-md border">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{r[0]}</p><p className="text-xs text-muted-foreground">{r[1]}</p></div>
          <StatusBadge status={r[2]} />
        </div>
      ))}
    </div>
  );
}
