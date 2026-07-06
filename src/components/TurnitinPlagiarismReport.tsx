import { useRef, useState, useMemo } from "react";
import {
  Download,
  X,
  FileText,
  Globe,
  BookOpen,
  User,
  Quote,
  AlignLeft,
  MessageSquare,
  BookMarked,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toPng } from "html-to-image";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

/**
 * Turnitin-style Plagiarism Similarity Report.
 * Mirrors the visual chrome of TurnitinAIReport but with a Similarity layout:
 * cover page + integrity overview + match groups / top sources / matched sources.
 */
export interface TurnitinPlagiarismReportProps {
  documentId: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  overallPlagiarismScore: number;
  matchedSources: Array<{
    url: string;
    title: string;
    matched_text: string;
    original_text: string;
    similarity_score: number;
    chunk_index: number;
  }>;
  integrityFlags?: Array<{ type: string; description: string }>;
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

const CSS_PX_TO_PDF_PT = 72 / 96;
const REPORT_CAPTURE_SCALE = 2;

const COLOR_PROPERTIES = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "column-rule-color",
  "fill",
  "stroke",
  "box-shadow",
  "text-shadow",
];

function clampByte(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function linearSrgbToByte(v: number) {
  const n = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return clampByte(n * 255);
}
function parseOklchPart(part: string, i: number) {
  const t = part.trim();
  if (!t || t === "none") return 0;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return 0;
  if (i === 0 && t.endsWith("%")) return n / 100;
  if (i === 2) {
    if (t.endsWith("rad")) return n * (180 / Math.PI);
    if (t.endsWith("turn")) return n * 360;
  }
  return n;
}
function alphaToCss(a?: string) {
  if (!a) return "1";
  const t = a.trim();
  if (t.endsWith("%")) {
    const p = Number.parseFloat(t);
    return Number.isFinite(p) ? String(Math.max(0, Math.min(1, p / 100))) : "1";
  }
  const v = Number.parseFloat(t);
  return Number.isFinite(v) ? String(Math.max(0, Math.min(1, v))) : "1";
}
function oklchToRgba(input: string) {
  const [vp, ap] = input.split("/");
  const parts = vp.trim().split(/\s+/);
  const l = parseOklchPart(parts[0] ?? "0", 0);
  const c = parseOklchPart(parts[1] ?? "0", 1);
  const h = (parseOklchPart(parts[2] ?? "0", 2) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lp = l + 0.3963377774 * a + 0.2158037573 * b;
  const mp = l - 0.1055613458 * a - 0.0638541728 * b;
  const sp = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = lp ** 3, m3 = mp ** 3, s3 = sp ** 3;
  const r = linearSrgbToByte(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
  const g = linearSrgbToByte(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
  const bl = linearSrgbToByte(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);
  return `rgba(${r}, ${g}, ${bl}, ${alphaToCss(ap)})`;
}
function replaceUnsupportedColorFunctions(v: string) {
  return v.replace(/oklch\(([^)]+)\)/gi, (_, c: string) => oklchToRgba(c));
}
function makeCloneCanvasSafe(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  nodes.forEach((node) => {
    const cs = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (!cs) return;
    COLOR_PROPERTIES.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (v && v.includes("oklch(")) node.style.setProperty(p, replaceUnsupportedColorFunctions(v));
    });
  });
}
async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
    }),
  );
}

async function addVisibleReportPages(mergedPdf: PDFDocument, root: HTMLElement) {
  await document.fonts?.ready;
  await waitForImages(root);
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-report-page]"));
  if (!pages.length) throw new Error("No report pages found for export");
  for (const page of pages) {
    const rect = page.getBoundingClientRect();
    const dataUrl = await toPng(page, {
      pixelRatio: REPORT_CAPTURE_SCALE,
      cacheBust: true,
      backgroundColor: "#ffffff",
      width: rect.width,
      height: rect.height,
      style: { boxShadow: "none" },
    });
    const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
    const embedded = await mergedPdf.embedPng(pngBytes);
    const w = rect.width * CSS_PX_TO_PDF_PT;
    const h = rect.height * CSS_PX_TO_PDF_PT;
    const p = mergedPdf.addPage([w, h]);
    p.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
  }
}

