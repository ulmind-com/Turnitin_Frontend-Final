import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { AdminLoader } from "@/components/Loader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminDoc {
  id: string;
  user_id: string;
  user_email: string;
  original_file_name: string;
  file_type: string;
  scan_status: string;
  plagiarism_score: number | null;
  ai_score: number | null;
  scanned_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 15;

export const Route = createFileRoute("/_admin/admin/documents")({
  head: () => ({ meta: [{ title: "Admin — Documents" }] }),
  component: DocsPage,
});

function DocsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => (await api.get<{ documents: AdminDoc[] }>("/admin/documents")).data.documents,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/documents/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<AdminDoc[]>(["admin-documents"], (prev) =>
        prev ? prev.filter((d) => d.id !== id) : prev,
      );
      toast.success("Document deleted");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete document");
      setDeleteId(null);
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (d) =>
        d.original_file_name.toLowerCase().includes(q) ||
        d.user_email.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Documents</h1>
        <p className="text-sm text-muted-foreground">
          Every document uploaded across the platform.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename or user email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <AdminLoader
            label="Loading documents"
            sublabel="Fetching every paper uploaded to the platform."
            stages={[
              "Querying document index",
              "Joining user records",
              "Attaching scan results",
              "Sorting by upload time",
            ]}
          />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={data?.length ? "No matches" : "No documents on platform"}
            description={
              data?.length
                ? "Adjust your search."
                : "Once users upload papers they will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Filename</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">AI %</th>
                  <th className="px-4 py-3 font-medium">Plag %</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paged.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium max-w-[240px] truncate">
                      {d.original_file_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                      {d.user_email}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.scan_status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {d.ai_score != null ? `${d.ai_score.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {d.plagiarism_score != null ? `${d.plagiarism_score.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/documents/$documentId"
                        params={{ documentId: d.id }}
                        className="text-brand font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={currentPage === i + 1}
                  onClick={() => setPage(i + 1)}
                  className="cursor-pointer"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={
                  currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
