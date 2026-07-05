import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { Search, Ban, Coins, Package, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLoader } from "@/components/Loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  credits: number;
  account_status: "active" | "suspended" | "pending";
  active_plan: null | { id: string; name: string; slug: string; credits: number; price: number };
  total_scans: number;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
}

export const Route = createFileRoute("/_admin/admin/users")({
  head: () => ({ meta: [{ title: "Admin — Users" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (status !== "all") p.set("account_status", status);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [search, status]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", queryParams],
    queryFn: async () =>
      (await api.get<{ users: AdminUser[] }>(`/admin/users${queryParams}`)).data.users,
  });

  const plansQ = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api.get<{ plans: Plan[] }>("/user/plans")).data.plans,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search, manage credits, assign plans, and suspend accounts.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <AdminLoader
            label="Loading users"
            sublabel="Fetching accounts matching your filters."
            stages={[
              "Applying filters",
              "Querying user directory",
              "Attaching plan & credits",
              "Preparing table",
            ]}
          />
        ) : !data?.length ? (
          <EmptyState
            icon={Search}
            title="No users found"
            description="Try adjusting your filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Scans</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((u) => (
                  <UserRow key={u.id} user={u} plans={plansQ.data ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, plans }: { user: AdminUser; plans: Plan[] }) {
  const qc = useQueryClient();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [creditVal, setCreditVal] = useState(user.credits.toString());
  const [planId, setPlanId] = useState<string>(user.active_plan?.id ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const setCredits = useMutation({
    mutationFn: async () =>
      (await api.put(`/admin/users/${user.id}/credits`, { credits: Number(creditVal) })).data,
    onSuccess: () => {
      toast.success("Credits updated");
      setCreditsOpen(false);
      invalidate();
    },
    onError: (err) =>
      toast.error("Could not update credits", {
        description: (err as AxiosError<{ detail?: string }>).response?.data?.detail,
      }),
  });

  const assignPlan = useMutation({
    mutationFn: async () =>
      (await api.put(`/admin/users/${user.id}/plan`, { plan_id: planId })).data,
    onSuccess: () => {
      toast.success("Plan assigned & credits added");
      setPlanOpen(false);
      invalidate();
    },
    onError: (err) =>
      toast.error("Could not assign plan", {
        description: (err as AxiosError<{ detail?: string }>).response?.data?.detail,
      }),
  });

  const suspend = useMutation({
    mutationFn: async () =>
      (await api.put(`/admin/users/${user.id}/suspend`, {
        suspended: user.account_status !== "suspended",
      })).data,
    onSuccess: () => {
      toast.success(user.account_status === "suspended" ? "User reinstated" : "User suspended");
      setSuspendOpen(false);
      invalidate();
    },
    onError: (err) =>
      toast.error("Could not update status", {
        description: (err as AxiosError<{ detail?: string }>).response?.data?.detail,
      }),
  });

  const isAdmin = user.role === "admin";
  const isSuspended = user.account_status === "suspended";

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 max-w-[240px]">
        <div className="font-medium truncate">{user.name}</div>
        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            isAdmin ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
          )}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            user.account_status === "active" && "bg-emerald-100 text-emerald-800",
            user.account_status === "suspended" && "bg-red-100 text-red-800",
            user.account_status === "pending" && "bg-amber-100 text-amber-800",
          )}
        >
          {user.account_status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.active_plan?.name ?? "—"}</td>
      <td className="px-4 py-3 tabular-nums font-medium">{user.credits}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{user.total_scans}</td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="inline-flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCreditVal(user.credits.toString());
              setCreditsOpen(true);
            }}
            title="Set credits"
          >
            <Coins className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPlanId(user.active_plan?.id ?? "");
              setPlanOpen(true);
            }}
            title="Assign plan"
          >
            <Package className="h-4 w-4" />
          </Button>
          {!isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSuspendOpen(true)}
              title={isSuspended ? "Reinstate" : "Suspend"}
              className={isSuspended ? "text-emerald-700" : "text-red-600"}
            >
              {isSuspended ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set credits</DialogTitle>
              <DialogDescription>
                Overwrites {user.email}'s credit balance (does not add).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-left">
              <Label htmlFor="credits">New balance</Label>
              <Input
                id="credits"
                type="number"
                min={0}
                value={creditVal}
                onChange={(e) => setCreditVal(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setCredits.mutate()}
                disabled={setCredits.isPending || Number(creditVal) < 0}
              >
                {setCredits.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign plan</DialogTitle>
              <DialogDescription>
                Grants the plan and <b>adds</b> its credits to {user.email}'s balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-left">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.credits} credits · ₹{p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => assignPlan.mutate()}
                disabled={!planId || assignPlan.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {assignPlan.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isSuspended ? "Reinstate user" : "Suspend user"}
              </DialogTitle>
              <DialogDescription>
                {isSuspended
                  ? `${user.email} will regain access to their account.`
                  : `${user.email} will be blocked from all authenticated actions until reinstated.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => suspend.mutate()}
                disabled={suspend.isPending}
                className={
                  isSuspended
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {suspend.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSuspended ? "Reinstate" : "Suspend"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}
