import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { ConfirmDialog, PageHeader, Pager, PAGE_SIZE, QueryState, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSticky } from "@/hooks/use-sticky";
import { errMsg, fmtDate, fmtDateTime, safeTerm } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => headMeta("Reservations", "Book reservation queue and status."),
  component: () => <AppShell title="Reservations"><ReservationsPage /></AppShell>,
});

type R = Tables<"reservations_view">;

function ReservationsPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const staff = !!me?.isStaff;
  const [q, setQ] = useSticky("res-q", "");
  const [status, setStatus] = useSticky("res-s", "active");
  const [page, setPage] = useState(0);
  const [cancel, setCancel] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["reservations", q, status, page],
    queryFn: async () => {
      let qb = supabase.from("reservations_view").select("*", { count: "exact" }).order("created_at");
      const t = safeTerm(q);
      if (t) qb = qb.or(`book_title.ilike.%${t}%,student_name.ilike.%${t}%,register_no.ilike.%${t}%`);
      if (status === "active") qb = qb.in("status", ["pending", "ready"]);
      else if (status !== "all") qb = qb.eq("status", status);
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(ok); setCancel(null);
    qc.invalidateQueries({ queryKey: ["reservations"] });
  };

  return (
    <>
      <PageHeader title={staff ? "Reservations" : "My Reservations"}
        description={staff ? "Queue is first-come, first-served. Ready reservations are held for a few days, then expire." : "Books you've reserved. You'll be notified when one is ready."}
        actions={!staff && <Button asChild><Link to="/catalog">Reserve a book</Link></Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Book or student…" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (pending + ready)</SelectItem><SelectItem value="all">All</SelectItem>
            {["pending", "ready", "fulfilled", "cancelled", "expired"].map((s) => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}
          </SelectContent>
        </Select>
      </Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText="No reservations.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Book</th>{staff && <th className={th}>Student</th>}<th className={th}>Reserved</th><th className={th}>Queue</th>
                <th className={th}>Collect by</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className={`${td} min-w-40 font-medium`}>{r.book_title}</td>
                    {staff && <td className={`${td} whitespace-nowrap`}><p>{r.student_name}</p><p className="text-xs text-muted-foreground">{r.register_no ?? "—"}</p></td>}
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(r.created_at)}</td>
                    <td className={td}>{r.status === "pending" ? `#${r.queue_position}` : "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.status === "ready" ? fmtDateTime(r.expires_at) : "—"}</td>
                    <td className={td}><StatusBadge status={r.status} /></td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      {staff && r.status === "pending" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => supabase.rpc("mark_reservation_ready", { p_id: r.id! }), "Marked ready")}>Mark ready</Button>}
                      {staff && r.status === "ready" && <Button size="sm" variant="outline" asChild><Link to="/issue">Issue</Link></Button>}
                      {(r.status === "pending" || r.status === "ready") && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancel(r)}>Cancel</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
      <ConfirmDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} destructive title="Cancel reservation?"
        description={`"${cancel?.book_title}" will be released to the next person in the queue.`} confirmText="Cancel reservation" loading={busy}
        onConfirm={() => cancel && run(() => supabase.rpc("cancel_reservation", { p_id: cancel.id! }), "Reservation cancelled")} />
    </>
  );
}
