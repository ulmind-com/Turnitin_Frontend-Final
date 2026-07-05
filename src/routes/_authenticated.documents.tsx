import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Search, Upload as UploadIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoader } from "@/components/Loader";

interface DocRow {
  id: string;
  original_file_name: string;
  file_type: string;
  ai_scan_status: string | null;
  plagiarism_scan_status: string | null;
  plagiarism_score: number | null;
  ai_score: number | null;
  scanned_at: string | null;
  created_at: string;
}

interface DocsResp {
  documents: DocRow[];
  total: number;
}

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — NAK Detection Tool" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await api.get<DocsResp>("/documents")).data,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.documents.filter((d) => {
      const matchSearch = search
        ? d.original_file_name.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "completed"
            ? d.ai_scan_status === "completed" && d.plagiarism_scan_status === "completed"
            : statusFilter === "pending"
              ? d.ai_scan_status !== "completed" || d.plagiarism_scan_status !== "completed"
              : statusFilter === "failed"
                ? d.ai_scan_status === "failed" || d.plagiarism_scan_status === "failed"
                : true;
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand">Documents</h1>
          <p className="text-sm text-muted-foreground">
            All papers you've uploaded and their scan status.
          </p>
        </div>
        <Link to="/upload">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
            <UploadIcon className="h-4 w-4 mr-2" /> Upload document
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">In progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <PageLoader label="Fetching your documents…" />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={data?.documents.length ? "No matches" : "No documents yet"}
            description={
              data?.documents.length
                ? "Try adjusting your search or filters."
                : "Upload your first paper to see it here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Filename</th>
                  <th className="px-4 py-3 font-medium">AI</th>
                  <th className="px-4 py-3 font-medium">Plagiarism</th>
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
                    <td className="px-4 py-3">
                      <StatusBadge status={d.ai_scan_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.plagiarism_scan_status} />
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
                        to="/report/$documentId"
                        params={{ documentId: d.id }}
                        className="text-brand font-medium hover:underline"
                      >
                        View report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
