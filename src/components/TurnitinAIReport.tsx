import { useRef, useState } from "react";
import { Download, X, FileText } from "lucide-react";
import { toPng } from "html-to-image";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import aiIcon from "@/assets/icon-ai.png";
import paraIcon from "@/assets/icon-para.png";

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

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function linearSrgbToByte(value: number) {
  const normalized = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return clampByte(normalized * 255);
}

function parseOklchPart(part: string, index: number) {
  const trimmed = part.trim();
  if (!trimmed || trimmed === "none") return 0;
  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 0;
  if (index === 0 && trimmed.endsWith("%")) return numeric / 100;
  if (index === 2) {
    if (trimmed.endsWith("rad")) return numeric * (180 / Math.PI);
    if (trimmed.endsWith("turn")) return numeric * 360;
  }
  return numeric;
}

function alphaToCss(alpha?: string) {
  if (!alpha) return "1";
  const trimmed = alpha.trim();
  if (trimmed.endsWith("%")) {
    const percent = Number.parseFloat(trimmed);
    return Number.isFinite(percent) ? String(Math.max(0, Math.min(1, percent / 100))) : "1";
  }
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? String(Math.max(0, Math.min(1, value))) : "1";
}

function oklchToRgba(input: string) {
  const [valueParts, alphaPart] = input.split("/");
  const parts = valueParts.trim().split(/\s+/);
  const l = parseOklchPart(parts[0] ?? "0", 0);
  const c = parseOklchPart(parts[1] ?? "0", 1);
  const h = (parseOklchPart(parts[2] ?? "0", 2) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  const red = linearSrgbToByte(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
  const green = linearSrgbToByte(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
  const blue = linearSrgbToByte(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);

  return `rgba(${red}, ${green}, ${blue}, ${alphaToCss(alphaPart)})`;
}

function replaceUnsupportedColorFunctions(value: string) {
  return value.replace(/oklch\(([^)]+)\)/gi, (_, color: string) => oklchToRgba(color));
}

function makeCloneCanvasSafe(clonedRoot: HTMLElement) {
  const nodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"))];

  nodes.forEach((node) => {
    const computed = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (!computed) return;

    COLOR_PROPERTIES.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value && value.includes("oklch(")) {
        node.style.setProperty(property, replaceUnsupportedColorFunctions(value));
      }
    });
  });
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
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

    const pngBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
    const embeddedPng = await mergedPdf.embedPng(pngBytes);
    const pdfWidth = rect.width * CSS_PX_TO_PDF_PT;
    const pdfHeight = rect.height * CSS_PX_TO_PDF_PT;
    const pdfPage = mergedPdf.addPage([pdfWidth, pdfHeight]);
    pdfPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: pdfWidth,
      height: pdfHeight,
    });
  }
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

function TurnitinLogo({ opacity = 1, size = 28 }: { opacity?: number; size?: number }) {
  return (
    <img
      src={TURNITIN_LOGO_URL}
      alt="turnitin"
      crossOrigin="anonymous"
      style={{
        opacity,
        height: size,
        width: "auto",
        display: "block",
      }}
    />
  );
}

function PageHeader({ pageLabel, submissionId }: { pageLabel: string; submissionId: string }) {
  return (
    <div
      className="flex items-center justify-between px-12 py-5 border-b"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center gap-8">
        <TurnitinLogo />
        <span style={{ fontSize: "12px", color: "#1f2937", fontWeight: 400 }}>{pageLabel}</span>
      </div>
      <div style={{ fontSize: "12px", color: "#1f2937", fontWeight: 400 }}>
        Submission ID <span className="ml-3">trn:oid:::{submissionId}</span>
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
      <div className="flex items-center gap-8">
        <TurnitinLogo />
        <span style={{ fontSize: "12px", color: "#1f2937", fontWeight: 400 }}>{pageLabel}</span>
      </div>
      <div style={{ fontSize: "12px", color: "#1f2937", fontWeight: 400 }}>
        Submission ID <span className="ml-3">trn:oid:::{submissionId}</span>
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
      const mergedPdf = await PDFDocument.create();

      // 1. Capture the exact visible report pages the user is looking at.
      // Each page keeps its own rendered size, then the original PDF is appended.
      try {
        await addVisibleReportPages(mergedPdf, pagesRef.current);
      } catch (renderError) {
        console.error("Failed to capture visible report PDF", renderError);
        toast.error("Could not render the report PDF", {
          description: "Please try again after the report finishes loading.",
        });
        return;
      }

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
            <PageHeader pageLabel="Page 1 of 2 - Cover Page" submissionId={submissionId} />

            <div className="flex-1 flex flex-col px-14 pt-10 pb-10">
              <div style={{ height: "230px" }} />

              <h1
                className="text-[34px] leading-[1.2] font-bold mb-2 break-words"
                style={{ color: "#0b1220" }}
              >
                {displayName}
              </h1>

              <hr className="border-gray-200 mt-6 mb-8" />

              <h2 className="text-[17px] font-bold mb-6" style={{ color: "#0b1220" }}>
                Document Details
              </h2>

              <div className="grid grid-cols-[1fr_auto] gap-10 items-start">
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">
                      Submission ID
                    </div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
                      trn:oid:::{submissionId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">
                      Submission Date
                    </div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
                      {formatDate(createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">
                      File Name
                    </div>
                    <div className="text-[13px] font-bold break-all" style={{ color: "#0b1220" }}>
                      {fileName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">
                      File Type
                    </div>
                    <div className="text-[13px] font-bold uppercase" style={{ color: "#0b1220" }}>
                      {fileType}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 font-semibold mb-1">
                      File Size
                    </div>
                    <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
                      {formatBytes(metadata.file_size)}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-md px-6 py-4 min-w-[200px] space-y-2"
                  style={{ backgroundColor: "#f5f5f5" }}
                >
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
                    {pageCount.toLocaleString()} Pages
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
                    {wordCount.toLocaleString()} Words
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: "#0b1220" }}>
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
            data-report-page="overview"
            className="bg-white shadow-lg flex flex-col"
            style={{
              width: "210mm",
              minHeight: "297mm",
              fontFamily:
                "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Tahoma, sans-serif",
              color: "#111827",
            }}
          >
            <PageHeader
              pageLabel="Page 2 of 2 - AI Writing Overview"
              submissionId={submissionId}
            />

            <div className="flex-1 flex flex-col px-10 py-10">
              <div className="grid grid-cols-[1fr_1.15fr] gap-6 items-stretch">
                <div className="flex flex-col justify-center">
                  <h1
                    className="text-[28px] leading-[1.1] font-bold mb-2 whitespace-nowrap"
                    style={{ color: "#0b1220" }}
                  >
                    {overallAiScore}% detected as AI
                  </h1>
                  <p className="text-[12px] text-gray-600 leading-relaxed">
                    The percentage indicates the combined amount of likely AI-generated text as
                    well as likely AI-generated text that was also likely AI-paraphrased.
                  </p>
                </div>

                <div
                  className="rounded-2xl p-5 flex flex-col justify-center"
                  style={{ backgroundColor: "#e8f4fd" }}
                >
                  <div className="text-[12px] font-bold mb-2" style={{ color: "#0b1220" }}>
                    {caution.title}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#0b1220" }}>
                    {caution.body}
                  </p>
                </div>
              </div>

              <hr className="border-gray-200 my-10" />

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <img
                    src={aiIcon}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-9 h-9 shrink-0"
                    style={{ objectFit: "contain" }}
                  />
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
                  <img
                    src={paraIcon}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-9 h-9 shrink-0"
                    style={{ objectFit: "contain" }}
                  />
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
