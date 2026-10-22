import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, Field, PageHeader, Pager, PAGE_SIZE, QueryState, SearchBox, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { useSticky } from "@/hooks/use-sticky";
import { errMsg, fmtDate, safeTerm } from "@/lib/format";

type Kind = "categories" | "authors" | "publishers";
const cfg = {
  categories: { title: "Categories", single: "category", textCol: "description", textLabel: "Description", view: "categories_view" },
  authors: { title: "Authors", single: "author", textCol: "bio", textLabel: "Short bio", view: "authors" },
  publishers: { title: "Publishers", single: "publisher", textCol: "description", textLabel: "Description", view: "publishers" },
} as const;

type Row = { id: string; name: string; text: string | null; created_at: string; book_count?: number };

export function SimpleCrud({ kind }: { kind: Kind }) {
  const c = cfg[kind];
  const qc = useQueryClient();
  const [q, setQ] = useSticky(`${kind}-q`, "");
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [del, setDel] = useState<Row | null>(null);

  const list = useQuery({
    queryKey: [kind, q, page],
    queryFn: async () => {
      let qb = supabase.from(c.view as "authors").select("*", { count: "exact" }).order("name");
      if (q.trim()) qb = qb.ilike("name", `%${safeTerm(q)}%`);
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return {
        rows: rows.map((r) => ({ id: r.id as string, name: r.name as string, text: (r[c.textCol] as string) ?? null, created_at: r.created_at as string, book_count: r.book_count as number | undefined })),
        count: count ?? 0,
      };
    },
  });

  const remove = useMutation({
    mutationFn: async (r: Row) => {
      if (kind === "categories" && (r.book_count ?? 0) > 0) throw new Error(`This category has ${r.book_count} book(s). Move them first.`);
      const { error } = await supabase.from(kind).delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`Deleted`); setDel(null); qc.invalidateQueries({ queryKey: [kind] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader title={c.title} description={`Manage library ${c.title.toLowerCase()}.`}
        actions={<Button onClick={() => setEdit("new")}><Plus className="size-4" />Add {c.single}</Button>} />
      <Toolbar><SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={`Search ${c.title.toLowerCase()}…`} /></Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText={`No ${c.title.toLowerCase()} found.`}>
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Name</th><th className={th}>{c.textLabel}</th>
                {kind === "categories" && <th className={th}>Books</th>}
                <th className={th}>Created</th><th className={`${th} text-right`}>Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className={`${td} font-medium`}>{r.name}</td>
                    <td className={`${td} max-w-xs truncate text-muted-foreground`}>{r.text || "—"}</td>
                    {kind === "categories" && <td className={`${td} tabular-nums`}>{r.book_count}</td>}
                    <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmtDate(r.created_at)}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(r)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="size-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
      {edit && <EditDialog kind={kind} row={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} destructive title={`Delete ${del?.name}?`}
        description="This cannot be undone." confirmText="Delete" loading={remove.isPending} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}

function EditDialog({ kind, row, onClose }: { kind: Kind; row: Row | null; onClose: () => void }) {
  const c = cfg[kind];
  const qc = useQueryClient();
  const [name, setName] = useState(row?.name ?? "");
  const [text, setText] = useState(row?.text ?? "");
  const [err, setErr] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), [c.textCol]: text.trim() || null } as { name: string };
      const { error } = row
        ? await supabase.from(kind).update(payload).eq("id", row.id)
        : await supabase.from(kind).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(row ? "Saved changes" : `Added ${c.single}`); qc.invalidateQueries({ queryKey: [kind] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? `Edit ${c.single}` : `Add ${c.single}`}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return setErr("Name is required"); save.mutate(); }}>
          <Field label="Name" required error={err}><Input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} maxLength={120} autoFocus /></Field>
          <Field label={c.textLabel}><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={3} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
