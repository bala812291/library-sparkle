import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { PageHeader, Pager, PAGE_SIZE, QueryState, TableCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errMsg, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => headMeta("Notifications", "Your library alerts and reminders."),
  component: () => <AppShell title="Notifications"><NotificationsPage /></AppShell>,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["notifications", "page", tab, page],
    queryFn: async () => {
      let qb = supabase.from("notifications").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (tab === "unread") qb = qb.eq("is_read", false);
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const act = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p;
    if (error) return toast.error(errMsg(error));
    if (ok) toast.success(ok);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <>
      <PageHeader title="Notifications" description="Due-date reminders, overdue alerts, reservations and payments."
        actions={<Button variant="outline" onClick={() => act(supabase.from("notifications").update({ is_read: true }).eq("user_id", me!.id).eq("is_read", false), "All marked as read")}><CheckCheck className="size-4" />Mark all read</Button>} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(0); }}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList></Tabs>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} emptyText="No notifications.">
          <div className="divide-y">
            {list.data?.rows.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.is_read ? "" : "bg-accent/40"}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.is_read ? "" : "font-semibold"}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && <Button size="icon" variant="ghost" aria-label="Mark read" onClick={() => act(supabase.from("notifications").update({ is_read: true }).eq("id", n.id))}><Check className="size-4" /></Button>}
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => act(supabase.from("notifications").delete().eq("id", n.id), "Deleted")}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
    </>
  );
}
