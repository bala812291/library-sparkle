import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { Field, PageHeader, QueryState, RequireRole, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMsg, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/librarians")({
  head: () => headMeta("Librarians", "Manage librarian accounts and access."),
  component: () => <AppShell title="Librarians"><RequireRole roles={["admin"]}><LibrariansPage /></RequireRole></AppShell>,
});

type Lib = { id: string | null; full_name: string | null; email: string | null; employee_id: string | null; phone: string | null; is_active: boolean | null; issued_count: number | null; returned_count: number | null; created_at: string | null };

function LibrariansPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Lib | "new" | null>(null);
  const list = useQuery({
    queryKey: ["librarians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("librarians_view").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = (list.data ?? []).filter((l) => !q || `${l.full_name} ${l.email} ${l.employee_id}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = async (l: Lib) => {
    const { error } = await supabase.from("librarians").update({ is_active: !l.is_active }).eq("id", l.id!);
    if (error) return toast.error(errMsg(error));
    toast.success(l.is_active ? "Librarian deactivated — access removed" : "Librarian activated");
    qc.invalidateQueries({ queryKey: ["librarians"] });
  };
  return (
    <>
      <PageHeader title="Librarians" description="Only administrators can grant or remove librarian access."
        actions={<Button onClick={() => setEdit("new")}><Plus className="size-4" />Add librarian</Button>} />
      <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search librarians…" /></Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!rows.length} onRetry={() => list.refetch()} emptyText="No librarians yet.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Name</th><th className={th}>Email</th><th className={th}>Employee ID</th><th className={th}>Phone</th>
                <th className={th}>Issued</th><th className={th}>Returned</th><th className={th}>Since</th><th className={th}>Status</th><th className={`${th} text-right`}>Edit</th>
              </tr></thead>
              <tbody className="divide-y">
                {rows.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className={`${td} whitespace-nowrap font-medium`}>{l.full_name}</td>
                    <td className={`${td} text-muted-foreground`}>{l.email}</td>
                    <td className={td}>{l.employee_id ?? "—"}</td>
                    <td className={td}>{l.phone ?? "—"}</td>
                    <td className={`${td} tabular-nums`}>{l.issued_count}</td>
                    <td className={`${td} tabular-nums`}>{l.returned_count}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(l.created_at)}</td>
                    <td className={td}><div className="flex items-center gap-2"><Switch checked={!!l.is_active} onCheckedChange={() => toggle(l)} aria-label="Active" /><StatusBadge status={l.is_active ? "active" : "inactive"} /></div></td>
                    <td className={`${td} text-right`}><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(l)}><Pencil className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </TableCard>
      {edit && <LibForm lib={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function LibForm({ lib, onClose }: { lib: Lib | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(lib?.email ?? "");
  const [emp, setEmp] = useState(lib?.employee_id ?? "");
  const [phone, setPhone] = useState(lib?.phone ?? "");
  const [err, setErr] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("set_librarian", { p_email: email, p_employee_id: emp, p_phone: phone });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(lib ? "Librarian updated" : "Librarian access granted"); qc.invalidateQueries({ queryKey: ["librarians"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{lib ? "Edit librarian" : "Add librarian"}</DialogTitle>
          {!lib && <DialogDescription>Ask the person to create an account on the sign-in page first, then enter their email here to give them librarian access.</DialogDescription>}</DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email"); save.mutate(); }}>
          <Field label="Account email" required error={err}><Input type="email" value={email} disabled={!!lib} onChange={(e) => { setEmail(e.target.value); setErr(""); }} /></Field>
          <Field label="Employee ID"><Input value={emp} onChange={(e) => setEmp(e.target.value)} maxLength={30} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
