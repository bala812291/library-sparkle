import type { ReactNode } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser, type RoleKey } from "@/hooks/use-current-user";
import { errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 10;

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tone: Record<string, string> = {
  available: "bg-success/12 text-success", active: "bg-success/12 text-success", paid: "bg-success/12 text-success",
  returned: "bg-success/12 text-success", fulfilled: "bg-success/12 text-success", ready: "bg-info/12 text-info",
  issued: "bg-accent text-accent-foreground", pending: "bg-warning/15 text-warning-foreground",
  partially_paid: "bg-warning/15 text-warning-foreground", maintenance: "bg-warning/15 text-warning-foreground",
  overdue: "bg-destructive/10 text-destructive", unpaid: "bg-destructive/10 text-destructive",
  lost: "bg-destructive/10 text-destructive", damaged: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground", cancelled: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground",
};
const labels: Record<string, string> = {
  partially_paid: "Partially Paid", maintenance: "Under Maintenance", ready: "Ready for Collection",
};
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "";
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium whitespace-nowrap", tone[s] ?? "bg-muted")}>
      {labels[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}
    </Badge>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search…"} className="pl-9" />
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function Pager({ page, total, onPage, size = PAGE_SIZE }: { page: number; total: number; onPage: (p: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t px-3 py-2.5 text-sm text-muted-foreground">
      <span>{page * size + 1}–{Math.min(total, (page + 1) * size)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <span className="px-2 tabular-nums">{page + 1} / {pages}</span>
        <Button variant="outline" size="icon" className="size-8" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}

/** Wraps a table body: shows skeletons, error or empty states. */
export function QueryState({ isLoading, error, empty, emptyText, children, onRetry }: {
  isLoading: boolean; error: unknown; empty: boolean; emptyText?: string; children: ReactNode; onRetry?: () => void;
}) {
  if (isLoading) return <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm font-medium">Couldn't load data</p>
      <p className="text-xs text-muted-foreground">{errMsg(error)}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
  if (empty) return (
    <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
      <Inbox className="size-8" />
      <p className="text-sm">{emptyText ?? "Nothing here yet."}</p>
    </div>
  );
  return <>{children}</>;
}

export function TableCard({ children }: { children: ReactNode }) {
  return <Card className="shadow-card gap-0 overflow-hidden py-0"><CardContent className="p-0">{children}</CardContent></Card>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = "Confirm", destructive, loading, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; confirmText?: string;
  destructive?: boolean; loading?: boolean; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}{confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StatCard({ label, value, icon: Icon, hint, toneClass = "bg-accent text-accent-foreground", loading }: {
  label: string; value: ReactNode; icon: typeof Inbox; hint?: string; toneClass?: string; loading?: boolean;
}) {
  return (
    <Card className="shadow-card gap-0 py-4">
      <CardContent className="flex items-start justify-between gap-2 px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 font-display text-xl font-semibold md:text-2xl">{value}</p>}
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClass)}><Icon className="size-4" /></div>
      </CardContent>
    </Card>
  );
}

export function RequireRole({ roles, children }: { roles: RoleKey[]; children: ReactNode }) {
  const { data: me, isLoading } = useCurrentUser();
  if (isLoading) return <div className="grid place-items-center p-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!me || !roles.includes(me.roleKey)) return (
    <div className="flex flex-col items-center gap-2 p-16 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <p className="font-medium">You don't have access to this page</p>
      <p className="text-sm text-muted-foreground">Ask an administrator if you think this is a mistake.</p>
    </div>
  );
  return <>{children}</>;
}

export function Field({ label, required, error, children, className }: { label: string; required?: boolean; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export const tableWrap = "w-full overflow-x-auto";
export const th = "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
export const td = "px-3 py-2.5 align-middle text-sm";
