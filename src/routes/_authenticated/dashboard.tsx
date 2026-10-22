import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Layers, CheckCircle2, BookUp, GraduationCap, UserCog, AlarmClock, IndianRupee,
  BookDown, AlertTriangle, PackageMinus, CalendarClock, Search, Wallet, History, UserCircle, LibraryBig, Activity,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { QueryState, StatCard, StatusBadge } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser, useSettings } from "@/hooks/use-current-user";
import { fmtDate, fmtDateTime, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => headMeta("Dashboard", "Library overview: inventory, circulation, overdue books and fines."),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: me, isLoading } = useCurrentUser();
  return (
    <AppShell title="Dashboard">
      {isLoading ? <QueryState isLoading error={null} empty={false}>{null}</QueryState>
        : me?.isStaff ? <StaffDashboard admin={me.isAdmin} name={me.name} /> : <StudentDashboard name={me?.name ?? ""} />}
    </AppShell>
  );
}

type Stats = Record<"titles" | "copies" | "available" | "issued" | "students" | "librarians" | "overdue" | "outstanding" | "issued_today" | "returned_today" | "pending_reservations", number>;
const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function StaffDashboard({ admin, name }: { admin: boolean; name: string }) {
  const stats = useQuery({
    queryKey: ["dash", "stats"],
    queryFn: async () => { const { data, error } = await supabase.rpc("dashboard_stats"); if (error) throw error; return data as unknown as Stats; },
  });
  const charts = useQuery({
    queryKey: ["dash", "charts"],
    queryFn: async () => {
      const [m, c, t, logs, over, low, res] = await Promise.all([
        supabase.rpc("circulation_monthly", { p_months: 6 }),
        supabase.from("categories_view").select("name,book_count").gt("book_count", 0).order("book_count", { ascending: false }),
        supabase.rpc("top_books", { p_limit: 5 }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("transactions_view").select("id,book_title,student_name,register_no,days_late").eq("status", "issued").lt("due_date", todayISO()).order("due_date").limit(5),
        supabase.from("books_catalog").select("id,title,available_copies,total_copies").gt("total_copies", 0).lte("available_copies", 1).order("available_copies").limit(5),
        supabase.from("reservations_view").select("id,book_title,student_name,status").in("status", ["pending", "ready"]).order("created_at").limit(5),
      ]);
      const cats = c.data ?? [];
      const top5 = cats.slice(0, 5).map((x) => ({ name: x.name!, value: x.book_count! }));
      const rest = cats.slice(5).reduce((s, x) => s + (x.book_count ?? 0), 0);
      if (rest) top5.push({ name: "Others", value: rest });
      return { monthly: m.data ?? [], cats: top5, top: t.data ?? [], logs: logs.data ?? [], over: over.data ?? [], low: low.data ?? [], res: res.data ?? [] };
    },
  });
  const s = stats.data;
  const L = stats.isLoading;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-xl font-semibold sm:text-2xl">Welcome, {name.split(" ")[0]}</h1><p className="text-sm text-muted-foreground">Live overview of inventory, circulation and fines.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/issue"><BookUp className="size-4" />Issue</Link></Button>
          <Button asChild variant="outline"><Link to="/return"><BookDown className="size-4" />Return</Link></Button>
          <Button asChild variant="outline"><Link to="/students"><Search className="size-4" />Student</Link></Button>
          <Button asChild variant="outline"><Link to="/books"><BookOpen className="size-4" />Book</Link></Button>
          <Button asChild variant="outline"><Link to="/fines"><Wallet className="size-4" />Fine payment</Link></Button>
        </div>
      </div>
      {stats.error ? <QueryState isLoading={false} error={stats.error} empty={false} onRetry={() => stats.refetch()}>{null}</QueryState> : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <StatCard label="Book titles" value={s?.titles} icon={BookOpen} loading={L} />
          <StatCard label={admin ? "Physical copies" : "Available copies"} value={admin ? s?.copies : s?.available} icon={Layers} loading={L} />
          {admin ? <StatCard label="Available copies" value={s?.available} icon={CheckCircle2} toneClass="bg-success/12 text-success" loading={L} />
            : <StatCard label="Issued today" value={s?.issued_today} icon={BookUp} loading={L} />}
          {admin ? <StatCard label="Issued copies" value={s?.issued} icon={BookUp} loading={L} hint={`${s?.issued_today ?? 0} today`} />
            : <StatCard label="Returned today" value={s?.returned_today} icon={BookDown} toneClass="bg-success/12 text-success" loading={L} />}
          {admin && <StatCard label="Registered students" value={s?.students} icon={GraduationCap} loading={L} />}
          {admin && <StatCard label="Librarians" value={s?.librarians} icon={UserCog} loading={L} />}
          <StatCard label="Overdue books" value={s?.overdue} icon={AlarmClock} toneClass="bg-destructive/10 text-destructive" loading={L} />
          {admin ? <StatCard label="Outstanding fines" value={inr(s?.outstanding)} icon={IndianRupee} toneClass="bg-warning/15 text-warning" loading={L} />
            : <StatCard label="Pending reservations" value={s?.pending_reservations} icon={CalendarClock} toneClass="bg-warning/15 text-warning" loading={L} />}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Monthly issues & returns</CardTitle><CardDescription>Last 6 months</CardDescription></CardHeader>
          <CardContent className="h-72 px-2">
            <ResponsiveContainer>
              <BarChart data={charts.data?.monthly ?? []} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} allowDecimals={false} stroke="var(--muted-foreground)" />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" name="Issued" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returned" name="Returned" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Category distribution</CardTitle><CardDescription>Titles per category</CardDescription></CardHeader>
          <CardContent className="h-72">
            {charts.data && !charts.data.cats.length ? <Empty text="Add books to see categories." /> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={charts.data?.cats ?? []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {(charts.data?.cats ?? []).map((c, i) => <Cell key={c.name} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Most borrowed</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {charts.data?.top.length ? charts.data.top.map((b, i) => (
              <div key={b.book_id} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{b.title}</p><p className="truncate text-xs text-muted-foreground">{b.author_names}</p></div>
                <span className="text-sm font-semibold tabular-nums">{b.borrow_count}</span>
              </div>
            )) : <Empty text="No borrowing yet." />}
          </CardContent>
        </Card>
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {charts.data?.logs.length ? charts.data.logs.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Activity className="size-4" /></div>
                <div className="min-w-0"><p className="truncate text-sm"><span className="capitalize">{a.action}</span> · {a.entity.replace(/_/g, " ")}{a.details ? ` — ${a.details}` : ""}</p><p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</p></div>
              </div>
            )) : <Empty text="No activity yet." />}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AlertCard icon={AlertTriangle} title="Overdue books" tone="text-destructive" to="/overdue">
          {charts.data?.over.length ? charts.data.over.map((o) => (
            <Row key={o.id} title={o.book_title ?? ""} sub={`${o.student_name} · ${o.register_no ?? "—"}`}><Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">{o.days_late}d late</Badge></Row>
          )) : <Empty text="Nothing overdue." />}
        </AlertCard>
        <AlertCard icon={PackageMinus} title="Low availability" tone="text-warning" to="/books">
          {charts.data?.low.length ? charts.data.low.map((l) => (
            <Row key={l.id} title={l.title ?? ""} sub={`${l.total_copies} copies total`}><Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/15">{l.available_copies} left</Badge></Row>
          )) : <Empty text="Stock looks healthy." />}
        </AlertCard>
        <AlertCard icon={CalendarClock} title="Pending reservations" tone="text-info" to="/reservations">
          {charts.data?.res.length ? charts.data.res.map((r) => (
            <Row key={r.id} title={r.book_title ?? ""} sub={r.student_name ?? ""}><StatusBadge status={r.status} /></Row>
          )) : <Empty text="No pending reservations." />}
        </AlertCard>
      </div>
    </>
  );
}

function StudentDashboard({ name }: { name: string }) {
  const { data: settings } = useSettings();
  const d = useQuery({
    queryKey: ["dash", "student"],
    queryFn: async () => {
      const [tx, fines, res] = await Promise.all([
        supabase.from("transactions_view").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("fines_view").select("outstanding"),
        supabase.from("reservations_view").select("*").in("status", ["pending", "ready"]),
      ]);
      if (tx.error) throw tx.error;
      return { tx: tx.data ?? [], outstanding: (fines.data ?? []).reduce((s, f) => s + Number(f.outstanding ?? 0), 0), res: res.data ?? [] };
    },
  });
  const current = d.data?.tx.filter((t) => t.status === "issued").sort((a, b) => a.due_date!.localeCompare(b.due_date!)) ?? [];
  const overdue = current.filter((t) => t.is_overdue);
  const max = settings?.max_books ?? 3;
  const quick = [
    { to: "/catalog" as const, label: "Search Books", icon: LibraryBig }, { to: "/transactions" as const, label: "My Borrowed Books", icon: BookUp },
    { to: "/reservations" as const, label: "My Reservations", icon: CalendarClock }, { to: "/fines" as const, label: "My Fines", icon: IndianRupee },
    { to: "/transactions" as const, label: "Borrowing History", icon: History }, { to: "/profile" as const, label: "My Profile", icon: UserCircle },
  ];
  return (
    <>
      <div><h1 className="text-xl font-semibold sm:text-2xl">Welcome, {name.split(" ")[0]} 👋</h1><p className="text-sm text-muted-foreground">Here's your library summary.</p></div>
      <QueryState isLoading={d.isLoading} error={d.error} empty={false} onRetry={() => d.refetch()}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Borrowed now" value={current.length} icon={BookUp} />
          <StatCard label="Slots available" value={Math.max(0, max - current.length)} icon={Layers} hint={`of ${max}`} toneClass="bg-success/12 text-success" />
          <StatCard label="Overdue" value={overdue.length} icon={AlarmClock} toneClass="bg-destructive/10 text-destructive" />
          <StatCard label="Fine balance" value={inr(d.data?.outstanding)} icon={IndianRupee} toneClass="bg-warning/15 text-warning" />
          <StatCard label="Reservations" value={d.data?.res.length ?? 0} icon={CalendarClock} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quick.map((q) => (
            <Button key={q.label} asChild variant="outline" className="h-auto flex-col gap-1.5 py-3"><Link to={q.to}><q.icon className="size-5 text-primary" /><span className="text-xs">{q.label}</span></Link></Button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Upcoming due dates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {current.length ? current.map((t) => (
                <Row key={t.id} title={t.book_title ?? ""} sub={`Due ${fmtDate(t.due_date)}`}><StatusBadge status={t.is_overdue ? "overdue" : "issued"} /></Row>
              )) : <Empty text="You have no borrowed books." />}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Active reservations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {d.data?.res.length ? d.data.res.map((r) => (
                <Row key={r.id} title={r.book_title ?? ""} sub={r.status === "ready" ? `Collect by ${fmtDateTime(r.expires_at)}` : `Queue #${r.queue_position}`}><StatusBadge status={r.status} /></Row>
              )) : <Empty text="No active reservations." />}
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Recent borrowing history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {d.data?.tx.length ? d.data.tx.slice(0, 6).map((t) => (
              <Row key={t.id} title={t.book_title ?? ""} sub={`Issued ${fmtDate(t.issue_date)}${t.return_date ? ` · returned ${fmtDate(t.return_date)}` : ""}`}><StatusBadge status={t.is_overdue ? "overdue" : t.status} /></Row>
            )) : <Empty text="No borrowing history yet. Browse the catalog to get started." />}
          </CardContent>
        </Card>
      </QueryState>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function AlertCard({ icon: Icon, title, tone, to, children }: { icon: typeof AlertTriangle; title: string; tone: string; to: "/overdue" | "/books" | "/reservations"; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><Icon className={`size-4 ${tone}`} />{title}</CardTitle>
        <Link to={to} className="text-xs text-primary hover:underline">View all</Link></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{title}</p><p className="truncate text-xs text-muted-foreground">{sub}</p></div>
      {children}
    </div>
  );
}
