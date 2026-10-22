import { createFileRoute } from "@tanstack/react-router";
import { AppShell, headMeta } from "@/components/app-shell";
import { RequireRole } from "@/components/kit";
import { TransactionsTable } from "@/components/transactions-table";

export const Route = createFileRoute("/_authenticated/overdue")({
  head: () => headMeta("Overdue Books", "Books past their due date."),
  component: () => <AppShell title="Overdue Books"><RequireRole roles={["admin", "librarian"]}><TransactionsTable mode="overdue" /></RequireRole></AppShell>,
});
