import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { PageHeader, Pager, PAGE_SIZE, QueryState, RequireRole, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { fmtDateTime, safeTerm } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => headMeta("Activity Logs", "Audit trail of library actions."),
  component: () => <AppShell title="Activity Logs"><RequireRole roles={["admin"]}><ActivityPage /></RequireRole></AppShell>,
});

function ActivityPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["activity", q, page],
    queryFn: async () => {
      let qb = supabase.from("activity_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
      const t = safeTerm(q);
      if (t) qb = qb.or(`action.ilike.%${t}%,entity.ilike.%${t}%,details.ilike.%${t}%`);
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((d) => d.actor_id).filter(Boolean) as string[]));
      const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return { rows: (data ?? []).map((d) => ({ ...d, actor: d.actor_id ? names.get(d.actor_id) ?? "User" : "System" })), count: count ?? 0 };
    },
  });
  return (
    <>
      <PageHeader title="Activity Logs" description="Every change to books, students, circulation and fines." />
      <Toolbar><SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Action, entity or detail…" /></Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} emptyText="No activity yet.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Area</th><th className={th}>Details</th></tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((l) => (
                  <tr key={l.id}>
                    <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmtDateTime(l.created_at)}</td>
                    <td className={`${td} whitespace-nowrap`}>{l.actor}</td>
                    <td className={td}><StatusBadge status={l.action} /></td>
                    <td className={`${td} capitalize`}>{l.entity.replace(/_/g, " ")}</td>
                    <td className={`${td} max-w-sm truncate`}>{l.details ?? "—"}</td>
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
