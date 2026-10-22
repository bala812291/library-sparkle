import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { PageHeader, RequireRole, SearchBox, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-current-user";
import { daysBetween, errMsg, fmtDate, inr, safeTerm, todayISO, txnCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/return")({
  head: () => headMeta("Return Book", "Return borrowed books and calculate overdue fines."),
  component: () => <AppShell title="Return Book"><RequireRole roles={["admin", "librarian"]}><ReturnPage /></RequireRole></AppShell>,
});

type Tx = Tables<"transactions_view">;
type Receipt = { txn_no: number; book_title: string; student_name: string; issue_date: string; due_date: string; return_date: string; overdue_days: number; fine: number; status: string };

function ReturnPage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Tx | null>(null);
  const [lost, setLost] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const results = useQuery({
    queryKey: ["return-search", q],
    enabled: safeTerm(q).length >= 2,
    queryFn: async () => {
      const t = safeTerm(q);
      const num = Number(t.replace(/^txn-?/i, ""));
      const ors = [`register_no.ilike.%${t}%`, `book_title.ilike.%${t}%`, `student_name.ilike.%${t}%`, `accession_no.ilike.%${t}%`];
      if (Number.isInteger(num) && num > 0) ors.push(`txn_no.eq.${num}`);
      const { data } = await supabase.from("transactions_view").select("*").eq("status", "issued").or(ors.join(",")).order("due_date").limit(10);
      return data ?? [];
    },
  });

  const today = todayISO();
  const days = sel ? Math.max(0, daysBetween(sel.due_date!, today)) : 0;
  const fine = days * Number(settings?.fine_per_day ?? 10);

  const ret = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("return_book", { p_tx: sel!.id!, p_lost: lost });
      if (error) throw error;
      return data as unknown as Receipt;
    },
    onSuccess: (r) => { toast.success(lost ? "Marked as lost" : "Book returned"); setReceipt(r); setSel(null); setLost(false); setQ(""); qc.invalidateQueries(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader title="Return Book" description="Search by transaction ID, register number, book title or accession number." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Find borrowed book</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <SearchBox value={q} onChange={(v) => { setQ(v); setSel(null); }} placeholder="TXN-00012, reg. no., title…" />
            {results.data?.map((t) => (
              <button key={t.id} onClick={() => setSel(t)} className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted ${sel?.id === t.id ? "border-primary bg-accent" : ""}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{t.book_title}</p>
                  <p className="truncate text-xs text-muted-foreground">{txnCode(t.txn_no)} · {t.student_name} · {t.register_no ?? "—"}</p></div>
                <StatusBadge status={t.is_overdue ? "overdue" : "issued"} />
              </button>
            ))}
            {results.data?.length === 0 && <p className="text-sm text-muted-foreground">No active loans match.</p>}
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Return details</CardTitle></CardHeader>
          <CardContent>
            {!sel ? <p className="text-sm text-muted-foreground">Select a borrowed book to see details.</p> : (
              <div className="space-y-3">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[["Transaction", txnCode(sel.txn_no)], ["Copy", sel.accession_no], ["Student", sel.student_name], ["Register no.", sel.register_no ?? "—"],
                    ["Issue date", fmtDate(sel.issue_date)], ["Due date", fmtDate(sel.due_date)], ["Return date", fmtDate(today)], ["Overdue days", days]].map(([k, v]) => (
                    <div key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
                <div className={`rounded-lg p-3 ${fine > 0 ? "bg-destructive/10" : "bg-success/10"}`}>
                  <p className="text-xs text-muted-foreground">Fine</p>
                  <p className="font-display text-2xl font-semibold">{inr(fine)}</p>
                  {fine > 0 && <p className="text-xs text-muted-foreground">{days} day(s) × {inr(settings?.fine_per_day)}</p>}
                </div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={lost} onCheckedChange={(c) => setLost(!!c)} />Mark this copy as lost</label>
                <Button className="w-full" disabled={ret.isPending} onClick={() => ret.mutate()}>{ret.isPending && <Loader2 className="size-4 animate-spin" />}Confirm {lost ? "lost" : "return"}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {receipt && (
        <Dialog open onOpenChange={(o) => !o && setReceipt(null)}>
          <DialogContent className="print-area">
            <DialogHeader><DialogTitle>Return receipt</DialogTitle></DialogHeader>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[["Transaction", txnCode(receipt.txn_no)], ["Status", receipt.status], ["Book", receipt.book_title], ["Student", receipt.student_name],
                ["Issued", fmtDate(receipt.issue_date)], ["Due", fmtDate(receipt.due_date)], ["Returned", fmtDate(receipt.return_date)],
                ["Overdue days", receipt.overdue_days], ["Fine", inr(receipt.fine)]].map(([k, v]) => (
                <div key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {receipt.fine > 0 && <p className="text-xs text-muted-foreground">The fine has been added to Fine Management.</p>}
            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
              <Button onClick={() => setReceipt(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
