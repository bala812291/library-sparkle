import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bookCode, fmtDate } from "@/lib/format";

type Book = Tables<"books_catalog">;

export function useLookups() {
  return useQuery({
    queryKey: ["lookups"],
    queryFn: async () => {
      const [c, a, p] = await Promise.all([
        supabase.from("categories").select("id,name").order("name"),
        supabase.from("authors").select("id,name").order("name"),
        supabase.from("publishers").select("id,name").order("name"),
      ]);
      return { categories: c.data ?? [], authors: a.data ?? [], publishers: p.data ?? [] };
    },
  });
}

export function CoverThumb({ url, className = "h-12 w-9" }: { url?: string; className?: string }) {
  return url
    ? <img src={url} alt="" className={`${className} shrink-0 rounded object-cover shadow-sm`} loading="lazy" />
    : <div className={`${className} grid shrink-0 place-items-center rounded bg-muted text-muted-foreground`}><BookOpen className="size-4" /></div>;
}

export function BookDetails({ book, cover, onClose, footer }: { book: Book; cover?: string; onClose: () => void; footer?: ReactNode }) {
  const rows: [string, ReactNode][] = [
    ["Book ID", bookCode(book.book_no)], ["ISBN", book.isbn], ["Author(s)", book.author_names || "—"], ["Category", book.category_name ?? "—"],
    ["Publisher", book.publisher_name ?? "—"], ["Year", book.publication_year ?? "—"], ["Edition", book.edition || "—"], ["Language", book.language || "—"],
    ["Location", [book.shelf && `Shelf ${book.shelf}`, book.rack && `Rack ${book.rack}`].filter(Boolean).join(", ") || "—"],
    ["Copies", `${book.available_copies} available of ${book.total_copies}`], ["Added", fmtDate(book.created_at)],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{book.title}</DialogTitle>{book.subtitle && <p className="text-sm text-muted-foreground">{book.subtitle}</p>}</DialogHeader>
        <div className="flex flex-col gap-4 sm:flex-row">
          <CoverThumb url={cover} className="h-44 w-32 self-center sm:self-start" />
          <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
        </div>
        {book.description && <p className="text-sm text-muted-foreground">{book.description}</p>}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

