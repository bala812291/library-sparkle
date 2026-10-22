import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, FileSpreadsheet, IndianRupee, Printer, Users, ArrowLeftRight, AlarmClock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, headMeta } from "@/components/app-shell";
import { PageHeader, QueryState, RequireRole, StatCard, Toolbar } from "@/components/kit";
import { useLookups } from "@/components/book-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSticky } from "@/hooks/use-sticky";
import { DEPARTMENTS, downloadCSV, downloadExcel, inr, todayISO, txnCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => headMeta("Reports", "Book, student, circulation and fine reports."),
  component: () => <AppShell title="Reports"><RequireRole roles={["admin", "librarian"]}><ReportsPage /></RequireRole></AppShell>,
});

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) => new Date(k + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

function ReportsPage() {
  const look = useLookups();
  const start = new Date(); start.setMonth(start.getMonth() - 5, 1);
  const [from, setFrom] = useSticky("rep-from", start.toISOString().slice(0, 10));
  const [to, setTo] = useSticky("rep-to", todayISO());
  const [dept, setDept] = useSticky("rep-dept", "all");
  const [cat, setCat] = useSticky("rep-cat", "all");
  const [status, setStatus] = useSticky("rep-status", "all");

  const data = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const [tx, books, students, fines, pays] = await Promise.all([
        supabase.from("transactions_view").select("*").gte("issue_date", from).lte("issue_date", to).limit(10000),
        supabase.from("books_catalog").select("id,title,author_names,category_id,category_name,total_copies,available_copies,issued_copies").limit(10000),
        supabase.from("students").select("id,department,is_active").limit(10000),
        supabase.from("fines_view").select("*").gte("created_at", from).lte("created_at", to + "T23:59:59").limit(10000),
        supabase.from("fine_payments").select("amount,created_at").gte("created_at", from).lte("created_at", to + "T23:59:59").limit(10000),
      ]);
      const err = tx.error || books.error || students.error || fines.error || pays.error;
      if (err) throw err;
      return { tx: tx.data!, books: books.data!, students: students.data!, fines: fines.data!, pays: pays.data! };
    },
  });

  const r = useMemo(() => {
    if (!data.data) return null;
    const bookCat = new Map(data.data.books.map((b) => [b.id, b.category_id]));
    const books = data.data.books.filter((b) => cat === "all" || b.category_id === cat);
    let tx = data.data.tx.filter((t) => (dept === "all" || t.department === dept) && (cat === "all" || bookCat.get(t.book_id) === cat));
    if (status === "overdue") tx = tx.filter((t) => t.is_overdue);
    else if (status !== "all") tx = tx.filter((t) => t.status === status);
    const fines = data.data.fines.filter((f) => dept === "all" || f.department === dept);
    const students = data.data.students.filter((s) => dept === "all" || s.department === dept);

    const months: Record<string, { issued: number; returned: number; collected: number }> = {};
    for (let d = new Date(from + "T00:00:00"); d <= new Date(to + "T00:00:00"); d.setMonth(d.getMonth() + 1, 1)) months[d.toISOString().slice(0, 7)] = { issued: 0, returned: 0, collected: 0 };
    tx.forEach((t) => { if (months[monthKey(t.issue_date!)]) months[monthKey(t.issue_date!)].issued++; if (t.return_date && months[monthKey(t.return_date)]) months[monthKey(t.return_date)].returned++; });
    data.data.pays.forEach((p) => { const k = monthKey(p.created_at); if (months[k]) months[k].collected += Number(p.amount); });

    const byCat = new Map<string, number>();
    books.forEach((b) => byCat.set(b.category_name ?? "Uncategorised", (byCat.get(b.category_name ?? "Uncategorised") ?? 0) + 1));
    const byDept = new Map<string, number>();
    students.forEach((s) => byDept.set(s.department ?? "Not set", (byDept.get(s.department ?? "Not set") ?? 0) + 1));
    const borrowCount = new Map<string, { title: string; n: number }>();
    tx.forEach((t) => { const e = borrowCount.get(t.book_id!) ?? { title: t.book_title!, n: 0 }; e.n++; borrowCount.set(t.book_id!, e); });

    return {
      titles: books.length, copies: books.reduce((s, b) => s + (b.total_copies ?? 0), 0),
      available: books.reduce((s, b) => s + (b.available_copies ?? 0), 0), issuedNow: books.reduce((s, b) => s + (b.issued_copies ?? 0), 0),
      students: students.length, activeBorrowers: new Set(tx.filter((t) => t.status === "issued").map((t) => t.student_id)).size,
      overdueStudents: new Set(tx.filter((t) => t.is_overdue).map((t) => t.student_id)).size,
      issues: tx.length, returns: tx.filter((t) => t.return_date).length, current: tx.filter((t) => t.status === "issued").length, overdue: tx.filter((t) => t.is_overdue).length,
      assessed: fines.reduce((s, f) => s + Number(f.amount), 0), collected: data.data.pays.reduce((s, p) => s + Number(p.amount), 0),
      outstanding: fines.reduce((s, f) => s + Number(f.outstanding), 0),
      monthly: Object.entries(months).map(([k, v]) => ({ month: monthLabel(k), ...v })),
      byCat: [...byCat].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byDept: [...byDept].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      top: [...borrowCount.values()].sort((a, b) => b.n - a.n).slice(0, 10),
      tx, fines,
    };
  }, [data.data, dept, cat, status, from, to]);

  const txRows = () => (r?.tx ?? []).map((t) => ({ Transaction: txnCode(t.txn_no), Student: t.student_name, "Register No": t.register_no, Department: t.department, Book: t.book_title, Issued: t.issue_date, Due: t.due_date, Returned: t.return_date ?? "", Status: t.is_overdue ? "overdue" : t.status, Fine: t.fine_amount }));
  const fineRows = () => (r?.fines ?? []).map((f) => ({ Student: f.student_name, "Register No": f.register_no, Book: f.book_title, Days: f.overdue_days, Total: f.amount, Paid: f.amount_paid, Outstanding: f.outstanding, Status: f.status }));
  const name = `library-report-${from}-to-${to}`;

  return (
    <>
      <PageHeader title="Reports" description="Live figures from library records for the selected period."
        actions={<>
          <Button variant="outline" onClick={() => downloadCSV(name + "-transactions", txRows())}><Download className="size-4" />CSV</Button>
          <Button variant="outline" onClick={() => downloadExcel(name + "-transactions", txRows())}><FileSpreadsheet className="size-4" />Excel</Button>
          <Button variant="outline" onClick={() => downloadCSV(name + "-fines", fineRows())}><Download className="size-4" />Fines CSV</Button>
          <Button onClick={() => window.print()}><Printer className="size-4" />Print / PDF</Button>
        </>} />
      <Toolbar>
        <div className="flex items-center gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="From" /><span className="text-xs text-muted-foreground">to</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="To" /></div>
        <Select value={dept} onValueChange={setDept}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All departments</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        <Select value={cat} onValueChange={setCat}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{look.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{["all", "issued", "overdue", "returned", "lost"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select>
      </Toolbar>
      <QueryState isLoading={data.isLoading} error={data.error} empty={!r} onRetry={() => data.refetch()}>
        {r && <>
          <h2 className="font-display text-lg font-semibold">Books</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Titles" value={r.titles} icon={BookOpen} /><StatCard label="Copies" value={r.copies} icon={BookOpen} />
            <StatCard label="Available" value={r.available} icon={BookOpen} toneClass="bg-success/12 text-success" /><StatCard label="Issued now" value={r.issuedNow} icon={BookOpen} />
          </div>
          <h2 className="font-display text-lg font-semibold">Students & circulation</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Students" value={r.students} icon={Users} hint={`${r.activeBorrowers} active borrowers`} />
            <StatCard label="Issues in period" value={r.issues} icon={ArrowLeftRight} hint={`${r.returns} returned`} />
            <StatCard label="Currently borrowed" value={r.current} icon={ArrowLeftRight} />
            <StatCard label="Overdue" value={r.overdue} icon={AlarmClock} hint={`${r.overdueStudents} students`} toneClass="bg-destructive/10 text-destructive" />
          </div>
          <h2 className="font-display text-lg font-semibold">Fines</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Assessed" value={inr(r.assessed)} icon={IndianRupee} /><StatCard label="Collected" value={inr(r.collected)} icon={IndianRupee} toneClass="bg-success/12 text-success" />
            <StatCard label="Outstanding" value={inr(r.outstanding)} icon={IndianRupee} toneClass="bg-warning/15 text-warning" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Monthly issues & returns"><BarChart data={r.monthly}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} width={32} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="issued" name="Issued" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /><Bar dataKey="returned" name="Returned" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
            <ChartCard title="Monthly fine collections (₹)"><LineChart data={r.monthly}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} width={40} tickLine={false} axisLine={false} /><Tooltip /><Line dataKey="collected" name="Collected" stroke="var(--chart-3)" strokeWidth={2} /></LineChart></ChartCard>
            <ChartCard title="Books by category"><BarChart data={r.byCat} layout="vertical"><XAxis type="number" fontSize={12} allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Titles" fill="var(--chart-1)" radius={[0, 4, 4, 0]} /></BarChart></ChartCard>
            <ChartCard title="Students by department"><BarChart data={r.byDept} layout="vertical"><XAxis type="number" fontSize={12} allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Students" fill="var(--chart-2)" radius={[0, 4, 4, 0]} /></BarChart></ChartCard>
          </div>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Most borrowed in period</CardTitle></CardHeader>
            <CardContent>
              {r.top.length ? <ol className="space-y-2">{r.top.map((b, i) => <li key={b.title + i} className="flex justify-between gap-2 text-sm"><span className="truncate">{i + 1}. {b.title}</span><span className="font-semibold tabular-nums">{b.n}</span></li>)}</ol>
                : <p className="text-sm text-muted-foreground">No borrowing in this period.</p>}
            </CardContent>
          </Card>
        </>}
      </QueryState>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64 px-2"><ResponsiveContainer>{children}</ResponsiveContainer></CardContent>
    </Card>
  );
}
