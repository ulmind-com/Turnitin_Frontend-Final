import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, User as UserIcon, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { AdminLoader } from "@/components/Loader";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreRing } from "@/components/ScoreRing";

interface AdminDocDetail {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  original_file_name: string;
  file_type: string;
  extracted_text: string;
  ai_scan_status: string | null;
  plagiarism_scan_status: string | null;
  ai_result: null | {
    ai_score: number;
    summary: string;
    heuristics: Record<string, number>;
  };
  plagiarism_result: null | {
    plagiarism_score: number;
    summary: string;
    matched_sources: Array<{
      url: string;
      title: string;
      matched_text: string;
      similarity_score: number;
    }>;
  };
  integrity_flags: Array<{ type: string; description: string }>;
  metadata: Record<string, number>;
  grade: number | null;
  feedback: string | null;
  scanned_at: string | null;
  created_at: string;
}

export const Route = createFileRoute("/_admin/admin/documents/$documentId")({
  head: () => ({ meta: [{ title: "Admin — Document detail" }] }),
  component: AdminDocDetailPage,
});

function AdminDocDetailPage() {
  const { documentId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-doc", documentId],
    queryFn: async () =>
      (await api.get<AdminDocDetail>(`/admin/documents/${documentId}`)).data,
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <AdminLoader
          label="Loading document"
          sublabel="Fetching the full scan report and author metadata."
          stages={[
            "Fetching document record",
            "Loading extracted text",
            "Attaching AI + plagiarism results",
            "Rendering report",
          ]}
        />
      </div>
    );
  }

  const aiScore = data.ai_result?.ai_score ?? 0;
  const plagScore = data.plagiarism_result?.plagiarism_score ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <Link
        to="/admin/documents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all documents
      </Link>

      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-bold">{data.original_file_name}</h1>
          </div>
          <div className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            {(data.user_email || data.user_name) && (
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3.5 w-3.5" />
                {data.user_name ? `${data.user_name} · ` : ""}
                {data.user_email}
              </span>
            )}
            <span>Uploaded {new Date(data.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={data.ai_scan_status} />
          <StatusBadge status={data.plagiarism_scan_status} />
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-[220px_220px_1fr] gap-4">
        <div className="rounded-xl border bg-card p-4 flex flex-col items-center">
          <ScoreRing value={plagScore} label="Plagiarism" variant="plag" />
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col items-center">
          <ScoreRing value={aiScore} label="AI Writing" variant="ai" />
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
          <div className="font-semibold">Metadata</div>
          <MetaRow label="File size" value={fmtBytes(data.metadata.file_size)} />
          <MetaRow label="Pages" value={data.metadata.page_count?.toString()} />
          <MetaRow label="Characters" value={data.metadata.character_count?.toLocaleString()} />
          <MetaRow label="Tokens" value={data.metadata.token_count?.toLocaleString()} />
          {data.grade != null && (
            <MetaRow label="Grade" value={`${data.grade}`} />
          )}
        </div>
      </section>

      {data.integrity_flags.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Integrity flags
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {data.integrity_flags.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.type}:</span> {f.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card">
          <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--plag)]" /> Plagiarism summary
          </div>
          <div className="p-4 text-sm space-y-3">
            <p className="text-muted-foreground">
              {data.plagiarism_result?.summary ?? "Not analyzed yet."}
            </p>
            {data.plagiarism_result?.matched_sources.slice(0, 5).map((s, i) => (
              <div key={i} className="rounded-md border p-3 text-xs space-y-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand hover:underline block truncate"
                >
                  {s.title || s.url}
                </a>
                <div className="text-muted-foreground">
                  Similarity: {s.similarity_score.toFixed(1)}%
                </div>
                <p className="text-slate-700 line-clamp-3">{s.matched_text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--ai)]" /> AI writing summary
          </div>
          <div className="p-4 text-sm space-y-3">
            <p className="text-muted-foreground">
              {data.ai_result?.summary ?? "Not analyzed yet."}
            </p>
            {data.ai_result?.heuristics && (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(data.ai_result.heuristics).map(([k, v]) => (
                  <div key={k} className="rounded-md bg-muted/50 px-3 py-2">
                    <dt className="text-muted-foreground capitalize">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {typeof v === "number" ? v.toFixed(2) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="px-4 py-3 border-b font-semibold">Extracted text</div>
        <pre className="p-4 text-xs whitespace-pre-wrap max-h-[420px] overflow-auto font-mono text-slate-700">
          {data.extracted_text}
        </pre>
      </section>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value ?? "—"}</span>
    </div>
  );
}

function fmtBytes(n?: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
