
## Goal

Build a pixel-perfect Turnitin-style "AI Writing Detection Report" view inside the existing report route, with a floating "Download as PDF" button that exports the exact UI to a multi-page A4 PDF (headers/footers on every page, no rows cut mid-way).

## Where it lives

- New component: `src/components/TurnitinAIReport.tsx` — self-contained, receives the report data as props, renders Page 1 (Cover) + Page 2 (AI Overview) as two A4-sized sections.
- Wire it into `src/routes/_authenticated.report.$documentId.tsx` as a new tab/button ("Turnitin-style report") next to the existing Download PDF dropdown, so the current Feedback Studio UI is untouched.
- Reuse fields already returned by `/documents/{id}/report` (`document_id`, `file_name`, `overall_ai_score`, `ai_heuristics`, `extracted_text` for word/char counts) plus `doc.created_at` from `useDocumentPolling` for the submission date. No backend changes.

## Layout (matches uploaded screenshots)

### Shared chrome (on every printed page)
- Header: left `turnitin` wordmark (bold, `#0d5c8f`) with the small arrow-glyph SVG, center "AI Writing Overview", right "Submission ID  trn:oid:::…" — light gray bottom border.
- Footer: same wordmark at 50% opacity, center label, right submission id — light gray top border.
- Implemented as fixed header/footer bands inside each A4 page `<section>` so both screen preview and printed PDF show them.

### Page 1 — Cover
- Big centered dashed rule.
- Huge bold title = `file_name` (без расширения), subtitle "AI Writing Detection Report".
- "Document Details" heading + hr.
- Two columns:
  - Left: uppercase gray labels + dark values for Submission ID, Submission Date (formatted `MMM D, YYYY, h:mm A`), File Name, File Type.
  - Right: gray-bordered stats box with `page_count` Pages / `word_count` Words / `character_count` Characters (derive counts from `extracted_text` when metadata missing: words = split on whitespace, chars = length, pages ≈ ceil(words/300)).

### Page 2 — AI Writing Overview
- Left: `{overall_ai_score}% detected as AI` huge bold, muted description below.
- Right: light-blue caution panel (`bg-[#e8f4fd] border-[#d0e4f0]`, rounded) — title varies by score: `<20` "Low risk", `20–60` "Caution: Review required.", `>60` "High risk: Review strongly recommended." Body copy adjusts accordingly.
- Divider.
- Breakdown rows (Lucide icons `Sparkles`, `RefreshCw` in colored circles):
  - "AI-generated only" — % + one-line description.
  - "AI-generated text that was AI-paraphrased" — % + one-line description.
- Disclaimer paragraph in tiny muted text.

### Split calculation
```
total = overall_ai_score
paraphrasedShare = burstiness < 0.4 && type_token_ratio > 0.55 ? 0.35 : burstiness < 0.5 ? 0.15 : 0
paraphrased = round(total * paraphrasedShare)
aiOnly = total - paraphrased
```
Both shown as % of document.

## PDF export

- Add `html2pdf.js` via `bun add html2pdf.js`.
- Floating bottom-right button "Download as PDF" on the Turnitin report view.
- On click: `html2pdf().set({ margin:0, filename:'{file_name}-ai-report.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}, pagebreak:{ mode:['css','legacy'], before:'.pdf-page-break' } }).from(ref.current).save()`.
- Each A4 `<section>` is `w-[210mm] h-[297mm]` with `page-break-after: always` and `.pdf-page-break` before Page 2, so html2pdf never splits a row mid-way.
- Loader overlay while generating.

### Typography / colors
- Font: existing app font (Inter-ish) is fine; headings use `font-semibold`/`font-bold` at 32–48px to match screenshots.
- Palette: turnitin blue `#0d5c8f`, caution bg `#e8f4fd` border `#d0e4f0`, muted gray text `text-gray-500`, dividers `border-gray-200`. Hardcoded here (not tokens) because it's a fixed brand-clone visual — noted in the file.

## Integration point

In `_authenticated.report.$documentId.tsx`:
- Add a new dropdown item / secondary button "Turnitin-style AI report" that opens the new component in a modal-style full-screen overlay (`fixed inset-0 z-50 overflow-auto bg-white`).
- Overlay contains: close button (top-left), the `TurnitinAIReport` A4 pages centered with page shadow, and the floating Download button.

## Files

- **Create** `src/components/TurnitinAIReport.tsx`
- **Edit** `src/routes/_authenticated.report.$documentId.tsx` — add trigger + overlay state
- **Package** `bun add html2pdf.js` and `bun add -d @types/html2pdf.js` (fallback to `// @ts-expect-error` if types package unavailable)

## Out of scope

- No backend changes. Page count/word/char are derived client-side when the report payload lacks them.
- Does not replace the existing Feedback Studio download dropdown — this is an additional Turnitin-style export.
