import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Upload as UploadIcon,
  Loader2,
} from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
  description: string | null;
}

interface Payment {
  id: string;
  plan_id: string;
  plan_name?: string;
  transaction_id: string;
  screenshot_url: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  reviewed_at: string | null;
  created_at: string;
}

const MAX_SCREENSHOT_MB = 5;
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Turnitin Clone" }] }),
  component: BillingPage,
});

function BillingPage() {
  const plansQ = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api.get<{ plans: Plan[] }>("/plans")).data.plans,
  });
  const paymentsQ = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => (await api.get<{ payments: Payment[] }>("/payments/my")).data.payments,
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const hasPending = paymentsQ.data?.some((p) => p.status === "pending");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground">
          Choose a plan, submit your transaction, and get credits once approved.
        </p>
      </div>

      {hasPending && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            You have a payment under review. Credits will appear once an admin approves it.
          </div>
        </motion.div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Choose a plan</h2>
        {plansQ.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plansQ.data?.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                featured={i === 1}
                disabled={hasPending}
                onSelect={() => setSelectedPlan(plan)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Payment history</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          {paymentsQ.isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !paymentsQ.data?.length ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Purchase a plan above to see your transaction history here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Transaction ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Proof</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentsQ.data.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.plan_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.transaction_id}</td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={p.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand font-medium hover:underline"
                        >
                          View
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">
                        {p.admin_note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <SubmitPaymentDialog
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}

function PlanCard({
  plan,
  featured,
  disabled,
  onSelect,
}: {
  plan: Plan;
  featured?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cn(
        "relative rounded-xl border bg-card p-6 flex flex-col",
        featured && "border-brand ring-2 ring-brand/20 shadow-lg",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand text-brand-foreground px-3 py-0.5 text-xs font-semibold inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-brand">₹{plan.price}</span>
        <span className="text-sm text-muted-foreground">one-time</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {plan.description ?? `${plan.credits} scan credits`}
      </p>
      <ul className="mt-4 space-y-2 text-sm flex-1">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {plan.credits} scan credits
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> AI + plagiarism detection
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Downloadable PDF reports
        </li>
      </ul>
      <Button
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          "mt-6 w-full",
          featured
            ? "bg-brand text-brand-foreground hover:bg-brand/90"
            : "bg-foreground text-background hover:bg-foreground/90",
        )}
      >
        {disabled ? "Payment pending review" : "Choose plan"}
      </Button>
    </motion.div>
  );
}

function PaymentStatusBadge({ status }: { status: Payment["status"] }) {
  const map = {
    pending: {
      Icon: Clock,
      cls: "bg-amber-100 text-amber-800",
      label: "Pending",
    },
    approved: {
      Icon: CheckCircle2,
      cls: "bg-emerald-100 text-emerald-800",
      label: "Approved",
    },
    rejected: {
      Icon: XCircle,
      cls: "bg-red-100 text-red-800",
      label: "Rejected",
    },
  }[status];
  const Icon = map.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        map.cls,
      )}
    >
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

function SubmitPaymentDialog({
  plan,
  onClose,
}: {
  plan: Plan | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [txnId, setTxnId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTxnId("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!plan || !file) throw new Error("Missing data");
      const fd = new FormData();
      fd.append("plan_id", plan.id);
      fd.append("transaction_id", txnId.trim());
      fd.append("screenshot", file);
      return (await api.post("/payments/submit", fd)).data;
    },
    onSuccess: () => {
      toast.success("Payment submitted", {
        description: "An admin will review your proof shortly.",
      });
      qc.invalidateQueries({ queryKey: ["my-payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      reset();
      onClose();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      const status = ax.response?.status;
      if (status === 409) {
        toast.error("You already have a pending payment", {
          description: "Wait for it to be reviewed before submitting another.",
        });
      } else if (status === 400) {
        toast.error("Invalid submission", {
          description: ax.response?.data?.detail ?? "Please check your inputs.",
        });
      }
      // Other statuses handled by global interceptor
    },
  });

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (!IMG_TYPES.includes(f.type)) {
      toast.error("Unsupported file type", { description: "JPEG, PNG, or WebP only." });
      return;
    }
    if (f.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      toast.error("Screenshot too large", { description: `Max ${MAX_SCREENSHOT_MB}MB.` });
      return;
    }
    setFile(f);
  };

  const canSubmit = plan && txnId.trim().length >= 4 && !!file && !submit.isPending;

  return (
    <Dialog
      open={!!plan}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand" />
            Submit payment for {plan?.name}
          </DialogTitle>
          <DialogDescription>
            Send ₹{plan?.price} to our UPI / bank account, then submit your transaction ID and a
            screenshot of the receipt. Credits are provisioned after admin approval.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">{plan?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits</span>
            <span className="font-medium">{plan?.credits}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium text-brand">₹{plan?.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pay to</span>
            <span className="font-mono text-xs">turnitin-clone@upi</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="txn">Transaction ID</Label>
            <Input
              id="txn"
              placeholder="e.g. 312345678901"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="screenshot">Payment screenshot</Label>
            <label
              htmlFor="screenshot"
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition-colors",
                file ? "border-brand bg-brand/5" : "border-muted-foreground/25 hover:bg-muted/40",
              )}
            >
              <UploadIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                {file ? (
                  <div className="text-sm">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Click to upload JPEG, PNG or WebP (max {MAX_SCREENSHOT_MB}MB)
                  </div>
                )}
              </div>
            </label>
            <input
              id="screenshot"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={!canSubmit}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {submit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit for review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
