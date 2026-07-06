import { useRef, useState } from "react";
import { Download, Sparkles, RefreshCw, X, FileText } from "lucide-react";
import html2canvas from "html2canvas";
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

const PDF_STYLE_PROPS = [
  ["color", "#111827"],
  ["background-color", "transparent"],
  ["border-top-color", "#e5e7eb"],
  ["border-right-color", "#e5e7eb"],
  ["border-bottom-color", "#e5e7eb"],
  ["border-left-color", "#e5e7eb"],
  ["outline-color", "#111827"],
  ["text-decoration-color", "#111827"],
  ["fill", "currentColor"],
  ["stroke", "currentColor"],
] as const;

const PDF_INLINE_STYLE_PROPS = [
  "align-items",
  "background-color",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "box-sizing",
  "color",
  "display",
  "fill",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "letter-spacing",
  "line-height",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "overflow-wrap",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "row-gap",
  "stroke",
  "text-align",
  "text-decoration-color",
  "text-transform",
  "vertical-align",
  "white-space",
  "width",
  "word-break",
] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseOklchChannel(value: string, isLightness = false) {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed / 100 : 0;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return 0;
  return isLightness && parsed > 1 ? parsed / 100 : parsed;
}

function parseOklchAlpha(value?: string) {
  if (!value) return 1;
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? clamp01(parsed / 100) : 1;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? clamp01(parsed) : 1;
}

function oklchToRgb(value: string) {
  const alphaSplit = value.trim().split("/").map((part) => part.trim());
  const channels = alphaSplit[0].split(/\s+/).filter(Boolean);
  if (channels.length < 3) return null;

  const l = parseOklchChannel(channels[0], true);
  const c = parseOklchChannel(channels[1]);
  const h = Number.parseFloat(channels[2]);
  if (!Number.isFinite(h)) return null;

  const alpha = parseOklchAlpha(alphaSplit[1]);
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = lPrime ** 3;
  const mCubed = mPrime ** 3;
  const sCubed = sPrime ** 3;

  const linearR = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const linearG = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const linearB = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  const toSrgb = (channel: number) => {
    const converted =
      channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
    return Math.round(clamp01(converted) * 255);
  };

  const red = toSrgb(linearR);
  const green = toSrgb(linearG);
  const blue = toSrgb(linearB);

  return alpha < 1 ? `rgba(${red}, ${green}, ${blue}, ${alpha})` : `rgb(${red}, ${green}, ${blue})`;
}

function normalizePdfColorValue(value: string, fallback: string) {
  if (!value || value === "none" || value === "currentColor") return value;
  const normalized = value.replace(/oklch\(([^)]+)\)/gi, (_match, colorBody: string) => {
    return oklchToRgb(colorBody) ?? fallback;
  });

  return /\b(oklch|oklab|lch|lab|color-mix)\(/i.test(normalized) ? fallback : normalized;
}

