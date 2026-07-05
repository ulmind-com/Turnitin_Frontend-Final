import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle2, Clock, Coins } from "lucide-react";
import { api } from "@/lib/api";
import { AdminLoader } from "@/components/Loader";

interface AdminDashboardResp {
  total_users: number;
  total_scans: number;
  completed_scans: number;
  pending_payments: number;
  total_credits_distributed: number;
  plans_breakdown: Array<{
    name: string;
    slug: string;
    credits: number;
    price: number;
    total_subscriptions: number;
  }>;
}

export const Route = createFileRoute("/_admin/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin — Overview" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get<AdminDashboardResp>("/admin/dashboard")).data,
    refetchInterval: 30_000,
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Global platform metrics, refreshed every 30 seconds.
        </p>
      </div>

      {isLoading || !data ? (
        <AdminLoader
          label="Loading overview"
          sublabel="Refreshing platform metrics from the database."
          stages={[
            "Authenticating admin session",
            "Aggregating user counts",
            "Tallying scans & payments",
            "Building plan breakdown",
          ]}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <Stat icon={Users} label="Total users" value={data.total_users} />
            <Stat icon={FileText} label="Total scans" value={data.total_scans} />
            <Stat icon={CheckCircle2} label="Completed" value={data.completed_scans} />
            <Stat
              icon={Clock}
              label="Pending payments"
              value={data.pending_payments}
              accent={data.pending_payments > 0}
              href="/admin/payments"
            />
            <Stat icon={Coins} label="Credits issued" value={data.total_credits_distributed} />
          </div>

          <section className="rounded-xl border bg-card">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold">Plans breakdown</h2>
              <p className="text-xs text-muted-foreground">Total approved subscriptions per plan.</p>
            </div>
            <div className="p-5 space-y-4">
              {data.plans_breakdown.map((p) => {
                const max = Math.max(1, ...data.plans_breakdown.map((x) => x.total_subscriptions));
                const pct = (p.total_subscriptions / max) * 100;
                return (
                  <div key={p.slug}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">
                        {p.name}{" "}
                        <span className="text-muted-foreground">
                          · ₹{p.price} · {p.credits} credits
                        </span>
                      </span>
                      <span className="tabular-nums font-semibold">
                        {p.total_subscriptions}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-brand"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  accent?: boolean;
  href?: "/admin/payments";
}) {
  const content = (
    <motion.div
      whileHover={href ? { y: -2 } : undefined}
      className={`rounded-xl border bg-card p-4 ${
        accent ? "border-amber-300 bg-amber-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accent ? "text-amber-600" : "text-brand"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </motion.div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}
