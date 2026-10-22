import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Loader2, Printer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { Field, PageHeader, Pager, PAGE_SIZE, QueryState, SearchBox, StatCard, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSticky } from "@/hooks/use-sticky";
import { downloadCSV, errMsg, fineCode, fmtDate, fmtDateTime, inr, receiptCode, safeTerm, todayISO } from "@/lib/format";
import { IndianRupee, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fines")({
  head: () => headMeta("Fines", "Overdue fines, payments and receipts."),
  component: () => <AppShell title="Fines"><FinesPage /></AppShell>,
});

type Fine = Tables<"fines_view">;

function FinesPage() {
  const { data: me } = useCurrentUser();
  const staff = !!me?.isStaff;
  const [q, setQ] = useSticky("fines-q", "");
  const [status, setStatus] = useSticky("fines-s", "all");
  const [from, setFrom] = useSticky("fines-from", "");
  const [to, setTo] = useSticky("fines-to", "");
  const [page, setPage] = useState(0);
  const [pay, setPay] = useState<Fine | null>(null);
  const [hist, setHist] = useState<Fine | null>(null);

  const build = () => {
    let qb = supabase.from("fines_view").select("*", { count: "exact" }).order("created_at", { ascending: false });
    const t = safeTerm(q);
    if (t) qb = qb.or(`student_name.ilike.%${t}%,register_no.ilike.%${t}%,book_title.ilike.%${t}%`);
    if (status !== "all") qb = qb.eq("status", status);
    if (from) qb = qb.gte("created_at", from);
    if (to) qb = qb.lte("created_at", to + "T23:59:59");
    return qb;
  };
  const list = useQuery({
    queryKey: ["fines", q, status, from, to, page],
    queryFn: async () => {
      const { data, error, count } = await build().range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const totals = useQuery({
    queryKey: ["fines", "totals"],
    queryFn: async () => {
      const { data } = await supabase.from("fines").select("amount, amount_paid");
      const a = (data ?? []).reduce((s, f) => s + Number(f.amount), 0);
      const p = (data ?? []).reduce((s, f) => s + Number(f.amount_paid), 0);
      return { assessed: a, paid: p, outstanding: a - p };
    },
  });
  const exportCsv = async () => {
    const { data } = await build().limit(5000);
    downloadCSV(`fines-${todayISO()}`, (data ?? []).map((f) => ({
      "Fine ID": fineCode(f.fine_no), Student: f.student_name, "Register No": f.register_no, Book: f.book_title, "Overdue Days": f.overdue_days,
      Total: f.amount, Paid: f.amount_paid, Outstanding: f.outstanding, Status: f.status, Date: f.created_at?.slice(0, 10),
    })));
  };

  return (
    <>
      <PageHeader title={staff ? "Fine Management" : "My Fines"} description={staff ? "Record payments (partial allowed) and track balances." : "Fines from late returns and your payments."}
        actions={staff && <Button variant="outline" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total assessed" value={inr(totals.data?.assessed)} icon={IndianRupee} loading={totals.isLoading} />
        <StatCard label="Collected" value={inr(totals.data?.paid)} icon={CheckCircle2} toneClass="bg-success/12 text-success" loading={totals.isLoading} />
        <StatCard label="Outstanding" value={inr(totals.data?.outstanding)} icon={AlertTriangle} toneClass="bg-destructive/10 text-destructive" loading={totals.isLoading} />
      </div>
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={staff ? "Student, register no., book…" : "Search book…"} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="partially_paid">Partially Paid</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="w-auto" aria-label="From" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="w-auto" aria-label="To" />
        </div>
      </Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText="No fines found.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Fine ID</th>{staff && <th className={th}>Student</th>}<th className={th}>Book</th><th className={th}>Days</th>
                <th className={th}>Total</th><th className={th}>Paid</th><th className={th}>Balance</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className={`${td} whitespace-nowrap font-mono text-xs`}>{fineCode(f.fine_no)}<br /><span className="text-muted-foreground">{fmtDate(f.created_at)}</span></td>
                    {staff && <td className={`${td} whitespace-nowrap`}><p className="font-medium">{f.student_name}</p><p className="text-xs text-muted-foreground">{f.register_no ?? "—"}</p></td>}
                    <td className={`${td} min-w-40`}>{f.book_title}</td>
                    <td className={`${td} tabular-nums`}>{f.overdue_days}</td>
                    <td className={`${td} tabular-nums`}>{inr(f.amount)}</td>
                    <td className={`${td} tabular-nums`}>{inr(f.amount_paid)}</td>
                    <td className={`${td} font-semibold tabular-nums`}>{inr(f.outstanding)}</td>
                    <td className={td}><StatusBadge status={f.status} /></td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      {staff && Number(f.outstanding) > 0 && <Button size="sm" onClick={() => setPay(f)}><Wallet className="size-4" />Pay</Button>}
                      <Button size="icon" variant="ghost" aria-label="Payment history" onClick={() => setHist(f)}><History className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
      {pay && <PayDialog fine={pay} onClose={() => setPay(null)} />}
      {hist && <HistoryDialog fine={hist} onClose={() => setHist(null)} />}
    </>
  );
}

function PayDialog({ fine, onClose }: { fine: Fine; onClose: () => void }) {
  const qc = useQueryClient();
  const out = Number(fine.outstanding);
  const [amount, setAmount] = useState(String(out));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [ref] = useState(() => crypto.randomUUID());
  const [err, setErr] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("record_fine_payment", { p_fine: fine.id!, p_amount: Number(amount), p_method: method, p_note: note, p_ref: ref });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries({ queryKey: ["fines"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setErr("Enter an amount greater than zero");
    if (n > out) return setErr(`Cannot exceed balance of ${inr(out)}`);
    save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment · {fineCode(fine.fine_no)}</DialogTitle>
          <p className="text-sm text-muted-foreground">{fine.student_name} · {fine.book_title} · balance {inr(out)}</p></DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Amount (₹)" required error={err}><Input type="number" step="0.01" min="0.01" max={out} value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }} /></Field>
          <Field label="Method">
            <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent></Select>
          </Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ fine, onClose }: { fine: Fine; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [receipt, setReceipt] = useState<Tables<"fine_payments"> | null>(null);
  const pays = useQuery({
    queryKey: ["fines", "payments", fine.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("fine_payments").select("*").eq("fine_id", fine.id!).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const reverse = async (id: string) => {
    const reason = window.prompt("Reason for reversing this payment?");
    if (!reason?.trim()) return;
    const { error } = await supabase.rpc("reverse_fine_payment", { p_payment: id, p_reason: reason });
    if (error) return toast.error(errMsg(error));
    toast.success("Payment reversed");
    qc.invalidateQueries({ queryKey: ["fines"] });
  };
  const reversed = new Set(pays.data?.map((p) => p.reverses_payment_id).filter(Boolean));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Payment history · {fineCode(fine.fine_no)}</DialogTitle>
          <p className="text-sm text-muted-foreground">Total {inr(fine.amount)} · paid {inr(fine.amount_paid)} · balance {inr(fine.outstanding)}</p></DialogHeader>
        {receipt ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-display text-lg font-semibold">Payment receipt</p>
              <dl className="mt-2 grid grid-cols-2 gap-1.5">
                {[["Receipt", receiptCode(receipt.receipt_no)], ["Date", fmtDateTime(receipt.created_at)], ["Student", fine.student_name], ["Register no.", fine.register_no ?? "—"],
                  ["Book", fine.book_title], ["Fine", fineCode(fine.fine_no)], ["Amount", inr(receipt.amount)], ["Method", receipt.method ?? "—"]].map(([k, v]) => (
                  <div key={k as string} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>))}
              </dl>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setReceipt(null)}>Back</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print</Button></DialogFooter>
          </div>
        ) : (
          <QueryState isLoading={pays.isLoading} error={pays.error} empty={!pays.data?.length} emptyText="No payments yet.">
            <div className="divide-y rounded-md border">
              {pays.data?.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="flex-1"><p className="font-medium">{p.kind === "reversal" ? "Reversal" : "Payment"} · {inr(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{receiptCode(p.receipt_no)} · {fmtDateTime(p.created_at)} {p.method && `· ${p.method}`} {p.note && `· ${p.note}`}</p></div>
                  {p.kind === "payment" && <Button size="sm" variant="ghost" onClick={() => setReceipt(p)}>Receipt</Button>}
                  {p.kind === "payment" && me?.isAdmin && !reversed.has(p.id) && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reverse(p.id)}>Reverse</Button>}
                </div>
              ))}
            </div>
          </QueryState>
        )}
      </DialogContent>
    </Dialog>
  );
}
