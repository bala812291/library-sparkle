import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RoleKey = "admin" | "librarian" | "student";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }, { data: student }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("students").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const r = roles?.map((x) => x.role) ?? [];
      const roleKey: RoleKey = r.includes("admin") ? "admin" : r.includes("librarian") ? "librarian" : "student";
      const role = roleKey === "admin" ? "Administrator" : roleKey === "librarian" ? "Librarian" : "Student";
      const name = profile?.full_name || user.email?.split("@")[0] || "User";
      return {
        id: user.id, name, email: profile?.email ?? user.email ?? "", role, roleKey,
        isStaff: roleKey !== "student", isAdmin: roleKey === "admin", student,
      };
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
}
