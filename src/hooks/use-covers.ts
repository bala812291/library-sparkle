import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Cover URLs: web links pass through; private book-cover files get signed URLs (path -> url). */
export function useCovers(paths: (string | null | undefined)[]) {
  const all = Array.from(new Set(paths.filter(Boolean) as string[])).sort();
  const external = all.filter((p) => /^https?:\/\//.test(p));
  const list = all.filter((p) => !/^https?:\/\//.test(p));
  const signed = useQuery({
    queryKey: ["covers", list],
    enabled: list.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("book-covers").createSignedUrls(list, 3600);
      const map: Record<string, string> = {};
      data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      return map;
    },
  }).data ?? {};
  const map: Record<string, string> = { ...signed };
  external.forEach((u) => { map[u] = u; });
  return map;
}
