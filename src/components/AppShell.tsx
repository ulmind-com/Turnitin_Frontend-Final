import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Upload, FileText, CreditCard, LogOut, ShieldCheck, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
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
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
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

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-14 border-b bg-background flex items-center px-4 gap-3 sticky top-0 z-30">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="h-14 flex items-center px-4 border-b">
              <Brand />
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link to="/dashboard" className="flex items-center gap-2">
          <Brand />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground">
                {user.credits} credits
              </span>
              <span className="text-muted-foreground">{user.email}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={doLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:block w-60 border-r bg-background">
          <NavList />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
        © 2026 Turnitin Clone. Academic integrity, reimagined.
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 font-semibold text-brand">
      <ShieldCheck className="h-5 w-5" />
      <span>Turnitin</span>
    </div>
  );
}
