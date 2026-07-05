import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminLoader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
  currency: string;
  currency_symbol: string;
  description: string | null;
  features: string[];
  is_active: boolean;
  display_order: number;
}

const CURRENCY_OPTIONS: { code: string; symbol: string; label: string }[] = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "BDT", symbol: "৳", label: "Bangladeshi Taka (BDT)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
];

export const Route = createFileRoute("/_admin/admin/plans")({
  head: () => ({ meta: [{ title: "Admin — Plans" }] }),
  component: PlansPage,
});

function PlansPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);

  const plansQ = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const res = await api.get<{ plans: AdminPlan[] }>("/admin/plans");
      return [...res.data.plans].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
      );
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/plans/${id}`)).data,
    onSuccess: () => {
      toast.success("Plan deleted");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDeleting(null);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      toast.error("Cannot delete plan", {
        description: ax.response?.data?.detail ?? "This plan may be in use.",
      });
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tags className="h-6 w-6 text-brand" /> Plan Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, update, and deactivate pricing plans. Changes appear on the public pricing
            page immediately.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="h-4 w-4 mr-1" /> New plan
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {plansQ.isLoading ? (
          <AdminLoader
            label="Loading plans"
            sublabel="Fetching all pricing plans from the platform."
            stages={[
              "Authenticating admin session",
              "Querying plan catalog",
              "Aggregating pricing data",
              "Rendering table",
            ]}
          />
        ) : !plansQ.data?.length ? (
          <EmptyState
            icon={Tags}
            title="No plans yet"
            description="Create your first pricing plan to make it available on the billing page."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Currency</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plansQ.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{p.display_order}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.slug}</td>
                    <td className="px-4 py-3">{p.credits}</td>
                    <td className="px-4 py-3 font-semibold text-brand">
                      {p.currency_symbol}
                      {p.price}
                    </td>
                    <td className="px-4 py-3 text-xs">{p.currency}</td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleting(p)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanFormDialog
        open={creating || !!editing}
        plan={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Users who already own this plan will keep their credits, but
              new purchases will fail if any user has it currently active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) del.mutate(deleting.id);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {del.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete plan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormState {
  name: string;
  slug: string;
  credits: string;
  price: string;
  currency: string;
  currency_symbol: string;
  description: string;
  features: string[];
  is_active: boolean;
  display_order: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  credits: "10",
  price: "299",
  currency: "INR",
  currency_symbol: "₹",
  description: "",
  features: [],
  is_active: true,
  display_order: "0",
};

function PlanFormDialog({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan: AdminPlan | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [featureInput, setFeatureInput] = useState("");
  const isEdit = !!plan;

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setForm({
        name: plan.name,
        slug: plan.slug,
        credits: String(plan.credits),
        price: String(plan.price),
        currency: plan.currency,
        currency_symbol: plan.currency_symbol,
        description: plan.description ?? "",
        features: [...(plan.features ?? [])],
        is_active: plan.is_active,
        display_order: String(plan.display_order ?? 0),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFeatureInput("");
  }, [open, plan]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        credits: Number(form.credits),
        price: Number(form.price),
        currency: form.currency,
        currency_symbol: form.currency_symbol,
        description: form.description.trim() || null,
        features: form.features,
        is_active: form.is_active,
        display_order: Number(form.display_order),
      };
      if (isEdit && plan) {
        return (await api.put(`/admin/plans/${plan.id}`, payload)).data;
      }
      return (await api.post("/admin/plans", payload)).data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      toast.error(isEdit ? "Update failed" : "Create failed", {
        description: ax.response?.data?.detail ?? "Please check the fields and try again.",
      });
    },
  });

  const onCurrencyChange = (code: string) => {
    const match = CURRENCY_OPTIONS.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      currency: code,
      currency_symbol: match?.symbol ?? f.currency_symbol,
    }));
  };

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, features: [...f.features, v] }));
    setFeatureInput("");
  };

  const removeFeature = (i: number) =>
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const canSave =
    form.name.trim().length > 1 &&
    form.slug.trim().length > 1 &&
    Number(form.credits) > 0 &&
    Number(form.price) >= 0 &&
    !save.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-brand" />
            {isEdit ? `Edit "${plan?.name}"` : "Create new plan"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update pricing, credits, features, or availability. Changes go live instantly."
              : "Define a new pricing plan. It will appear on the pricing page when active."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Premium Plan"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="premium"
                disabled={isEdit}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Credits</Label>
              <Input
                type="number"
                min={1}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={onCurrencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Symbol</Label>
              <Input
                value={form.currency_symbol}
                onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Perfect for students. Scan up to 10 documents."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="Add a feature and press Enter"
              />
              <Button type="button" variant="outline" onClick={addFeature}>
                Add
              </Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.features.map((f, i) => (
                  <span
                    key={`${f}-${i}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand px-3 py-1 text-xs font-medium",
                    )}
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="hover:text-red-600"
                      aria-label={`Remove ${f}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">
                Only active plans are shown on the public pricing page.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!canSave}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? "Saving…" : "Creating…"}
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
