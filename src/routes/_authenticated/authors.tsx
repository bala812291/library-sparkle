import { createFileRoute } from "@tanstack/react-router";
import { AppShell, headMeta } from "@/components/app-shell";
import { RequireRole } from "@/components/kit";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/authors")({
  head: () => headMeta("Authors", "Manage library authors."),
  component: () => (
    <AppShell title="Authors">
      <RequireRole roles={["admin", "librarian"]}><SimpleCrud kind="authors" /></RequireRole>
    </AppShell>
  ),
});
