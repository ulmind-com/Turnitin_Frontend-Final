import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, FileText, CheckCircle2, Upload as UploadIcon, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader } from "@/components/Loader";

interface DashboardResp {
  credits: number;
  total_scans: number;
  completed_scans: number;
  active_plan: null | { id: string; name: string; slug: string; credits: number; price: number };
  account_status: string;
  pending_payment: boolean;
  recent_documents: Array<{
    id: string;
    original_file_name: string;
    scan_status: string;
    plagiarism_score: number | null;
    ai_score: number | null;
    created_at: string;
  }>;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NAK Detection Tool" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardResp>("/user/dashboard")).data,
  });

  if (isLoading || !data) {
    return <PageLoader label="Loading your dashboard…" />;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your scans and account</p>
        </div>
        <Link to="/upload">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
            <UploadIcon className="h-4 w-4 mr-2" /> Upload document
          </Button>
        </Link>
      </div>

      {data.pending_payment && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            Your payment is under review. Credits will be added once approved.
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Credits" value={data.credits} accent />
        <StatCard icon={FileText} label="Total Scans" value={data.total_scans} />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completed_scans} />
        <StatCard icon={CreditCard} label="Active Plan" value={data.active_plan?.name ?? "—"} />
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Recent documents</h2>
          <Link to="/documents" className="text-sm text-brand font-medium">View all →</Link>
        </div>
        {data.recent_documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents scanned yet"
            description="Upload your first paper to generate an Originality Report."
            action={<Link to="/upload"><Button className="bg-brand text-brand-foreground hover:bg-brand/90">Upload now</Button></Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Plagiarism</th>
                  <th className="px-5 py-3 font-medium">AI</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.recent_documents.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-surface/50">
                    <td className="px-5 py-3 font-medium">{d.original_file_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={d.scan_status} /></td>
                    <td className="px-5 py-3">{d.plagiarism_score != null ? `${d.plagiarism_score.toFixed(1)}%` : "—"}</td>
                    <td className="px-5 py-3">{d.ai_score != null ? `${d.ai_score.toFixed(1)}%` : "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/report/$documentId"
                        params={{ documentId: d.id }}
                        className="text-brand text-sm font-medium hover:underline"
                      >
                        Open report →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: typeof CreditCard; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "bg-brand text-brand-foreground" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "opacity-80" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
