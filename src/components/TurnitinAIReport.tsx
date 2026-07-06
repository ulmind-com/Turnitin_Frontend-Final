import { useRef, useState } from "react";
import { Download, Sparkles, RefreshCw, X, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

/**
 * Turnitin-style AI Writing Detection Report.
 * Colors/typography are hardcoded here on purpose — it's a brand-clone visual
 * (not part of the app's semantic design tokens).
 */
export interface TurnitinAIReportProps {
  documentId: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  overallAiScore: number;
  heuristics: Record<string, number>;
  metadata: {
    page_count?: number;
    character_count?: number;
    file_size?: number;
  };
  extractedText?: string;
  onClose: () => void;
}

const BRAND = "#0d5c8f";
const TURNITIN_LOGO_URL =
  "https://res.cloudinary.com/fawc0r5v/image/upload/v1783345470/image_yov91t.png";

let cachedLogoDataUrl: string | null = null;
async function loadTurnitinLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const res = await fetch(TURNITIN_LOGO_URL, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedLogoDataUrl = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

type SummaryPdfData = {
  filename: string;
  fileType: string;
  createdAt: string;
  submissionId: string;
  overallAiScore: number;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  fileSize?: number;
  aiOnly: number;
  paraphrased: number;
  caution: { title: string; body: string };
};

function setText(pdf: jsPDF, size: number, color = "#0b1220", style: "normal" | "bold" = "normal") {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);
  pdf.setTextColor(color);
}

function drawTurnitinLogo(
  pdf: jsPDF,
  x: number,
  y: number,
  opacity = 1,
  logoDataUrl: string | null = null,
) {
  if (logoDataUrl) {
    try {
      const gState = (pdf as unknown as {
        GState: new (opts: { opacity: number }) => unknown;
        setGState: (gs: unknown) => void;
      });
      if (opacity < 1 && gState.GState && gState.setGState) {
        gState.setGState(new gState.GState({ opacity }));
      }
      // Logo image is roughly 5:1 aspect ratio. Render ~28mm wide.
      pdf.addImage(logoDataUrl, "PNG", x, y - 3.5, 28, 6, undefined, "FAST");
      if (opacity < 1 && gState.GState && gState.setGState) {
        gState.setGState(new gState.GState({ opacity: 1 }));
      }
      return;
    } catch {
      /* fall through to vector fallback */
    }
  }
  pdf.setDrawColor(BRAND);
  pdf.setLineWidth(0.8);
  pdf.line(x, y + 3.5, x + 5, y - 1.5);
  pdf.line(x + 5, y - 1.5, x + 2.8, y - 1.5);
  pdf.line(x + 5, y - 1.5, x + 5, y + 1.2);
  setText(pdf, 9, opacity < 1 ? "#7aa8c3" : BRAND, "bold");
  pdf.text("turnitin®", x + 8, y + 3);
}

function drawPageHeader(
  pdf: jsPDF,
  pageLabel: string,
  submissionId: string,
  logoDataUrl: string | null = null,
) {
  pdf.setDrawColor("#e5e7eb");
  pdf.setLineWidth(0.2);
  pdf.line(0, 20, 210, 20);
  drawTurnitinLogo(pdf, 16, 10, 1, logoDataUrl);
  setText(pdf, 7, "#6b7280");
  pdf.text(pageLabel, 52, 13);
  pdf.text(`Submission ID   trn:oid:::${submissionId}`, 120, 13);
}

function drawPageFooter(
  pdf: jsPDF,
  pageLabel: string,
  submissionId: string,
  logoDataUrl: string | null = null,
) {
  pdf.setDrawColor("#e5e7eb");
  pdf.setLineWidth(0.2);
  pdf.line(0, 277, 210, 277);
  drawTurnitinLogo(pdf, 16, 284, 0.5, logoDataUrl);
  setText(pdf, 7, "#6b7280");
  pdf.text(pageLabel, 52, 287);
  pdf.text(`Submission ID   trn:oid:::${submissionId}`, 120, 287);
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function renderSummaryPdf(data: SummaryPdfData, logoDataUrl: string | null = null) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  drawPageHeader(pdf, "Page 1 of 2 - Cover Page", data.submissionId, logoDataUrl);
  setText(pdf, 22, "#cbd5e1");
  pdf.text("-     -", 102, 78, { align: "center" });

  setText(pdf, 24, "#0b1220", "bold");
  drawWrappedText(pdf, data.filename.replace(/\.[^.]+$/, ""), 16, 118, 178, 11);
  pdf.setDrawColor("#e5e7eb");
  pdf.line(16, 155, 194, 155);

  setText(pdf, 11, "#0b1220", "bold");
  pdf.text("Document Details", 16, 170);
  const details: Array<[string, string]> = [
    ["SUBMISSION ID", `trn:oid:::${data.submissionId}`],
    ["SUBMISSION DATE", formatDate(data.createdAt)],
    ["FILE NAME", data.filename],
    ["FILE TYPE", data.fileType.toUpperCase()],
    ["FILE SIZE", formatBytes(data.fileSize)],
  ];
  let y = 184;
  details.forEach(([label, value]) => {
    setText(pdf, 6, "#6b7280", "bold");
    pdf.text(label, 16, y);
    setText(pdf, 8, "#0b1220", "bold");
    drawWrappedText(pdf, value, 16, y + 6, 90, 5);
    y += 18;
  });

  pdf.setFillColor("#fafafa");
  pdf.setDrawColor("#e5e7eb");
  pdf.roundedRect(128, 174, 66, 40, 1.5, 1.5, "FD");
  setText(pdf, 8, "#0b1220", "bold");
  pdf.text(`${data.pageCount.toLocaleString()} Pages`, 178, 186, { align: "right" });
  pdf.text(`${data.wordCount.toLocaleString()} Words`, 178, 198, { align: "right" });
  pdf.text(`${data.characterCount.toLocaleString()} Characters`, 178, 210, { align: "right" });
  drawPageFooter(pdf, "Page 1 of 2 - Cover Page", data.submissionId);

  pdf.addPage("a4", "portrait");
  drawPageHeader(pdf, "Page 2 of 2 - AI Writing Overview", data.submissionId);
  setText(pdf, 24, "#0b1220", "bold");
  pdf.text(`${data.overallAiScore}% detected as AI`, 16, 55);
  setText(pdf, 8, "#4b5563");
  drawWrappedText(
    pdf,
    "The percentage indicates the combined amount of likely AI-generated text as well as likely AI-generated text that was also likely AI-paraphrased.",
    16,
    66,
    78,
    5,
  );

  pdf.setFillColor("#e8f4fd");
  pdf.setDrawColor("#d0e4f0");
  pdf.roundedRect(112, 43, 82, 42, 2, 2, "FD");
  setText(pdf, 8, "#0b1220", "bold");
  pdf.text(data.caution.title, 118, 56);
  setText(pdf, 7, "#0b1220");
  drawWrappedText(pdf, data.caution.body, 118, 65, 68, 4.5);

  pdf.setDrawColor("#e5e7eb");
  pdf.line(16, 100, 194, 100);

  pdf.setFillColor("#c4ebe8");
  pdf.circle(22, 118, 5, "F");
  setText(pdf, 8, "#0b1220");
  pdf.text(`${Math.round(data.aiOnly * (data.wordCount / 100))}  AI-generated only  ${data.aiOnly}%`, 34, 116);
  setText(pdf, 7, "#4b5563");
  pdf.text("Likely AI-generated text from a large-language model.", 34, 124);

  pdf.setFillColor("#e3d7f5");
  pdf.circle(22, 143, 5, "F");
  setText(pdf, 8, "#0b1220");
  pdf.text(
    `${Math.round(data.paraphrased * (data.wordCount / 100))}  AI-generated text that was AI-paraphrased  ${data.paraphrased}%`,
    34,
    141,
  );
  setText(pdf, 7, "#4b5563");
  drawWrappedText(
    pdf,
    "Likely AI-generated text that was likely revised using an AI-paraphrase tool or word spinner.",
    34,
    149,
    145,
    4.5,
  );

  pdf.setDrawColor("#e5e7eb");
  pdf.line(16, 174, 194, 174);
  setText(pdf, 8, "#0b1220", "bold");
  pdf.text("Disclaimer", 16, 188);
  setText(pdf, 7, "#4b5563");
  drawWrappedText(
    pdf,
    "Our AI writing assessment is designed to help educators identify text that might be prepared by a generative AI tool. Our AI writing assessment may not always be accurate (i.e., our AI models may produce either false positive results or false negative results), so it should not be used as the sole basis for adverse actions against a student. It takes further scrutiny and human judgment in conjunction with an organization's application of its specific academic policies to determine whether any academic misconduct has occurred.",
    16,
    198,
    178,
    4.5,
  );
  drawPageFooter(pdf, "Page 2 of 2 - AI Writing Overview", data.submissionId);

  const pdfOutput = pdf as unknown as { output: (type: "arraybuffer") => ArrayBuffer };
  return pdfOutput.output("arraybuffer");
}

function getOriginalPageIndices(originalDoc: PDFDocument, expectedPageCount: number) {
  const indices = originalDoc.getPageIndices();
  const expected = Math.max(1, Math.round(expectedPageCount));

  // Some highlighted PDFs arrive with one generated blank page before the real
  // source document. Keep the trailing pages that match the source page count.
  if (Number.isFinite(expected) && expected > 0 && indices.length > expected) {
    return indices.slice(indices.length - expected);
  }

  return indices;
}

function TurnitinLogo({ opacity = 1, size = 18 }: { opacity?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1.5" style={{ opacity }}>
      <svg width={size + 4} height={size + 4} viewBox="0 0 32 32" fill="none">
        <path
          d="M8 22 L20 10 M20 10 L14 10 M20 10 L20 16"
          stroke={BRAND}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          color: BRAND,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "-0.01em",
        }}
      >
        turnitin
        <span style={{ fontSize: size * 0.5, verticalAlign: "super" }}>®</span>
      </span>
    </div>
  );
}

