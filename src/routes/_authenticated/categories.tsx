import { createFileRoute } from "@tanstack/react-router";
import { AppShell, headMeta } from "@/components/app-shell";
import { RequireRole } from "@/components/kit";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => headMeta("Categories", "Manage library categories."),
  component: () => (
    <AppShell title="Categories">
      <RequireRole roles={["admin", "librarian"]}><SimpleCrud kind="categories" /></RequireRole>
    </AppShell>
  ),
});
