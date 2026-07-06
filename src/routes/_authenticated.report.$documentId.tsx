import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowLeft, Download, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, FileText, Sparkles, FileDown, ScanEye } from "lucide-react";
import { TurnitinAIReport } from "@/components/TurnitinAIReport";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useDocumentPolling } from "@/hooks/use-document-polling";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoaderOverlay, ProgressLoader, DotLoader } from "@/components/Loader";
import { AnimatePresence } from "framer-motion";

interface ReportResp {
  document_id: string;
  file_name: string;
  ai_scan_status: string;
  plagiarism_scan_status: string;
  overall_ai_score: number;
  overall_plagiarism_score: number;
  ai_summary: string;
  plagiarism_summary: string;
  ai_heuristics: Record<string, number>;
  extracted_text: string;
  chunks: Array<{
    index: number;
    text: string;
    plagiarism_score: number;
    ai_score: number;
    sources?: Array<{ url: string; title: string; similarity: number }>;
  }>;
  matched_sources: Array<{
    url: string;
    title: string;
    matched_text: string;
    original_text: string;
    similarity_score: number;
    chunk_index: number;
  }>;
}

export const Route = createFileRoute("/_authenticated/report/$documentId")({
  head: () => ({ meta: [{ title: "Feedback Studio — NAK Detection Tool" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { documentId } = Route.useParams();
  const poll = useDocumentPolling(documentId);
  const doc = poll.data;

  const aiDone = doc?.ai_scan_status === "completed" || doc?.ai_scan_status === "failed";
  const plagDone = doc?.plagiarism_scan_status === "completed" || doc?.plagiarism_scan_status === "failed";
  const bothDone = aiDone && plagDone;

  const report = useQuery({
    queryKey: ["report", documentId],
    enabled: !!documentId && bothDone,
    queryFn: async () => (await api.get<ReportResp>(`/documents/${documentId}/report`)).data,
  });

  if (!doc) {
    return <ScanningState fileName="…" aiStatus={null} plagStatus={null} />;
  }

  if (!bothDone || !report.data) {
    return (
      <ScanningState
        fileName={doc.original_file_name}
        aiStatus={doc.ai_scan_status}
        plagStatus={doc.plagiarism_scan_status}
      />
    );
  }

  return <ReportView doc={doc} report={report.data} documentId={documentId} />;
}

function ScanningState({
  fileName, aiStatus, plagStatus,
}: { fileName: string; aiStatus: string | null; plagStatus: string | null }) {
  const aiDone = aiStatus === "completed" || aiStatus === "failed";
  const plagDone = plagStatus === "completed" || plagStatus === "failed";
  const bothDone = aiDone && plagDone;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-brand">{fileName}</h1>
      <p className="text-muted-foreground mt-1">
        Sit tight — our engine is working through your paper.
      </p>

      <div className="mt-6 grid md:grid-cols-2 gap-3">
        <ScanPill label="Plagiarism" status={plagStatus} />
        <ScanPill label="AI Detection" status={aiStatus} />
      </div>

      <div className="mt-8">
        <ProgressLoader
          done={bothDone}
          title={bothDone ? "Report ready" : "Analyzing your document"}
          subtitle={
            bothDone
              ? "Loading your Feedback Studio…"
              : "This usually takes 30–60 seconds."
          }
        />
      </div>
    </div>
  );
}

function ScanPill({ label, status }: { label: string; status: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <span className="font-medium">{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function ReportView({
  doc, report, documentId,
}: { doc: NonNullable<ReturnType<typeof useDocumentPolling>["data"]>; report: ReportResp; documentId: string }) {
  const [activeChunk, setActiveChunk] = useState<number | null>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"overview" | "plagiarism" | "ai" | "grade">("overview");
  const [downloading, setDownloading] = useState<null | "combined" | "plagiarism" | "ai">(null);

  const downloadPdf = async (kind: "combined" | "plagiarism" | "ai") => {
    const path =
      kind === "combined"
        ? `/documents/${documentId}/download-report`
        : `/documents/${documentId}/download-report/${kind}`;
    const suffix = kind === "combined" ? "report" : `${kind}-report`;
    setDownloading(kind);
    try {
      const res = await api.get(path, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.file_name.replace(/\.[^.]+$/, "")}-${suffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not download report");
    } finally {
      setDownloading(null);
    }
  };

  const onChunkClick = (chunkIndex: number) => {
    setActiveChunk(chunkIndex);
    setTab("plagiarism");
    setTimeout(() => {
      const el = document.getElementById(`source-chunk-${chunkIndex}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scanFailed =
    doc.ai_scan_status === "failed" || doc.plagiarism_scan_status === "failed";

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem-2.5rem)] lg:min-h-[600px]">
      <AnimatePresence>
        {downloading && (
          <LoaderOverlay
            label={
              downloading === "combined"
                ? "Preparing combined report…"
                : downloading === "plagiarism"
                ? "Preparing plagiarism report…"
                : "Preparing AI detection report…"
            }
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="border-b bg-background px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate">{report.file_name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={doc.plagiarism_scan_status} />
            <StatusBadge status={doc.ai_scan_status} />
          </div>
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={scanFailed || !!downloading}
                className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-md shadow-brand/25 min-w-[170px]"
              >
                {downloading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <Download className="h-4 w-4 mr-2" />
                    </motion.span>
                    Preparing <DotLoader className="ml-1" />
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                    <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>NAK Detection Tool-style reports</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadPdf("combined")}>
                <FileDown className="h-4 w-4 mr-2 text-brand" />
                <div className="flex flex-col">
                  <span className="font-medium">Combined report</span>
                  <span className="text-xs text-muted-foreground">Full analysis in one PDF</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPdf("plagiarism")}>
                <FileText className="h-4 w-4 mr-2 text-plag" />
                <div className="flex flex-col">
                  <span className="font-medium">Plagiarism report</span>
                  <span className="text-xs text-muted-foreground">Light brown highlights</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPdf("ai")}>
                <Sparkles className="h-4 w-4 mr-2 text-ai" />
                <div className="flex flex-col">
                  <span className="font-medium">AI detection report</span>
                  <span className="text-xs text-muted-foreground">Sky blue highlights</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {scanFailed && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> One or more scans failed. Showing partial results.
        </div>
      )}

      {/* Split screen */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:overflow-hidden min-w-0">
        {/* Left: document viewer */}
        <div className="lg:overflow-y-auto overflow-x-hidden p-6 md:p-10 bg-surface min-w-0">
          <div className="max-w-3xl mx-auto rounded-xl bg-card border p-8 md:p-10 shadow-sm min-w-0 overflow-hidden">
            <div className="mb-6 pb-4 border-b flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Document</div>
                <div className="font-semibold truncate">{report.file_name}</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-plag/70"/> Similarity</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-b-2 border-ai"/> AI</span>
              </div>
            </div>
            <HighlightedDocument
              chunks={report.chunks}
              fallbackText={report.extracted_text}
              activeChunk={activeChunk}
              onChunkClick={onChunkClick}
            />
          </div>
        </div>

        {/* Right: sidebar */}
        <div ref={rightPaneRef} className="lg:border-l border-t lg:border-t-0 bg-background flex flex-col lg:overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col lg:min-h-0">
            <TabsList className="grid grid-cols-4 rounded-none border-b bg-background h-11">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="plagiarism">Sources</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="grade">Grade</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6 m-0">
              <div className="grid grid-cols-2 gap-4">
                <ScoreRing value={report.overall_plagiarism_score} label="Similarity" variant="plag" />
                <ScoreRing value={report.overall_ai_score} label="AI Written" variant="ai" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-plag mb-1">Plagiarism</h3>
                <p className="text-sm text-muted-foreground">{report.plagiarism_summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ai mb-1">AI Detection</h3>
                <p className="text-sm text-muted-foreground">{report.ai_summary}</p>
              </div>
              {doc.integrity_flags?.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                    <AlertTriangle className="h-4 w-4" /> Integrity flags
                  </div>
                  <ul className="text-xs text-amber-900 space-y-1">
                    {doc.integrity_flags.map((f, i) => (
                      <li key={i}><b>{f.type}:</b> {f.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="plagiarism" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
              {report.matched_sources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No matching sources found.
                </p>
              ) : (
                report.matched_sources.map((s, i) => (
                  <SourceCard key={i} source={s} highlight={activeChunk === s.chunk_index} />
                ))
              )}
            </TabsContent>

            <TabsContent value="ai" className="flex-1 overflow-y-auto p-6 space-y-5 m-0">
              <p className="text-sm text-muted-foreground">{report.ai_summary}</p>
              <div className="space-y-4">
                <HeuristicBar label="Burstiness" value={report.ai_heuristics.burstiness ?? 0} max={1} ideal={0.5} />
                <HeuristicBar label="Type-Token Ratio" value={report.ai_heuristics.type_token_ratio ?? 0} max={1} ideal={0.6} />
                <HeuristicBar label="AI Phrase Density" value={report.ai_heuristics.ai_phrase_density ?? 0} max={1} inverse />
                <HeuristicBar label="Avg Sentence Length" value={report.ai_heuristics.avg_sentence_length ?? 0} max={40} ideal={18} />
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 pt-3 border-t">
                <div>Sentences: <b>{report.ai_heuristics.sentence_count ?? "—"}</b></div>
                <div>Words: <b>{report.ai_heuristics.word_count ?? "—"}</b></div>
              </div>
            </TabsContent>

            <TabsContent value="grade" className="flex-1 overflow-y-auto p-6 m-0">
              <GradeForm documentId={documentId} initialGrade={doc.grade} initialFeedback={doc.feedback} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function HighlightedDocument({
  chunks, fallbackText, activeChunk, onChunkClick,
}: {
  chunks: ReportResp["chunks"];
  fallbackText: string;
  activeChunk: number | null;
  onChunkClick: (i: number) => void;
}) {
  if (!chunks || chunks.length === 0) {
    const paragraphs = (fallbackText || "")
      .replace(/\r/g, "")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return (
      <div className="space-y-4 leading-[1.85] text-[15px] text-foreground/90 [word-break:break-word] [overflow-wrap:anywhere] font-serif">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }
  // Normalize chunk text so PDF line-breaks don't split words mid-line
  const normalize = (t: string) =>
    t.replace(/\r/g, "").replace(/-\n/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

  return (
    <div className="leading-[1.9] text-[15px] text-foreground/90 [word-break:break-word] [overflow-wrap:anywhere] font-serif">
      {chunks.map((c) => {
        const plag = c.plagiarism_score ?? 0;
        const ai = c.ai_score ?? 0;
        const plagBg = plag > 5 ? `rgba(229,57,53,${Math.min(0.35, 0.1 + plag / 200)})` : undefined;
        const aiUnderline = ai > 5;
        const isActive = activeChunk === c.index;
        const clickable = plag > 5 || ai > 5;

        return (
          <span
            key={c.index}
            id={`doc-chunk-${c.index}`}
            onClick={() => clickable && onChunkClick(c.index)}
            title={plag > 5 ? `Similarity: ${plag.toFixed(1)}%` : ai > 5 ? `AI likelihood: ${ai.toFixed(1)}%` : undefined}
            className={`${clickable ? "cursor-pointer hover:brightness-95" : ""} ${isActive ? "ring-2 ring-brand rounded-sm" : ""} transition-colors`}
            style={{
              backgroundColor: plagBg,
              borderBottom: aiUnderline ? `2px solid var(--ai)` : undefined,
              padding: plag > 5 || aiUnderline ? "1px 2px" : undefined,
              borderRadius: plag > 5 ? "2px" : undefined,
            }}
          >
            {normalize(c.text)}{" "}
          </span>
        );
      })}
    </div>
  );
}

function SourceCard({
  source, highlight,
}: { source: ReportResp["matched_sources"][number]; highlight: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      id={`source-chunk-${source.chunk_index}`}
      initial={false}
      animate={{ backgroundColor: highlight ? "rgba(30,136,229,0.06)" : "rgba(0,0,0,0)" }}
      className={`rounded-lg border p-3 ${highlight ? "border-brand" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sm text-brand hover:underline flex items-center gap-1 truncate"
          >
            {source.title || source.url} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <div className="text-xs text-muted-foreground truncate">{source.url}</div>
        </div>
        <span className="shrink-0 rounded-full bg-plag/10 text-plag text-xs font-semibold px-2 py-0.5">
          {source.similarity_score.toFixed(1)}%
        </span>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-xs text-muted-foreground hover:text-brand flex items-center gap-1"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Compare
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
          <div className="rounded border bg-plag/5 p-2">
            <div className="font-medium text-plag mb-1">Your text</div>
            <div className="text-foreground">{source.original_text}</div>
          </div>
          <div className="rounded border bg-muted/50 p-2">
            <div className="font-medium mb-1">Source text</div>
            <div className="text-foreground">{source.matched_text}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function HeuristicBar({
  label, value, max, ideal, inverse,
}: { label: string; value: number; max: number; ideal?: number; inverse?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const good = inverse ? value < (ideal ?? max / 2) : ideal != null ? Math.abs(value - ideal) / ideal < 0.4 : true;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${good ? "bg-emerald-500" : "bg-ai"}`}
        />
      </div>
    </div>
  );
}

function GradeForm({
  documentId, initialGrade, initialFeedback,
}: { documentId: string; initialGrade: number | null; initialFeedback: string | null }) {
  const qc = useQueryClient();
  const [grade, setGrade] = useState(initialGrade?.toString() ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");

  useEffect(() => {
    setGrade(initialGrade?.toString() ?? "");
    setFeedback(initialFeedback ?? "");
  }, [initialGrade, initialFeedback]);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/documents/${documentId}/grade`, {
        grade: grade ? parseFloat(grade) : null,
        feedback,
      });
    },
    onSuccess: () => {
      toast.success("Grade saved");
      qc.invalidateQueries({ queryKey: ["document", documentId] });
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-4"
    >
      <div>
        <Label>Grade (0–100)</Label>
        <Input
          type="number" min={0} max={100} step={0.5}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Feedback</Label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={8}
          placeholder="Notes for the student…"
          className="mt-1"
        />
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {mutation.isPending ? "Saving…" : "Save grade & feedback"}
      </Button>
    </form>
  );
}