function PageHeader({ pageLabel, submissionId }: { pageLabel: string; submissionId: string }) {
  return (
    <div
      className="flex items-center justify-between px-12 py-5 border-b"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center gap-6">
        <TurnitinLogo />
        <span className="text-[13px] text-gray-600">{pageLabel}</span>
      </div>
      <div className="text-[13px] text-gray-600">
        Submission ID <span className="ml-2">trn:oid:::{submissionId}</span>
      </div>
    </div>
  );
}

function PageFooter({ pageLabel, submissionId }: { pageLabel: string; submissionId: string }) {
  return (
    <div
      className="flex items-center justify-between px-12 py-5 border-t"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center gap-6">
        <TurnitinLogo opacity={0.5} />
        <span className="text-[13px] text-gray-500">{pageLabel}</span>
      </div>
      <div className="text-[13px] text-gray-500">
        Submission ID <span className="ml-2">trn:oid:::{submissionId}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function TurnitinAIReport(props: TurnitinAIReportProps) {
  const {
    documentId,
    fileName,
    fileType,
    createdAt,
    overallAiScore,
    heuristics,
    metadata,
    extractedText,
    onClose,
  } = props;

  const pagesRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const submissionId = documentId.slice(0, 4) + ":" + documentId.slice(-12);

  const wordCount =
    extractedText && extractedText.trim()
      ? extractedText.trim().split(/\s+/).length
      : Math.round((metadata.character_count ?? 0) / 5);
  const characterCount = metadata.character_count ?? extractedText?.length ?? 0;
  const pageCount = metadata.page_count ?? Math.max(1, Math.ceil(wordCount / 300));

  // Split calculation
  const burstiness = heuristics.burstiness ?? 0.5;
  const ttr = heuristics.type_token_ratio ?? 0.5;
  const paraphraseShare = burstiness < 0.4 && ttr > 0.55 ? 0.35 : burstiness < 0.5 ? 0.15 : 0;
  const paraphrased = Math.round(overallAiScore * paraphraseShare);
  const aiOnly = Math.max(0, overallAiScore - paraphrased);

  const caution =
    overallAiScore < 20
      ? {
          title: "Low risk.",
          body: "This document shows minimal indicators of AI-generated content. We still recommend reviewing the highlighted sections for context.",
        }
      : overallAiScore <= 60
        ? {
            title: "Caution: Review required.",
            body: "It is essential to understand the limitations of AI detection before making decisions about a student's work. We encourage you to learn more about our AI detection capabilities before using the tool.",
          }
        : {
            title: "High risk: Review strongly recommended.",
            body: "A significant portion of this document was flagged as likely AI-generated. Please review carefully alongside your institution's academic policies.",
          };

  const displayName = fileName.replace(/\.[^.]+$/, "");

  const downloadPdf = async () => {
    if (!pagesRef.current) return;
    setDownloading(true);
    try {
      // 1. Generate summary PDF bytes directly with jsPDF. Do not use
      // html2canvas here: it fails on Tailwind v4 oklch()/oklab() colors.
      let summaryArrayBuffer: ArrayBuffer;
      try {
        summaryArrayBuffer = renderSummaryPdf({
          filename: fileName,
          fileType,
          createdAt,
          submissionId,
          overallAiScore,
          pageCount,
          wordCount,
          characterCount,
          fileSize: metadata.file_size,
          aiOnly,
          paraphrased,
          caution,
        });
      } catch (renderError) {
        console.error("Failed to render summary PDF", renderError);
        toast.error("Could not render the report PDF", {
          description: "Please try again after the report finishes loading.",
        });
        return;
      }

      const mergedPdf = await PDFDocument.create();
      const summaryDoc = await PDFDocument.load(summaryArrayBuffer);
      const summaryPages = await mergedPdf.copyPages(
        summaryDoc,
        summaryDoc.getPageIndices(),
      );
      summaryPages.forEach((p) => mergedPdf.addPage(p));

      // 2. Try to fetch highlighted original PDF from backend
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(
          `${API_BASE_URL}/documents/${documentId}/download-highlighted/ai`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        if (res.ok) {
          const originalBytes = await res.arrayBuffer();
          const originalDoc = await PDFDocument.load(originalBytes);
          const originalPages = await mergedPdf.copyPages(
            originalDoc,
            getOriginalPageIndices(originalDoc, pageCount),
          );
          originalPages.forEach((p) => mergedPdf.addPage(p));
        } else {
          toast.warning("Highlighted original unavailable", {
            description: "Downloading summary only.",
          });
        }
      } catch (err) {
        console.error("Failed to fetch highlighted PDF", err);
        toast.warning("Highlighted original unavailable", {
          description: "Downloading summary only.",
        });
      }

      // 3. Save & trigger download
      const finalBytes = await mergedPdf.save();
      const blob = new Blob([finalBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AI_Report_${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      toast.error("Failed to generate PDF", {
        description: "The report could not be prepared for download.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-neutral-200/70 backdrop-blur-sm">
      {/* Top toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-4 py-2 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: BRAND }} />
          NAK-style AI Detection Report
        </div>
        <Button
          onClick={downloadPdf}
          disabled={downloading}
          style={{ backgroundColor: BRAND }}
          className="text-white hover:opacity-90"
        >
          <Download className="h-4 w-4 mr-2" />
          {downloading ? "Preparing…" : "Download PDF"}
        </Button>
      </div>

      {/* A4 pages */}
      <div className="py-8 px-4 flex flex-col items-center gap-8">
        <div ref={pagesRef} className="flex flex-col items-center gap-8">
          {/* PAGE 1 - COVER */}
          <section
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              pageBreakAfter: "always",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader pageLabel="Page 1 of 2 - Cover Page" submissionId={submissionId} />

            <div className="flex-1 flex flex-col px-12 py-10">
              <div className="text-center text-4xl tracking-[0.5em] text-gray-300 font-light select-none mt-8 mb-24">
                - -
              </div>

              <h1
                className="text-[46px] leading-[1.1] font-bold mb-4 break-words"
                style={{ color: "#0b1220" }}
              >
                {displayName}
              </h1>
              <p className="text-[22px] text-gray-500 font-normal mb-2">
                AI Writing Detection Report
              </p>
              <div className="flex items-center gap-2 text-gray-600 text-[15px] mb-10 mt-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="3"
                    width="14"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>Assignment</span>
              </div>

              <hr className="border-gray-200 mb-8" />

              <h2 className="text-[20px] font-bold mb-6" style={{ color: "#0b1220" }}>
                Document Details
              </h2>

              <div className="grid grid-cols-[1fr_auto] gap-16">
                <div className="space-y-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Submission ID
                    </div>
                    <div className="text-[15px] font-semibold" style={{ color: "#0b1220" }}>
                      trn:oid:::{submissionId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Submission Date
                    </div>
                    <div className="text-[15px] font-semibold" style={{ color: "#0b1220" }}>
                      {formatDate(createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      File Name
                    </div>
                    <div className="text-[15px] font-semibold break-all" style={{ color: "#0b1220" }}>
                      {fileName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      File Type
                    </div>
                    <div className="text-[15px] font-semibold uppercase" style={{ color: "#0b1220" }}>
                      {fileType}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      File Size
                    </div>
                    <div className="text-[15px] font-semibold" style={{ color: "#0b1220" }}>
                      {formatBytes(metadata.file_size)}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-md border px-8 py-6 min-w-[240px] space-y-4 text-right self-start"
                  style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}
                >
                  <div className="text-[15px] font-bold" style={{ color: "#0b1220" }}>
                    {pageCount.toLocaleString()} Pages
                  </div>
                  <div className="text-[15px] font-bold" style={{ color: "#0b1220" }}>
                    {wordCount.toLocaleString()} Words
                  </div>
                  <div className="text-[15px] font-bold" style={{ color: "#0b1220" }}>
                    {characterCount.toLocaleString()} Characters
                  </div>
                </div>
              </div>

              <div className="flex-1" />
            </div>

            <PageFooter pageLabel="Page 1 of 2 - Cover Page" submissionId={submissionId} />
          </section>

          {/* PAGE 2 - AI OVERVIEW */}
          <section
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader
              pageLabel="Page 2 of 2 - AI Writing Overview"
              submissionId={submissionId}
            />

            <div className="flex-1 flex flex-col px-12 py-10">
              <div className="grid grid-cols-[1.1fr_1fr] gap-10 items-start">
                <div>
                  <h1
                    className="text-[42px] leading-[1.1] font-bold mb-3"
                    style={{ color: "#0b1220" }}
                  >
                    {overallAiScore}% detected as AI
                  </h1>
                  <p className="text-[14px] text-gray-600 leading-relaxed max-w-md">
                    The percentage indicates the combined amount of likely AI-generated text as
                    well as likely AI-generated text that was also likely AI-paraphrased.
                  </p>
                </div>

                <div
                  className="rounded-lg p-6 border"
                  style={{ backgroundColor: "#e8f4fd", borderColor: "#d0e4f0" }}
                >
                  <div className="text-[14px] font-bold mb-3" style={{ color: "#0b1220" }}>
                    {caution.title}
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#0b1220" }}>
                    {caution.body}
                  </p>
                </div>
              </div>

              <hr className="border-gray-200 my-10" />

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div
                    className="rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#c4ebe8" }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: "#0b7a70" }} />
                  </div>
                  <div>
                    <div className="text-[15px] mb-1" style={{ color: "#0b1220" }}>
                      <span className="font-bold">{Math.round(aiOnly * (wordCount / 100))}</span>
                      <span className="mx-2 font-bold">AI-generated only</span>
                      <span className="font-bold">{aiOnly}%</span>
                    </div>
                    <p className="text-[13px] text-gray-600">
                      Likely AI-generated text from a large-language model.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#e3d7f5" }}
                  >
                    <RefreshCw className="h-4 w-4" style={{ color: "#6b3fa0" }} />
                  </div>
                  <div>
                    <div className="text-[15px] mb-1" style={{ color: "#0b1220" }}>
                      <span className="font-bold">
                        {Math.round(paraphrased * (wordCount / 100))}
                      </span>
                      <span className="mx-2 font-bold">
                        AI-generated text that was AI-paraphrased
                      </span>
                      <span className="font-bold">{paraphrased}%</span>
                    </div>
                    <p className="text-[13px] text-gray-600">
                      Likely AI-generated text that was likely revised using an AI-paraphrase tool
                      or word spinner.
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 my-10" />

              <div>
                <div className="text-[13px] font-bold mb-2" style={{ color: "#0b1220" }}>
                  Disclaimer
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Our AI writing assessment is designed to help educators identify text that might
                  be prepared by a generative AI tool. Our AI writing assessment may not always be
                  accurate (i.e., our AI models may produce either false positive results or false
                  negative results), so it should not be used as the sole basis for adverse actions
                  against a student. It takes further scrutiny and human judgment in conjunction
                  with an organization's application of its specific academic policies to determine
                  whether any academic misconduct has occurred.
                </p>
              </div>

              <div className="flex-1" />
            </div>

            <PageFooter
              pageLabel="Page 2 of 2 - AI Writing Overview"
              submissionId={submissionId}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
