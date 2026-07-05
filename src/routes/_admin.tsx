import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  FileText,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken) {
      throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    }
    if (user && user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/documents", label: "Documents", icon: FileText },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const active = pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const [open, setOpen] = useState(false);

  // Hydrate /me on mount if we don't have a user yet; kick out non-admins.
  useEffect(() => {
    if (!accessToken || user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<AuthUser>("/auth/me");
        if (cancelled) return;
        setUser(data);
        if (data.role !== "admin") navigate({ to: "/dashboard" });
      } catch {
        // interceptor handles 401
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user, setUser, navigate]);

  const doLogout = () => {
    logout();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-14 bg-slate-950 text-white flex items-center px-4 gap-3 sticky top-0 z-30">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-slate-800 hover:text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-slate-950 text-white border-slate-800">
            <div className="h-14 flex items-center px-4 border-b border-slate-800">
              <Brand />
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <Brand />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="hidden sm:inline text-sm text-slate-300">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={doLogout}
            className="text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:block w-60 bg-slate-950 text-white border-r border-slate-900">
          <NavList />
        </aside>
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>

      <footer className="border-t bg-white py-4 text-center text-xs text-muted-foreground">
        © 2026 NAK Detection Tool Clone — Admin Console
      </footer>
    </div>
  );
}

function Brand({}: Record<string, never> = {}): ReactNode {
  return (
    <div className="flex items-center gap-2 font-semibold">
      <ShieldCheck className="h-5 w-5 text-brand" />
      <span>NAK Detection Tool Admin</span>
    </div>
  );
}
