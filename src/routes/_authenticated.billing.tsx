import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Turnitin Clone" }] }),
  component: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-brand mb-2">Billing</h1>
      <EmptyState
        icon={CreditCard}
        title="Coming in Stage 2"
        description="Plan selection, transaction ID submission, and payment history will land here next."
      />
    </div>
  ),
});