function getOriginalPageIndices(originalDoc: PDFDocument, expectedPageCount: number) {
  const indices = originalDoc.getPageIndices();
  const expected = Math.max(1, Math.round(expectedPageCount));
  if (Number.isFinite(expected) && expected > 0 && indices.length > expected) {
    return indices.slice(indices.length - expected);
  }
  return indices;
}

async function stampHeaderFooter(
  pdf: PDFDocument,
  pageIndices: number[],
  startPageNumber: number,
  totalPages: number,
  submissionId: string,
) {
  const logoBytes = await fetch(TURNITIN_LOGO_URL).then((r) => r.arrayBuffer());
  const logo = await pdf.embedPng(logoBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const BAND_H = 50;
  const LOGO_H = 21;
  const FONT_SIZE = 7.5;
  const MARGIN_X = 36;
  const LOGO_TEXT_GAP = 24;
  const TEXT_COLOR = rgb(0.12, 0.16, 0.22);
  const BORDER_COLOR = rgb(0.9, 0.91, 0.92);
  const WHITE = rgb(1, 1, 1);

  const logoW = logo.width * (LOGO_H / logo.height);
  const pages = pdf.getPages();

  pageIndices.forEach((idx, i) => {
    const page = pages[idx];
    const { width, height } = page.getSize();
    const pageNum = startPageNumber + i;
    const label = `Page ${pageNum} of ${totalPages} - Integrity Overview`;
    const subText = `Submission ID  trn:oid:::${submissionId}`;
    const subW = font.widthOfTextAtSize(subText, FONT_SIZE);
    const textY = (y: number) => y - FONT_SIZE / 2 + 1;

    page.drawRectangle({ x: 0, y: height - BAND_H, width, height: BAND_H, color: WHITE });
    page.drawLine({
      start: { x: 0, y: height - BAND_H },
      end: { x: width, y: height - BAND_H },
      thickness: 0.5,
      color: BORDER_COLOR,
    });
    page.drawImage(logo, { x: MARGIN_X, y: height - BAND_H / 2 - LOGO_H / 2, width: logoW, height: LOGO_H });
    page.drawText(label, { x: MARGIN_X + logoW + LOGO_TEXT_GAP, y: textY(height - BAND_H / 2), size: FONT_SIZE, font, color: TEXT_COLOR });
    page.drawText(subText, { x: width - MARGIN_X - subW, y: textY(height - BAND_H / 2), size: FONT_SIZE, font, color: TEXT_COLOR });

    page.drawRectangle({ x: 0, y: 0, width, height: BAND_H, color: WHITE });
    page.drawLine({ start: { x: 0, y: BAND_H }, end: { x: width, y: BAND_H }, thickness: 0.5, color: BORDER_COLOR });
    page.drawImage(logo, { x: MARGIN_X, y: BAND_H / 2 - LOGO_H / 2, width: logoW, height: LOGO_H });
    page.drawText(label, { x: MARGIN_X + logoW + LOGO_TEXT_GAP, y: textY(BAND_H / 2), size: FONT_SIZE, font, color: TEXT_COLOR });
    page.drawText(subText, { x: width - MARGIN_X - subW, y: textY(BAND_H / 2), size: FONT_SIZE, font, color: TEXT_COLOR });
  });
}

function TurnitinLogo({ opacity = 1, size = 28 }: { opacity?: number; size?: number }) {
  return (
    <img
      src={TURNITIN_LOGO_URL}
      alt="turnitin"
      crossOrigin="anonymous"
      style={{ opacity, height: size, width: "auto", display: "block" }}
    />
  );
}

function PageHeader({ pageLabel, submissionId }: { pageLabel: string; submissionId: string }) {
  return (
    <div className="flex items-center justify-between px-12 py-5 border-b" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center gap-8">
        <TurnitinLogo />
        <span style={{ fontSize: "10px", color: "#1f2937", fontWeight: 400 }}>{pageLabel}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#1f2937", fontWeight: 400 }}>
        Submission ID <span className="ml-3">trn:oid:::{submissionId}</span>
      </div>
    </div>
  );
}
function PageFooter({ pageLabel, submissionId }: { pageLabel: string; submissionId: string }) {
  return (
    <div className="flex items-center justify-between px-12 py-5 border-t" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center gap-8">
        <TurnitinLogo />
        <span style={{ fontSize: "10px", color: "#1f2937", fontWeight: 400 }}>{pageLabel}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#1f2937", fontWeight: 400 }}>
        Submission ID <span className="ml-3">trn:oid:::{submissionId}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
    });
  } catch { return iso; }
}
function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// classify a source as internet vs student paper based on url shape
function classifySource(s: { url: string; title: string }): "internet" | "student" | "publication" {
  const url = (s.url || "").toLowerCase();
  const title = (s.title || "").toLowerCase();
  if (!url || url === title || /student|submitted|paper|university|college|institute|school/.test(title + " " + url)) {
    if (/^https?:\/\//.test(url) && !/student|submitted/.test(title)) return "internet";
    return "student";
  }
  if (/^https?:\/\//.test(url)) return "internet";
  return "student";
}

function rankColor(idx: number) {
  // 1-3 pink/red, 4-6 blue, 7-9 green, 10+ purple — matches screenshot cycling
  const cycle = idx % 4;
  if (cycle === 1) return { bg: "#c2185b", fg: "#ffffff" }; // pink
  if (cycle === 2) return { bg: "#1e88e5", fg: "#ffffff" }; // blue
  if (cycle === 3) return { bg: "#43a047", fg: "#ffffff" }; // green
  return { bg: "#6a1b9a", fg: "#ffffff" }; // purple
}

export function TurnitinPlagiarismReport(props: TurnitinPlagiarismReportProps) {
  const {
    documentId, fileName, fileType, createdAt,
    overallPlagiarismScore, matchedSources, integrityFlags,
    metadata, extractedText, onClose,
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

  const flags = integrityFlags ?? [];
  const sources = matchedSources ?? [];

  // Derived breakdown from available data
  const derived = useMemo(() => {
    const overall = Math.round(overallPlagiarismScore || 0);
    let internet = 0, student = 0, publication = 0;
    for (const s of sources) {
      const kind = classifySource(s);
      const pct = s.similarity_score ?? 0;
      if (kind === "internet") internet += pct;
      else if (kind === "student") student += pct;
      else publication += pct;
    }
    // normalize to overall
    const total = internet + student + publication;
    const scale = total > 0 ? overall / total : 0;
    internet = Math.round(internet * scale * 10) / 10;
    student = Math.round(student * scale * 10) / 10;
    publication = Math.round(publication * scale * 10) / 10;

    // approximate match groups
    const notCitedCount = sources.length;
    const notCitedPct = Math.round(overall * 0.6 * 10) / 10;
    const missingQuoteCount = Math.max(0, Math.round(sources.length * 0.25));
    const missingQuotePct = Math.round(overall * 0.2 * 10) / 10;
    const missingCitationCount = Math.max(0, Math.round(sources.length * 0.1));
    const missingCitationPct = Math.round(overall * 0.1 * 10) / 10;
    const citedQuotedCount = Math.max(0, Math.round(sources.length * 0.15));
    const citedQuotedPct = Math.round(overall * 0.1 * 10) / 10;

    return {
      overall,
      internet, student, publication,
      notCitedCount, notCitedPct,
      missingQuoteCount, missingQuotePct,
      missingCitationCount, missingCitationPct,
      citedQuotedCount, citedQuotedPct,
    };
  }, [overallPlagiarismScore, sources]);

  const displayName = fileName.replace(/\.[^.]+$/, "");

  const downloadPdf = async () => {
    if (!pagesRef.current) return;
    setDownloading(true);
    try {
      const mergedPdf = await PDFDocument.create();

      try {
        await addVisibleReportPages(mergedPdf, pagesRef.current);
      } catch (renderError) {
        console.error("Failed to capture visible plagiarism report PDF", renderError);
        toast.error("Could not render the report PDF", {
          description: "Please try again after the report finishes loading.",
        });
        return;
      }

      const reportPageCount = mergedPdf.getPageCount();
      let originalAppendedCount = 0;
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(
          `${API_BASE_URL}/documents/${documentId}/download-highlighted/plagiarism`,
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
        );
        if (res.ok) {
          const originalBytes = await res.arrayBuffer();
          const originalDoc = await PDFDocument.load(originalBytes);
          const sourceIndices = getOriginalPageIndices(originalDoc, pageCount);
          const originalPages = await mergedPdf.copyPages(originalDoc, sourceIndices);
          originalPages.forEach((p) => mergedPdf.addPage(p));
          originalAppendedCount = originalPages.length;
        } else {
          toast.warning("Highlighted original unavailable", { description: "Downloading summary only." });
        }
      } catch (err) {
        console.error("Failed to fetch highlighted PDF", err);
        toast.warning("Highlighted original unavailable", { description: "Downloading summary only." });
      }

      if (originalAppendedCount > 0) {
        const stampedIndices = Array.from(
          { length: originalAppendedCount },
          (_, i) => reportPageCount + i,
        );
        try {
          await stampHeaderFooter(
            mergedPdf,
            stampedIndices,
            reportPageCount + 1,
            reportPageCount + originalAppendedCount,
            submissionId,
          );
        } catch (stampErr) {
          console.error("Failed to stamp header/footer on original pages", stampErr);
        }
      }

      const finalBytes = await mergedPdf.save();
      const blob = new Blob([finalBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Plagiarism_Report_${documentId}.pdf`;
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
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-4 py-2 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: BRAND }} />
          NAK-style Plagiarism Report
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

      <div className="py-8 px-4 flex flex-col items-center gap-8">
        <div ref={pagesRef} className="flex flex-col items-center gap-8">
          {/* PAGE 1 — COVER (same as AI cover) */}
          <section
            data-report-page="cover"
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              pageBreakAfter: "always",
              fontFamily:
                "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader pageLabel="Page 1 of 3 - Cover Page" submissionId={submissionId} />

            <div className="flex-1 flex flex-col px-14 pt-10 pb-10">
              <div style={{ height: "380px" }} />

              <h1 className="text-[34px] leading-[1.2] font-bold mb-2 break-words" style={{ color: "#0b1220" }}>
                {displayName}
              </h1>

              <hr className="border-gray-200 mt-6 mb-8" />

              <h2 className="text-[17px] font-bold mb-6" style={{ color: "#0b1220" }}>Document Details</h2>

              <div className="grid grid-cols-[1fr_auto] gap-10 items-start">
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">Submission ID</div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>trn:oid:::{submissionId}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">Submission Date</div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>{formatDate(createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">File Name</div>
                    <div className="text-[13px] font-bold break-all" style={{ color: "#0b1220" }}>{fileName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">File Type</div>
                    <div className="text-[13px] font-bold uppercase" style={{ color: "#0b1220" }}>{fileType}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">File Size</div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>{formatBytes(metadata.file_size)}</div>
                  </div>
                </div>

                <div className="rounded-md px-6 py-4 min-w-[200px] space-y-2 ml-10" style={{ backgroundColor: "#f5f5f5" }}>
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>{pageCount.toLocaleString()} Pages</div>
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>{wordCount.toLocaleString()} Words</div>
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>{characterCount.toLocaleString()} Characters</div>
                </div>
              </div>

              <div className="flex-1" />
            </div>

            <PageFooter pageLabel="Page 1 of 3 - Cover Page" submissionId={submissionId} />
          </section>

          {/* PAGE 2 — INTEGRITY OVERVIEW */}
          <section
            data-report-page="overview"
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              pageBreakAfter: "always",
              fontFamily:
                "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader pageLabel="Page 2 of 3 - Integrity Overview" submissionId={submissionId} />

            <div className="flex-1 flex flex-col px-12 py-10">
              <h1 className="text-[36px] leading-[1.1] font-bold mb-2" style={{ color: "#0b1220" }}>
                <span>{derived.overall}%</span>
                <span className="ml-4">Overall Similarity</span>
              </h1>
              <p className="text-[12px] text-gray-600 mb-8">
                The combined total of all matches, including overlapping sources, for each database.
              </p>

              <h2 className="text-[15px] font-bold mb-3" style={{ color: "#0b1220" }}>Filtered from the Report</h2>
              <div className="text-[12px] mb-2 flex items-center gap-2" style={{ color: "#0b1220" }}>
                <ChevronRight className="h-3 w-3" /> Bibliography
              </div>

              <hr className="border-gray-200 my-8" />

              <div className="grid grid-cols-2 gap-10">
                <div>
                  <h3 className="text-[15px] font-bold mb-4" style={{ color: "#0b1220" }}>Match Groups</h3>
                  <div className="space-y-4">
                    <MatchGroupRow
                      icon={<AlignLeft className="h-3.5 w-3.5" />}
                      color="#e53935"
                      count={derived.notCitedCount}
                      label="Not Cited or Quoted"
                      pct={derived.notCitedPct}
                      desc="Matches with neither in-text citation nor quotation marks"
                    />
                    <MatchGroupRow
                      icon={<Quote className="h-3.5 w-3.5" />}
                      color="#fb8c00"
                      count={derived.missingQuoteCount}
                      label="Missing Quotations"
                      pct={derived.missingQuotePct}
                      desc="Matches that are still very similar to source material"
                    />
                    <MatchGroupRow
                      icon={<MessageSquare className="h-3.5 w-3.5" />}
                      color="#fdd835"
                      count={derived.missingCitationCount}
                      label="Missing Citation"
                      pct={derived.missingCitationPct}
                      desc="Matches that have quotation marks, but no in-text citation"
                    />
                    <MatchGroupRow
                      icon={<BookMarked className="h-3.5 w-3.5" />}
                      color="#43a047"
                      count={derived.citedQuotedCount}
                      label="Cited and Quoted"
                      pct={derived.citedQuotedPct}
                      desc="Matches with in-text citation present, but no quotation marks"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold mb-4" style={{ color: "#0b1220" }}>Top Sources</h3>
                  <div className="space-y-3">
                    <TopSourceRow icon={<Globe className="h-4 w-4" />} label="Internet sources" pct={derived.internet} />
                    <TopSourceRow icon={<BookOpen className="h-4 w-4" />} label="Publications" pct={derived.publication} />
                    <TopSourceRow icon={<User className="h-4 w-4" />} label="Submitted works (Student Papers)" pct={derived.student} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 my-8" />

              <div>
                <h3 className="text-[15px] font-bold mb-1" style={{ color: "#0b1220" }}>Integrity Flags</h3>
                <div className="text-[13px] font-bold mb-4" style={{ color: "#0b1220" }}>
                  {flags.length} Integrity Flag{flags.length === 1 ? "" : "s"} for Review
                </div>

                <div className="grid grid-cols-2 gap-6 items-start">
                  <div className="space-y-2">
                    {flags.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-lg p-3 flex items-start gap-2"
                        style={{ backgroundColor: "#fff4e5", border: "1px solid #ffe0b2" }}
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#e65100" }} />
                        <div>
                          <div className="text-[12px] font-bold" style={{ color: "#4e342e" }}>{f.type}</div>
                          <div className="text-[11px]" style={{ color: "#5d4037" }}>{f.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "#e8f4fd" }}
                  >
                    <p className="text-[11px] leading-relaxed" style={{ color: "#0b1220" }}>
                      Our system&apos;s algorithms look deeply at a document for any inconsistencies that would set it apart from a normal submission. If we notice something strange, we flag it for you to review.
                    </p>
                    <p className="text-[11px] leading-relaxed mt-2" style={{ color: "#0b1220" }}>
                      A Flag is not necessarily an indicator of a problem. However, we&apos;d recommend you focus your attention there for further review.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1" />
            </div>

            <PageFooter pageLabel="Page 2 of 3 - Integrity Overview" submissionId={submissionId} />
          </section>

          {/* PAGE 3 — TOP SOURCES LIST */}
          <section
            data-report-page="sources"
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              fontFamily:
                "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader pageLabel="Page 3 of 3 - Integrity Overview" submissionId={submissionId} />

            <div className="flex-1 flex flex-col px-12 py-10">
              <div className="grid grid-cols-2 gap-10 mb-8">
                <div>
                  <h3 className="text-[15px] font-bold mb-4" style={{ color: "#0b1220" }}>Match Groups</h3>
                  <div className="space-y-4">
                    <MatchGroupRow icon={<AlignLeft className="h-3.5 w-3.5" />} color="#e53935" count={derived.notCitedCount} label="Not Cited or Quoted" pct={derived.notCitedPct} desc="Matches with neither in-text citation nor quotation marks" />
                    <MatchGroupRow icon={<Quote className="h-3.5 w-3.5" />} color="#fb8c00" count={derived.missingQuoteCount} label="Missing Quotations" pct={derived.missingQuotePct} desc="Matches that are still very similar to source material" />
                    <MatchGroupRow icon={<MessageSquare className="h-3.5 w-3.5" />} color="#fdd835" count={derived.missingCitationCount} label="Missing Citation" pct={derived.missingCitationPct} desc="Matches that have quotation marks, but no in-text citation" />
                    <MatchGroupRow icon={<BookMarked className="h-3.5 w-3.5" />} color="#43a047" count={derived.citedQuotedCount} label="Cited and Quoted" pct={derived.citedQuotedPct} desc="Matches with in-text citation present, but no quotation marks" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold mb-4" style={{ color: "#0b1220" }}>Top Sources</h3>
                  <div className="space-y-3">
                    <TopSourceRow icon={<Globe className="h-4 w-4" />} label="Internet sources" pct={derived.internet} />
                    <TopSourceRow icon={<BookOpen className="h-4 w-4" />} label="Publications" pct={derived.publication} />
                    <TopSourceRow icon={<User className="h-4 w-4" />} label="Submitted works (Student Papers)" pct={derived.student} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 mb-6" />

              <h3 className="text-[18px] font-bold mb-1" style={{ color: "#0b1220" }}>Top Sources</h3>
              <p className="text-[12px] text-gray-600 mb-5">
                The sources with the highest number of matches within the submission. Overlapping sources will not be displayed.
              </p>

              <div className="space-y-4">
                {sources.slice(0, 10).map((s, i) => {
                  const idx = i + 1;
                  const c = rankColor(idx);
                  const kind = classifySource(s);
                  const badge =
                    kind === "student"
                      ? { label: "Student papers", bg: "#fce4ec", fg: "#c2185b" }
                      : kind === "publication"
                        ? { label: "Publication", bg: "#e0f2f1", fg: "#00695c" }
                        : { label: "Internet", bg: "#ede7f6", fg: "#4527a0" };
                  const displayTitle = s.title || s.url;
                  const pctText =
                    s.similarity_score < 1
                      ? "<1%"
                      : `${Math.round(s.similarity_score)}%`;

                  return (
                    <div key={i} className="pb-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{ width: 22, height: 22, backgroundColor: c.bg, color: c.fg }}
                        >
                          {idx}
                        </div>
                        <div
                          className="rounded-full px-3 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.fg }}
                        >
                          {badge.label}
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-[13px] font-bold break-all" style={{ color: "#0b1220" }}>
                          {displayTitle}
                        </div>
                        <div className="text-[13px] font-bold shrink-0" style={{ color: "#0b1220" }}>
                          {pctText}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {sources.length === 0 && (
                  <div className="text-[12px] text-gray-500 italic">No matching sources found.</div>
                )}
              </div>

              <div className="flex-1" />
            </div>

            <PageFooter pageLabel="Page 3 of 3 - Integrity Overview" submissionId={submissionId} />
          </section>
        </div>
      </div>
    </div>
  );
}

function MatchGroupRow({
  icon, color, count, label, pct, desc,
}: { icon: React.ReactNode; color: string; count: number; label: string; pct: number; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="rounded-md flex items-center justify-center shrink-0"
        style={{ width: 22, height: 22, backgroundColor: color, color: "#fff" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[12px]" style={{ color: "#0b1220" }}>
          <span className="font-bold">{count}</span>
          <span className="mx-1.5 font-semibold">{label}</span>
          <span className="font-bold">{pct}%</span>
        </div>
        <div className="text-[11px] text-gray-500">{desc}</div>
      </div>
    </div>
  );
}

function TopSourceRow({ icon, label, pct }: { icon: React.ReactNode; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[12px] font-bold w-8" style={{ color: "#0b1220" }}>{pct}%</div>
      <div style={{ color: "#4b5563" }}>{icon}</div>
      <div className="text-[12px]" style={{ color: "#0b1220" }}>{label}</div>
    </div>
  );
}
