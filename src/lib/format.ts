export const inr = (n: number | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const txnCode = (n: number | null | undefined) => `TXN-${String(n ?? 0).padStart(5, "0")}`;
export const fineCode = (n: number | null | undefined) => `FIN-${String(n ?? 0).padStart(5, "0")}`;
export const bookCode = (n: number | null | undefined) => `BK-${String(n ?? 0).padStart(4, "0")}`;
export const receiptCode = (n: number | null | undefined) => `RCP-${String(n ?? 0).padStart(5, "0")}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000);

/** Turn database / network errors into short, friendly messages. */
export function errMsg(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e ?? "Something went wrong");
  if (/duplicate key|already exists|unique/i.test(m)) {
    if (/isbn/i.test(m)) return "A book with this ISBN already exists.";
    if (/email/i.test(m)) return "This email is already registered.";
    if (/reg/i.test(m)) return "This register number is already in use.";
    if (/name/i.test(m)) return "An entry with this name already exists.";
    return "This record already exists.";
  }
  if (/foreign key|violates.*restrict/i.test(m)) return "This record is in use and cannot be removed.";
  if (/row-level security|permission denied|not authorized/i.test(m)) return "You don't have permission to do that.";
  if (/failed to fetch|network/i.test(m)) return "Network problem — check your connection and try again.";
  return m;
}

/** Escape user-controlled text for PostgREST `or()` / ilike filters. */
export const safeTerm = (s: string) => s.trim().replace(/[%,()*\\]/g, " ").slice(0, 80);

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  save(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename.endsWith(".csv") ? filename : filename + ".csv");
}

export function downloadExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const e = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${e(r[h])}</td>`).join("")}</tr>`)
    .join("")}</table></body></html>`;
  save(new Blob([html], { type: "application/vnd.ms-excel" }), filename + ".xls");
}

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Electrical", "Mechanical", "Civil", "Mathematics", "Physics", "Management", "Other"];
