import { createFileRoute } from "@tanstack/react-router";
import { AppShell, headMeta } from "@/components/app-shell";
import { RequireRole } from "@/components/kit";
import { SimpleCrud } from "@/components/simple-crud";

export const Route = createFileRoute("/_authenticated/publishers")({
  head: () => headMeta("Publishers", "Manage library publishers."),
  component: () => (
    <AppShell title="Publishers">
      <RequireRole roles={["admin", "librarian"]}><SimpleCrud kind="publishers" /></RequireRole>
    </AppShell>
  ),
});