function normalizePdfStyleValue(property: string, value: string) {
  if (!value) return value;
  const colorFallback =
    property.includes("background")
      ? "transparent"
      : property.includes("border")
        ? "#e5e7eb"
        : property === "fill" || property === "stroke"
          ? "currentColor"
          : "#111827";

  if (
    property.includes("color") ||
    property.includes("shadow") ||
    property === "fill" ||
    property === "stroke"
  ) {
    return normalizePdfColorValue(value, colorFallback);
  }

  return /\b(oklch|oklab|lch|lab|color-mix)\(/i.test(value) ? colorFallback : value;
}

function makePdfCloneCanvasSafe(clonedDoc: Document) {
  const elements = clonedDoc.querySelectorAll<HTMLElement | SVGElement>("*");

  elements.forEach((el) => {
    const computedStyle = clonedDoc.defaultView?.getComputedStyle(el);
    if (!computedStyle) return;

    el.removeAttribute("class");

    PDF_INLINE_STYLE_PROPS.forEach((property) => {
      const computedValue = computedStyle.getPropertyValue(property);
      if (computedValue) {
        el.style.setProperty(
          property,
          normalizePdfStyleValue(property, computedValue),
          "important",
        );
      }
    });

    PDF_STYLE_PROPS.forEach(([property, fallback]) => {
      const computedValue = computedStyle.getPropertyValue(property);
      const safeValue = normalizePdfColorValue(computedValue, fallback);
      if (safeValue) el.style.setProperty(property, safeValue, "important");
    });

    const boxShadow = normalizePdfColorValue(computedStyle.getPropertyValue("box-shadow"), "none");
    const textShadow = normalizePdfColorValue(computedStyle.getPropertyValue("text-shadow"), "none");
    el.style.setProperty("box-shadow", boxShadow === "none" ? "none" : boxShadow, "important");
    el.style.setProperty("text-shadow", textShadow === "none" ? "none" : textShadow, "important");

    if (el instanceof clonedDoc.defaultView!.SVGElement) {
      const fill = el.style.getPropertyValue("fill");
      const stroke = el.style.getPropertyValue("stroke");
      if (fill && fill !== "currentColor") el.setAttribute("fill", fill);
      if (stroke && stroke !== "currentColor") el.setAttribute("stroke", stroke);
    }
  });
}

function copyStylesToPdfClone(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement | SVGElement>("*"))];
  const cloneElements = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement | SVGElement>("*"))];

  sourceElements.forEach((sourceEl, index) => {
    const cloneEl = cloneElements[index];
    const computedStyle = window.getComputedStyle(sourceEl);
    if (!cloneEl || !computedStyle) return;

    cloneEl.removeAttribute("class");
    PDF_INLINE_STYLE_PROPS.forEach((property) => {
      const value = computedStyle.getPropertyValue(property);
      if (value) {
        cloneEl.style.setProperty(property, normalizePdfStyleValue(property, value), "important");
      }
    });

    const boxShadow = normalizePdfColorValue(computedStyle.getPropertyValue("box-shadow"), "none");
    const textShadow = normalizePdfColorValue(computedStyle.getPropertyValue("text-shadow"), "none");
    cloneEl.style.setProperty("box-shadow", boxShadow === "none" ? "none" : boxShadow, "important");
    cloneEl.style.setProperty("text-shadow", textShadow === "none" ? "none" : textShadow, "important");

    if (sourceEl instanceof SVGElement && cloneEl instanceof SVGElement) {
      cloneEl.setAttribute("width", sourceEl.getAttribute("width") ?? `${sourceEl.clientWidth}`);
      cloneEl.setAttribute("height", sourceEl.getAttribute("height") ?? `${sourceEl.clientHeight}`);
      const fill = cloneEl.style.getPropertyValue("fill");
      const stroke = cloneEl.style.getPropertyValue("stroke");
      if (fill && fill !== "currentColor") cloneEl.setAttribute("fill", fill);
      if (stroke && stroke !== "currentColor") cloneEl.setAttribute("stroke", stroke);
    }
  });

  cloneRoot.style.setProperty("position", "fixed", "important");
  cloneRoot.style.setProperty("left", "0", "important");
  cloneRoot.style.setProperty("top", "0", "important");
  cloneRoot.style.setProperty("z-index", "-1", "important");
  cloneRoot.style.setProperty("pointer-events", "none", "important");
  cloneRoot.style.setProperty("background", "#ffffff", "important");
}

async function renderSummaryPdf(element: HTMLElement, filename: string) {
  const sourcePages = Array.from(element.querySelectorAll<HTMLElement>("section"));
  if (sourcePages.length === 0) {
    throw new Error("No report pages found for PDF export");
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  for (const [index, page] of sourcePages.entries()) {
    const canvas = await html2canvas(page, {
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: makePdfCloneCanvasSafe,
    });

    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error(`Report page ${index + 1} rendered blank`);
    }

    if (index > 0) pdf.addPage("a4", "portrait");

    const imageData = canvas.toDataURL("image/jpeg", 0.98);
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imageHeight = (canvas.height * pdfWidth) / canvas.width;
    const drawHeight = Math.min(pdfHeight, imageHeight);
    const y = drawHeight < pdfHeight ? (pdfHeight - drawHeight) / 2 : 0;
    pdf.addImage(imageData, "JPEG", 0, y, pdfWidth, drawHeight, undefined, "FAST");
  }

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
      // 1. Generate summary PDF bytes from DOM
      let summaryArrayBuffer: ArrayBuffer;
      try {
        summaryArrayBuffer = await renderSummaryPdf(
          pagesRef.current,
          `${displayName}-ai-report.pdf`,
        );
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
