import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Copy, Eye, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell, headMeta } from "@/components/app-shell";
import { ConfirmDialog, Field, PageHeader, Pager, PAGE_SIZE, QueryState, RequireRole, SearchBox, StatusBadge, TableCard, tableWrap, td, th, Toolbar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLookups, CoverThumb, BookDetails } from "@/components/book-bits";
import { useSticky } from "@/hooks/use-sticky";
import { useCovers } from "@/hooks/use-covers";
import { bookCode, errMsg, fmtDate, safeTerm } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/books")({
  head: () => headMeta("Books", "Manage the book catalog, physical copies and covers."),
  component: () => <AppShell title="Books"><RequireRole roles={["admin", "librarian"]}><BooksPage /></RequireRole></AppShell>,
});

type Book = Tables<"books_catalog">;

function BooksPage() {
  const qc = useQueryClient();
  const [q, setQ] = useSticky("books-q", "");
  const [cat, setCat] = useSticky("books-cat", "all");
  const [avail, setAvail] = useSticky("books-avail", "all");
  const [sort, setSort] = useSticky("books-sort", "asc");
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Book | "new" | null>(null);
  const [view, setView] = useState<Book | null>(null);
  const [copies, setCopies] = useState<Book | null>(null);
  const [del, setDel] = useState<Book | null>(null);
  const look = useLookups();

  const list = useQuery({
    queryKey: ["books", q, cat, avail, sort, page],
    queryFn: async () => {
      let qb = supabase.from("books_catalog").select("*", { count: "exact" }).order("title", { ascending: sort === "asc" });
      const t = safeTerm(q);
      if (t) qb = qb.or(`title.ilike.%${t}%,isbn.ilike.%${t}%,author_names.ilike.%${t}%`);
      if (cat !== "all") qb = qb.eq("category_id", cat);
      if (avail === "available") qb = qb.gt("available_copies", 0);
      if (avail === "unavailable") qb = qb.eq("available_copies", 0);
      const { data, error, count } = await qb.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const covers = useCovers(list.data?.rows.map((r) => r.cover_url) ?? []);

  const remove = useMutation({
    mutationFn: async (b: Book) => {
      if ((b.issued_copies ?? 0) > 0) throw new Error("This book has copies currently issued.");
      const { error } = await supabase.from("books").delete().eq("id", b.id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Book deleted"); setDel(null); qc.invalidateQueries({ queryKey: ["books"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader title="Books" description="Catalog of titles and their physical copies."
        actions={<Button onClick={() => setEdit("new")}><Plus className="size-4" />Add book</Button>} />
      <Toolbar>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Title, ISBN or author…" />
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(0); }}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>
            {look.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={avail} onValueChange={(v) => { setAvail(v); setPage(0); }}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any availability</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="unavailable">Unavailable</SelectItem></SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="asc">Title A–Z</SelectItem><SelectItem value="desc">Title Z–A</SelectItem></SelectContent>
        </Select>
      </Toolbar>
      <TableCard>
        <QueryState isLoading={list.isLoading} error={list.error} empty={!list.data?.rows.length} onRetry={() => list.refetch()} emptyText="No books found. Add your first book.">
          <div className={tableWrap}>
            <table className="w-full">
              <thead className="border-b bg-muted/40"><tr>
                <th className={th}>Book</th><th className={th}>ID / ISBN</th><th className={th}>Author</th><th className={th}>Category</th>
                <th className={th}>Copies</th><th className={th}>Available</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {list.data?.rows.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className={td}><div className="flex min-w-48 items-center gap-3"><CoverThumb url={covers[b.cover_url ?? ""]} /><span className="font-medium">{b.title}</span></div></td>
                    <td className={`${td} whitespace-nowrap text-xs text-muted-foreground`}>{bookCode(b.book_no)}<br />{b.isbn}</td>
                    <td className={`${td} max-w-40 truncate`}>{b.author_names || "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{b.category_name ?? "—"}</td>
                    <td className={`${td} tabular-nums`}>{b.total_copies}</td>
                    <td className={`${td} tabular-nums`}>{b.available_copies}</td>
                    <td className={td}><StatusBadge status={(b.available_copies ?? 0) > 0 ? "available" : (b.total_copies ?? 0) > 0 ? "issued" : "inactive"} /></td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(b)}><Eye className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Copies" onClick={() => setCopies(b)}><Copy className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(b)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDel(b)}><Trash2 className="size-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data?.count ?? 0} onPage={setPage} />
        </QueryState>
      </TableCard>
      {edit && <BookForm book={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {view && <BookDetails book={view} cover={covers[view.cover_url ?? ""]} onClose={() => setView(null)} />}
      {copies && <CopiesDialog book={copies} onClose={() => setCopies(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} destructive title={`Delete "${del?.title}"?`}
        description="All its copies will be removed. Books with borrowing history cannot be deleted." confirmText="Delete"
        loading={remove.isPending} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}

function BookForm({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const qc = useQueryClient();
  const look = useLookups();
  const [f, setF] = useState({
    title: book?.title ?? "", subtitle: book?.subtitle ?? "", isbn: book?.isbn ?? "", category_id: book?.category_id ?? "",
    publisher_id: book?.publisher_id ?? "", publication_year: book?.publication_year?.toString() ?? "", edition: book?.edition ?? "",
    language: book?.language ?? "English", description: book?.description ?? "", shelf: book?.shelf ?? "", rack: book?.rack ?? "", copies: "1",
  });
  const [authors, setAuthors] = useState<string[]>([]);
  const [newAuthor, setNewAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useQuery({
    queryKey: ["book-authors", book?.id],
    enabled: !!book,
    queryFn: async () => {
      const { data } = await supabase.from("book_authors").select("author_id").eq("book_id", book!.id!);
      setAuthors(data?.map((d) => d.author_id) ?? []);
      return data;
    },
  });

  const addAuthor = async () => {
    const name = newAuthor.trim();
    if (!name) return;
    const { data, error } = await supabase.from("authors").insert({ name }).select("id").single();
    if (error) return toast.error(errMsg(error));
    setAuthors([...authors, data.id]); setNewAuthor("");
    qc.invalidateQueries({ queryKey: ["lookups"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      let cover_url = book?.cover_url ?? null;
      if (file) {
        const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("book-covers").upload(path, file, { contentType: file.type });
        if (error) throw error;
        cover_url = path;
      }
      const payload = {
        title: f.title.trim(), subtitle: f.subtitle.trim() || null, isbn: f.isbn.trim(), category_id: f.category_id || null,
        publisher_id: f.publisher_id || null, publication_year: f.publication_year ? Number(f.publication_year) : null,
        edition: f.edition.trim() || null, language: f.language.trim() || null, description: f.description.trim() || null,
        shelf: f.shelf.trim() || null, rack: f.rack.trim() || null, cover_url,
      };
      let id = book?.id;
      if (book) {
        const { error } = await supabase.from("books").update(payload).eq("id", book.id!);
        if (error) throw error;
        await supabase.from("book_authors").delete().eq("book_id", book.id!);
      } else {
        const { data, error } = await supabase.from("books").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
        const n = Number(f.copies);
        if (n > 0) {
          const { error: e2 } = await supabase.from("book_copies").insert(Array.from({ length: n }, () => ({ book_id: id! })));
          if (e2) throw e2;
        }
      }
      if (authors.length) {
        const { error } = await supabase.from("book_authors").insert(authors.map((a) => ({ book_id: id!, author_id: a })));
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(book ? "Book updated" : "Book added"); qc.invalidateQueries({ queryKey: ["books"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.title.trim()) er.title = "Title is required";
    if (!/^[0-9Xx-]{10,17}$/.test(f.isbn.trim())) er.isbn = "Enter a valid 10 or 13 digit ISBN";
    if (!f.category_id) er.category_id = "Choose a category";
    if (!authors.length) er.authors = "Add at least one author";
    if (f.publication_year && !/^\d{4}$/.test(f.publication_year)) er.publication_year = "Use a 4-digit year";
    if (!book && !(Number(f.copies) >= 1 && Number(f.copies) <= 200)) er.copies = "Between 1 and 200";
    if (file && file.size > 5 * 1024 * 1024) er.cover = "Image must be under 5 MB";
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{book ? "Edit book" : "Add book"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required error={errs.title} className="sm:col-span-2"><Input value={f.title} onChange={set("title")} maxLength={200} /></Field>
          <Field label="Subtitle" className="sm:col-span-2"><Input value={f.subtitle} onChange={set("subtitle")} maxLength={200} /></Field>
          <Field label="ISBN" required error={errs.isbn}><Input value={f.isbn} onChange={set("isbn")} placeholder="978-0-13-235088-4" /></Field>
          <Field label="Category" required error={errs.category_id}>
            <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{look.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Authors" required error={errs.authors} className="sm:col-span-2">
            <div className="rounded-md border p-2">
              <div className="mb-2 flex flex-wrap gap-1">
                {authors.map((id) => <Badge key={id} variant="secondary" className="gap-1">{look.data?.authors.find((a) => a.id === id)?.name ?? "…"}
                  <button type="button" onClick={() => setAuthors(authors.filter((x) => x !== id))} aria-label="Remove"><X className="size-3" /></button></Badge>)}
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {look.data?.authors.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={authors.includes(a.id)} onCheckedChange={(c) => setAuthors(c ? [...authors, a.id] : authors.filter((x) => x !== a.id))} />{a.name}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="New author name" className="h-8"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthor(); } }} />
                <Button type="button" size="sm" variant="outline" onClick={addAuthor}>Add</Button>
              </div>
            </div>
          </Field>
          <Field label="Publisher">
            <Select value={f.publisher_id || "none"} onValueChange={(v) => setF({ ...f, publisher_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">None</SelectItem>{look.data?.publishers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Publication year" error={errs.publication_year}><Input value={f.publication_year} onChange={set("publication_year")} inputMode="numeric" maxLength={4} /></Field>
          <Field label="Edition"><Input value={f.edition} onChange={set("edition")} maxLength={40} /></Field>
          <Field label="Language"><Input value={f.language} onChange={set("language")} maxLength={40} /></Field>
          <Field label="Shelf"><Input value={f.shelf} onChange={set("shelf")} maxLength={20} /></Field>
          <Field label="Rack"><Input value={f.rack} onChange={set("rack")} maxLength={20} /></Field>
          {!book && <Field label="Number of copies" required error={errs.copies}><Input type="number" min={1} max={200} value={f.copies} onChange={set("copies")} /></Field>}
          <Field label="Cover image" error={errs.cover}>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground hover:bg-muted">
              <Upload className="size-4" /><span className="truncate">{file?.name ?? (book?.cover_url ? "Replace cover" : "Choose image")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={set("description")} rows={3} maxLength={2000} /></Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{book ? "Save changes" : "Add book"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CopiesDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const qc = useQueryClient();
  const [n, setN] = useState("1");
  const copies = useQuery({
    queryKey: ["copies", book.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("book_copies").select("*").eq("book_id", book.id!).order("accession_no");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["copies", book.id] }); qc.invalidateQueries({ queryKey: ["books"] }); };
  const add = useMutation({
    mutationFn: async () => {
      const k = Number(n);
      if (!(k >= 1 && k <= 100)) throw new Error("Enter 1–100 copies");
      const { error } = await supabase.from("book_copies").insert(Array.from({ length: k }, () => ({ book_id: book.id! })));
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Copies added"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("book_copies").update({ status }).eq("id", id);
    if (error) toast.error(errMsg(error)); else { toast.success("Status updated"); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("book_copies").delete().eq("id", id);
    if (error) toast.error(errMsg(error)); else { toast.success("Copy removed"); refresh(); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Copies · {book.title}</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input type="number" min={1} max={100} value={n} onChange={(e) => setN(e.target.value)} className="w-24" />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>{add.isPending && <Loader2 className="size-4 animate-spin" />}Add copies</Button>
        </div>
        <QueryState isLoading={copies.isLoading} error={copies.error} empty={!copies.data?.length} emptyText="No copies yet.">
          <div className="divide-y rounded-md border">
            {copies.data?.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 font-mono text-sm">{c.accession_no}</span>
                {c.status === "issued" ? <StatusBadge status="issued" /> : (
                  <Select value={c.status} onValueChange={(v) => update(c.id, v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{["available", "damaged", "lost", "maintenance"].map((s) => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Button size="icon" variant="ghost" disabled={c.status === "issued"} onClick={() => remove(c.id)} aria-label="Remove copy"><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </QueryState>
      </DialogContent>
    </Dialog>
  );
}
