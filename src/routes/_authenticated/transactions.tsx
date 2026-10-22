import { createFileRoute } from "@tanstack/react-router";
import { AppShell, headMeta } from "@/components/app-shell";
import { TransactionsTable } from "@/components/transactions-table";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => headMeta("Transactions", "Borrowing transactions and history."),
  component: () => <AppShell title="Transactions"><TransactionsTable mode="all" /></AppShell>,
});
