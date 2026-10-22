import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { PageHeader, Pager, QueryState, SearchBox, StatusBadge, Toolbar } from "@/components/kit";
import { BookDetails, CoverThumb, useLookups } from "@/components/book-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCovers } from "@/hooks/use-covers";
import { useSticky } from "@/hooks/use-sticky";
import { errMsg, safeTerm } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/catalog")({
  head: () => headMeta("Book Catalog", "Search and reserve library books."),
  component: () => <AppShell title="Search Books"><Catalog /></AppShell>,
});

const SIZE = 12;
type Book = Tables<"books_catalog">;

function Catalog() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const look = useLookups();
  const [q, setQ] = useSticky("cat-q", "");
  const [cat, setCat] = useSticky("cat-c", "all");
  const [avail, setAvail] = useSticky("cat-a", "all");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<Book | null>(null);

  const list = useQuery({
    queryKey: ["books", "catalog", q, cat, avail, page],
    queryFn: async () => {
      let qb = supabase.from("books_catalog").select("*", { count: "exact" }).order("title");
      const t = safeTerm(q);
      if (t) qb = qb.or(`title.ilike.%${t}%,isbn.ilike.%${t}%,author_names.ilike.%${t}%`);
      if (cat !== "all") qb = qb.eq("category_id", cat);
      if (avail === "available") qb = qb.gt("available_copies", 0);
      const { data, error, count } = await qb.range(page * SIZE, page * SIZE + SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const mine = useQuery({
    queryKey: ["reservations", "mine-active"],
    enabled: me?.roleKey === "student",
    queryFn: async () => {
      const { data } = await supabase.from("reservations").select("book_id").in("status", ["pending", "ready"]);
      return new Set((data ?? []).map((r) => r.book_id));
    },
  });
  const covers = useCovers(list.data?.rows.map((r) => r.cover_url) ?? []);
  const reserve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("reserve_book", { p_book: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Reserved! We'll notify you when it's ready."); qc.invalidateQueries({ queryKey: ["reservations"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const canReserve = me?.roleKey === "student" && me.student?.is_active;
  const reserveBtn = (b: Book) => canReserve && (
    mine.data?.has(b.id!) ? <Button size="sm" variant="secondary" disabled>Reserved</Button> :
    <Button size="sm" disabled={reserve.isPending} onClick={() => reserve.mutate(b.id!)}>{reserve.isPending && reserve.variables === b.id && <Loader2 className="size-4 animate-spin" />}Reserve</Button>
  );

  return (
    <>
      <PageHeader title="Book Catalog" description="Browse the collection. Reserve a book and collect it from the library desk." />
      {me?.roleKey === "student" && !me.student?.is_active && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Your account is deactivated, so you can't reserve books. Please contact the library.</p>}
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Title, author or ISBN…" />
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(0); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{look.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={avail} onValueChange={(v) => { setAvail(v); setPage(0); }}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All books</SelectItem><SelectItem value="available">Available now</SelectItem></SelectContent>
        </Select>
      </Toolbar>
      <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText="No books match your search.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.data?.rows.map((b) => (
            <Card key={b.id} className="shadow-card gap-0 py-0">
              <CardContent className="flex gap-3 p-3">
                <CoverThumb url={covers[b.cover_url ?? ""]} className="h-28 w-20" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-semibold">{b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.author_names}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.category_name}</p>
                  <div className="mt-1"><StatusBadge status={(b.available_copies ?? 0) > 0 ? "available" : "issued"} /></div>
                  <div className="mt-auto flex gap-1.5 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setView(b)}>Details</Button>
                    {reserveBtn(b)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-lg border bg-card"><Pager page={page} total={list.data?.count ?? 0} onPage={setPage} size={SIZE} /></div>
      </QueryState>
      {view && <BookDetails book={view} cover={covers[view.cover_url ?? ""]} onClose={() => setView(null)} footer={<div className="flex justify-end">{reserveBtn(view)}</div>} />}
    </>
  );
}
