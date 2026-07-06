I’ll fix the PDF download error at the source and make the export reliable.

Plan:
1. **Replace the broken color handling**
   - The current `onclone` skips values containing `oklch`, so the unsupported colors remain and `html2canvas` crashes.
   - I’ll add a safe color normalization step for the cloned report so every text/background/border/svg color used by the PDF renderer becomes browser-safe `rgb(...)`/hex.

2. **Make the report DOM export-safe**
   - Keep the current visual design, but ensure the PDF area does not depend on Tailwind v4 `oklch` color utilities during capture.
   - Add PDF-only clone overrides for shadows, borders, backgrounds, SVG strokes/fills, and page breaks so rows/pages don’t get cut awkwardly.

3. **Keep the merge flow intact**
   - Generate the 2-page summary PDF first.
   - Fetch the highlighted original PDF.
   - Merge both using `pdf-lib`.
   - If the highlighted PDF is unavailable, still download the summary PDF instead of failing everything.

4. **Improve error feedback**
   - Show a clearer toast if summary generation fails vs highlighted-PDF fetch fails.
   - Keep console logging useful for debugging without blocking the user download unnecessarily.

5. **Verify the actual button flow**
   - Open the report modal, click **Download PDF**, confirm no `unsupported color function "oklch"` error appears, and confirm a PDF download is triggered.