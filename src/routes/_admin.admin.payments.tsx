import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AdminLoader } from "@/components/Loader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AdminPayment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  plan_credits: number;
  transaction_id: string;
  screenshot_url: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const Route = createFileRoute("/_admin/admin/payments")({
  head: () => ({ meta: [{ title: "Admin — Payments" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject user-submitted payment proofs to provision credits.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PaymentList status="pending" />
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          <PaymentList status="approved" />
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          <PaymentList status="rejected" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentList({ status }: { status: "pending" | "approved" | "rejected" }) {
  const url =
    status === "pending"
      ? "/admin/payments/pending"
      : `/admin/payments/all?payment_status=${status}`;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: async () => (await api.get<{ payments: AdminPayment[] }>(url)).data.payments,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={Clock}
          title={`No ${status} payments`}
          description={
            status === "pending"
              ? "You're all caught up. New submissions will show up here."
              : `No ${status} payment records to display.`
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((p) => (
        <PaymentCard key={p.id} payment={p} />
      ))}
    </div>
  );
}

function PaymentCard({ payment }: { payment: AdminPayment }) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const approve = useMutation({
    mutationFn: async () =>
      (await api.put(`/admin/payments/${payment.id}/approve`)).data as {
        message: string;
      },
    onSuccess: (data) => {
      toast.success("Payment approved", { description: data.message });
      invalidate();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      toast.error("Could not approve", { description: ax.response?.data?.detail ?? "Try again" });
    },
  });

  const reject = useMutation({
    mutationFn: async () =>
      (await api.put(`/admin/payments/${payment.id}/reject`, { admin_note: note.trim() })).data,
    onSuccess: () => {
      toast.success("Payment rejected");
      setRejectOpen(false);
      setNote("");
      invalidate();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      toast.error("Could not reject", { description: ax.response?.data?.detail ?? "Try again" });
    },
  });

  const pending = payment.status === "pending";

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-0">
        <a
          href={payment.screenshot_url}
          target="_blank"
          rel="noreferrer"
          className="block bg-muted/40 h-40 md:h-full overflow-hidden group"
        >
          <img
            src={payment.screenshot_url}
            alt="Payment proof"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </a>

        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold">{payment.user_name}</div>
              <div className="text-xs text-muted-foreground">{payment.user_email}</div>
            </div>
            <StatusPill status={payment.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Plan</div>
              <div className="font-medium">
                {payment.plan_name}{" "}
                <span className="text-muted-foreground">· {payment.plan_credits} credits</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Transaction ID</div>
              <div className="font-mono text-xs break-all">{payment.transaction_id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Submitted</div>
              <div>{new Date(payment.created_at).toLocaleString()}</div>
            </div>
            {payment.reviewed_at && (
              <div>
                <div className="text-xs text-muted-foreground">Reviewed</div>
                <div>{new Date(payment.reviewed_at).toLocaleString()}</div>
              </div>
            )}
          </div>

          {payment.admin_note && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
              <span className="font-medium">Note: </span>
              {payment.admin_note}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <a
              href={payment.screenshot_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open proof
            </a>
            {pending && (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={approve.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {approve.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payment</DialogTitle>
            <DialogDescription>
              Provide a short reason. The user will see this note in their billing history.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Transaction ID does not match any UPI record."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reject.mutate()}
              disabled={note.trim().length < 3 || reject.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {reject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting…
                </>
              ) : (
                "Confirm reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: AdminPayment["status"] }) {
  const map = {
    pending: { cls: "bg-amber-100 text-amber-800", label: "Pending" },
    approved: { cls: "bg-emerald-100 text-emerald-800", label: "Approved" },
    rejected: { cls: "bg-red-100 text-red-800", label: "Rejected" },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        map.cls,
      )}
    >
      {map.label}
    </span>
  );
}
