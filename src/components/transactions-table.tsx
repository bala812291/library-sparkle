import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pager, PAGE_SIZE, QueryState, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser, useSettings } from "@/hooks/use-current-user";
import { useSticky } from "@/hooks/use-sticky";
import { downloadCSV, fmtDate, inr, safeTerm, todayISO, txnCode } from "@/lib/format";

export function TransactionsTable({ mode }: { mode: "all" | "overdue" }) {
  const { data: me } = useCurrentUser();
  const staff = !!me?.isStaff;
  const rate = Number(useSettings().data?.fine_per_day ?? 10);
  const k = `tx-${mode}`;
  const [q, setQ] = useSticky(`${k}-q`, "");
  const [status, setStatus] = useSticky(`${k}-s`, mode === "overdue" ? "overdue" : "all");
  const [from, setFrom] = useSticky(`${k}-from`, "");
  const [to, setTo] = useSticky(`${k}-to`, "");
  const [page, setPage] = useState(0);

  const build = () => {
    let qb = supabase.from("transactions_view").select("*", { count: "exact" });
    const t = safeTerm(q);
    if (t) {
      const ors = [`book_title.ilike.%${t}%`, `student_name.ilike.%${t}%`, `register_no.ilike.%${t}%`, `accession_no.ilike.%${t}%`];
      const n = Number(t.replace(/^txn-?/i, ""));
      if (Number.isInteger(n) && n > 0) ors.push(`txn_no.eq.${n}`);
      qb = qb.or(ors.join(","));
    }
    if (status === "overdue") qb = qb.eq("status", "issued").lt("due_date", todayISO());
    else if (status !== "all") qb = qb.eq("status", status);
    if (from) qb = qb.gte("issue_date", from);
    if (to) qb = qb.lte("issue_date", to);
    return qb.order(status === "overdue" ? "due_date" : "created_at", { ascending: status === "overdue" });
  };
  const list = useQuery({
    queryKey: ["transactions", mode, q, status, from, to, page],
    queryFn: async () => {
      const { data, error, count } = await build().range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const exportCsv = async () => {
    const { data } = await build().limit(5000);
    downloadCSV(`transactions-${todayISO()}`, (data ?? []).map((t) => ({
      Transaction: txnCode(t.txn_no), Student: t.student_name, "Register No": t.register_no, Book: t.book_title, Copy: t.accession_no,
      "Issue Date": t.issue_date, "Due Date": t.due_date, "Return Date": t.return_date ?? "", Status: t.is_overdue ? "overdue" : t.status, "Days Late": t.days_late, Fine: t.fine_amount,
    })));
  };

  const title = mode === "overdue" ? "Overdue Books" : staff ? "Transactions" : "My Borrowed Books";
  return (
    <>
      <PageHeader title={title}
        description={mode === "overdue" ? "Books past their due date, oldest first." : staff ? "Every issue and return in the library." : "Your current loans and full borrowing history."}
        actions={staff && <Button variant="outline" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={staff ? "TXN no., student, book…" : "Search book…"} />
        {mode === "all" && (
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{["all", "issued", "overdue", "returned", "lost"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="w-auto" aria-label="Issued from" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="w-auto" aria-label="Issued to" />
        </div>
      </Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()}
          emptyText={mode === "overdue" ? "No overdue books 🎉" : "No transactions found."}>
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Txn</th>{staff && <th className={th}>Student</th>}<th className={th}>Book</th><th className={th}>Issued</th>
                <th className={th}>Due</th><th className={th}>Returned</th><th className={th}>Late</th><th className={th}>Fine</th><th className={th}>Status</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className={`${td} whitespace-nowrap font-mono text-xs`}>{txnCode(t.txn_no)}</td>
                    {staff && <td className={`${td} whitespace-nowrap`}><p className="font-medium">{t.student_name}</p><p className="text-xs text-muted-foreground">{t.register_no ?? "—"}</p></td>}
                    <td className={td}><p className="min-w-40 font-medium">{t.book_title}</p><p className="font-mono text-xs text-muted-foreground">{t.accession_no}</p></td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(t.issue_date)}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(t.due_date)}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(t.return_date)}</td>
                    <td className={`${td} tabular-nums`}>{t.days_late ? `${t.days_late}d` : "—"}</td>
                    <td className={`${td} tabular-nums`}>{t.status === "issued" ? (t.days_late ? `~${inr((t.days_late ?? 0) * rate)}` : "—") : t.fine_amount ? inr(t.fine_amount) : "—"}</td>
                    <td className={td}><StatusBadge status={t.is_overdue ? "overdue" : t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
    </>
  );
}
