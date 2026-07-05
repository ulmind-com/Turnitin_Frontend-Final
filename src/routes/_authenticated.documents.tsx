import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Turnitin Clone" }] }),
  component: () => (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-brand mb-2">Documents</h1>
      <EmptyState
        icon={FileText}
        title="Coming in Stage 2"
        description="Full document history with filters and pagination will land here next."
      />
    </div>
  ),
});
