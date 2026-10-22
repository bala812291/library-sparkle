import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, BookOpen, Tags, PenTool, Building2, GraduationCap, UserCog,
  BookUp, BookDown, ArrowLeftRight, AlarmClock, IndianRupee, CalendarClock,
  BarChart3, Bell, ScrollText, Settings, UserCircle, LogOut, Library, LibraryBig,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useSettings, type RoleKey } from "@/hooks/use-current-user";
import { fmtDateTime } from "@/lib/format";

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  };
}

type To =
  | "/dashboard" | "/books" | "/categories" | "/authors" | "/publishers" | "/students" | "/librarians"
  | "/issue" | "/return" | "/transactions" | "/overdue" | "/fines" | "/reservations" | "/reports"
  | "/notifications" | "/activity" | "/settings" | "/profile" | "/catalog";
type NavItem = { label: string; icon: typeof BookOpen; to: To; roles?: RoleKey[] };
const S: RoleKey[] = ["admin", "librarian"];
const A: RoleKey[] = ["admin"];
const ST: RoleKey[] = ["student"];

const groups: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" }] },
  {
    label: "Library",
    items: [
      { label: "Search Books", icon: LibraryBig, to: "/catalog", roles: ST },
      { label: "My Borrowed Books", icon: BookUp, to: "/transactions", roles: ST },
      { label: "My Reservations", icon: CalendarClock, to: "/reservations", roles: ST },
      { label: "My Fines", icon: IndianRupee, to: "/fines", roles: ST },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Books", icon: BookOpen, to: "/books", roles: S }, { label: "Categories", icon: Tags, to: "/categories", roles: S },
      { label: "Authors", icon: PenTool, to: "/authors", roles: S }, { label: "Publishers", icon: Building2, to: "/publishers", roles: S },
    ],
  },
  { label: "People", items: [
    { label: "Students", icon: GraduationCap, to: "/students", roles: S },
    { label: "Librarians", icon: UserCog, to: "/librarians", roles: A },
  ] },
  {
    label: "Circulation",
    items: [
      { label: "Issue Book", icon: BookUp, to: "/issue", roles: S }, { label: "Return Book", icon: BookDown, to: "/return", roles: S },
      { label: "Transactions", icon: ArrowLeftRight, to: "/transactions", roles: S }, { label: "Overdue Books", icon: AlarmClock, to: "/overdue", roles: S },
      { label: "Fine Management", icon: IndianRupee, to: "/fines", roles: S }, { label: "Reservations", icon: CalendarClock, to: "/reservations", roles: S },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Reports", icon: BarChart3, to: "/reports", roles: S }, { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Activity Logs", icon: ScrollText, to: "/activity", roles: A }, { label: "Settings", icon: Settings, to: "/settings", roles: A },
      { label: "My Profile", icon: UserCircle, to: "/profile" },
    ],
  },
];

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  const { data: me } = useCurrentUser();
  const { data: settings } = useSettings();
  const { setOpenMobile, isMobile } = useSidebar();
  const role = me?.roleKey;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Library className="size-4" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate font-display text-sm font-semibold text-sidebar-accent-foreground">{settings?.library_name ?? "College Library"}</p>
            <p className="text-xs text-sidebar-foreground/70">{me?.role ?? "Library"} portal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {role && groups.map((g) => {
          const items = g.items.filter((i) => !i.roles || i.roles.includes(role));
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/50">{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={path === item.to} tooltip={item.label}>
                        <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}><item.icon /><span>{item.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={signOut}><LogOut /><span>Logout</span></SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NotificationBell() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    enabled: !!me,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [{ data: items }, { count }] = await Promise.all([
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      return { items: items ?? [], unread: count ?? 0 };
    },
  });
  const markAll = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false).eq("user_id", me!.id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {!!data?.unread && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {!!data?.unread && <button className="text-xs text-primary hover:underline" onClick={markAll}>Mark all read</button>}
        </div>
        <DropdownMenuSeparator />
        {data?.items.length ? data.items.map((n) => (
          <DropdownMenuItem key={n.id} asChild className="flex-col items-start gap-0.5 py-2">
            <Link to="/notifications">
              <span className={`text-sm ${n.is_read ? "" : "font-semibold"}`}>{n.title}</span>
              {n.body && <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}
              <span className="text-[11px] text-muted-foreground">{fmtDateTime(n.created_at)}</span>
            </Link>
          </DropdownMenuItem>
        )) : <p className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/notifications" className="justify-center text-sm text-primary">View all</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const signOut = useSignOut();
  const { data: me } = useCurrentUser();
  const initials = (me?.name ?? "U").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-4 md:px-6">
          <SidebarTrigger />
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Profile menu">
                  <Avatar className="size-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback></Avatar>
                  <span className="hidden text-sm font-medium lg:inline">{me?.name ?? "…"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="truncate text-sm">{me?.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{me?.email}</p>
                  <p className="text-xs font-normal text-muted-foreground">{me?.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile">My Profile</Link></DropdownMenuItem>
                {me?.isAdmin && <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={signOut}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">{children}</div></main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function headMeta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — College Library` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — College Library` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
