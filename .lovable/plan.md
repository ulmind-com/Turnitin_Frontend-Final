
# Turnitin Clone — Frontend Plan (Stage 1)

Stack: TanStack Start (already scaffolded), Tailwind v4, shadcn/ui, Zustand, Axios, Lucide, Framer Motion, sonner toasts. Backend: `https://turnitin-project-backend.onrender.com` via `VITE_API_BASE_URL`.

Stage 1 delivers the hardest half: auth + token refresh + user dashboard + upload flow + polling + the split-screen Feedback Studio. Billing pages, admin console, and document history are Stage 2/3.

## 1. Foundation

**Env & config**
- Add `.env` with `VITE_API_BASE_URL=https://turnitin-project-backend.onrender.com/api`.
- `src/lib/config.ts` reads `import.meta.env.VITE_API_BASE_URL`.

**Deps to install**
- `axios zustand framer-motion`
- (Lucide, Tailwind, shadcn, sonner already present.)

**Design system (src/styles.css)**
- Turnitin palette: deep corporate blue `#0A3161`, action blue `#1E88E5`, off-white `#F5F7FA`, red plagiarism `#E53935`, blue AI `#1E88E5` (distinct shade), amber warning. Add as oklch tokens: `--brand`, `--brand-foreground`, `--plag`, `--ai`, `--surface`.
- Typography: Inter for body via `@fontsource/inter`; keep clean/academic.
- Motion primitives: subtle 200ms ease-out transitions, ring-chart draws with framer-motion.

## 2. Auth layer

**Token store — `src/lib/auth-store.ts` (Zustand + localStorage persistence)**
- State: `accessToken`, `refreshToken`, `user`, `hydrated`.
- Actions: `setTokens`, `setUser`, `logout`.

**Axios client — `src/lib/api.ts`**
- Instance with `baseURL` and JSON default.
- Request interceptor injects `Authorization: Bearer <accessToken>`.
- Response interceptor: on 401 (not on `/auth/refresh` itself), queue concurrent 401s, call `POST /auth/refresh`, replace tokens, retry originals. On refresh failure: `logout()` + redirect `/login`.
- Global error toast helper for 402/409/413/422/500.

**Auth guard**
- Pathless layout `src/routes/_authenticated.tsx` — `beforeLoad` checks store; if no token → `redirect({ to: '/login', search: { redirect: location.href } })`. Renders `<Outlet />`.
- `src/routes/_admin.tsx` (used later) — same check + `role === 'admin'`.
- `useCurrentUser()` — TanStack Query keyed on `["me"]`, `queryFn: () => api.get('/auth/me')`; hydrated in root once token exists.

## 3. Routing (files created in Stage 1)

Under `src/routes/`:
- `index.tsx` — landing page (marketing hero + features + plans from `GET /api/plans`).
- `login.tsx`, `register.tsx`, `admin.login.tsx`.
- `_authenticated.tsx` — auth gate layout.
- `_authenticated.dashboard.tsx` — user dashboard.
- `_authenticated.upload.tsx` — upload + auto-trigger scans + poll.
- `_authenticated.report.$documentId.tsx` — Feedback Studio.

Header/footer live in a shared `AppShell` component used inside `_authenticated` layout. Footer shows "© 2026".

## 4. Landing + Auth pages

- Landing: Turnitin-style hero ("Ensure academic integrity with confidence"), 3-up feature cards (AI Detection / Plagiarism / Feedback Studio), pricing section fetching `/api/plans` via `useSuspenseQuery`, CTA to `/register`. All copy uses 2026.
- `/login` — email/password, calls `POST /api/auth/login`, stores tokens, redirects to `search.redirect` or `/dashboard`. Link to `/register` and small link to `/admin/login`.
- `/register` — name/email/password, `POST /api/auth/register`, same post-login handling.
- `/admin/login` — separate page, calls `POST /api/auth/admin/login`, redirects `/admin/dashboard` (page built in Stage 3).

Form validation with `react-hook-form` + `zod`.

## 5. Dashboard `/dashboard`

- Fetches `GET /api/user/dashboard`.
- Cards: Credits (with "Buy more" → `/billing`), Total Scans, Completed Scans, Active Plan.
- Pending-payment banner if `pending_payment: true`.
- "Recent Documents" table (last 5): filename, status badge, plagiarism %, AI %, created_at (2026 formatted), "Open Report" link → `/report/{id}` (disabled unless completed).
- Empty state component "No documents scanned yet" with upload CTA.
- Reusable `<StatusBadge status="queued|processing|completed|failed" />` and `<AccountBadge />`.

## 6. Upload `/upload` + polling

**Component**
- Dropzone (drag+drop, click to select), accepts `.pdf,.docx`, client-side 10MB check.
- Submit: `POST /api/documents/upload` multipart. Handle:
  - `402` → open `<UpgradeCreditsDialog />` (Framer Motion modal) linking to `/billing`.
  - `413` → toast "File too large (10MB max)".
  - `422` → toast "Could not extract text".
- On success → immediately fire (parallel) `POST /documents/{id}/analyze/ai` and `.../analyze/plagiarism`, then navigate to `/report/{id}` with a `?polling=1` flag.

**Custom hook — `src/hooks/use-document-polling.ts`**
- `useDocumentPolling(documentId)` uses TanStack Query with `refetchInterval: 5000`, stops when both `ai_scan_status` and `plagiarism_scan_status` ∈ {`completed`,`failed`}.
- Returns `{ document, isPolling, aiDone, plagDone }`.

## 7. Feedback Studio `/report/:documentId` (core)

**Data**
- `useDocumentPolling(documentId)` for live status.
- Once both statuses are terminal → `useQuery(["report", id], GET /documents/{id}/report)`.
- If one scan `failed`, show partial UI + error banner (spec: `/report` returns 400 if neither completed → show skeleton + retry).

**Layout — split screen, responsive**
- Header bar: filename, "Back", statuses, "Download PDF" button → `GET /documents/{id}/download-report` (responseType blob → save as `<name>-report.pdf`).
- Desktop: `grid-cols-[minmax(0,1fr)_420px]`. Mobile: stacks, sidebar becomes tabbed drawer.

**Left pane — Document Viewer**
- Renders `extracted_text` broken into chunks (from `chunks[]`).
- Each chunk wrapped with highlight: red bg for `plagiarism_score > threshold`, blue underline/bg for `ai_score > threshold`. Intensity scales with score.
- Hover on a plagiarism chunk → tooltip with matched source URL + %; clicking scrolls the right pane Plagiarism tab to that source and highlights it.
- Component: `<HighlightedDocument chunks={} text={} onChunkClick={} />`.

**Right pane — Sidebar (Tabs: Overview / Plagiarism / AI / Grade)**
- Overview: two ring charts side by side — `<ScoreRing value={overall_plagiarism_score} color="plag" label="Similarity" />` and `<ScoreRing value={overall_ai_score} color="ai" label="AI" />`. Draw animation via framer-motion `pathLength`.
- Plagiarism tab: list `matched_sources` — each card: favicon+title, URL, similarity %, expandable "Compare" panel showing `matched_text` vs `original_text` side-by-side. Clicking scrolls left pane to `chunk_index`.
- AI tab: `ai_summary` paragraph + heuristic meters (Burstiness, TTR, Avg sentence length, AI phrase density) rendered as horizontal bars with reference ranges. Integrity flags shown as amber alerts.
- Grade tab: displays current `grade`/`feedback` if set; form (number input 0–100, textarea) → `POST /documents/{id}/grade` on submit → toast + invalidate.

**Loading states**
- Premium skeleton: shimmering left column + skeleton rings + progress pill "Scanning… AI ✓ | Plagiarism ⏳". Uses framer-motion opacity pulses, not spinners.

## 8. Shared components

- `AppShell` (sidebar nav on desktop, hamburger sheet on mobile: Dashboard / Upload / Documents / Billing / user menu + logout).
- `StatusBadge`, `AccountBadge`, `ScoreRing`, `EmptyState`, `DataTable` (simple, sortable, paginated), `ConfirmDialog`.
- Global `<Toaster />` (sonner) mounted in `__root.tsx`.
- Update `__root.tsx` head: title "Turnitin Clone — Academic Integrity", proper description, `<Toaster />` inside `QueryClientProvider`. Wrap children with an `<AuthHydrator />` that reads persisted tokens before first render.

## 9. Out of scope for Stage 1 (Stages 2 & 3)

- **Stage 2**: `/documents` history table, `/billing` (plans + submit payment + payment history), pending-payment banner wired to real state.
- **Stage 3**: Admin console — `/admin/dashboard`, `/admin/payments` (approve/reject modal with screenshot viewer), `/admin/users`, `/admin/documents`.

## Technical notes

- All API calls go through `src/lib/api.ts`; no direct `fetch`.
- TanStack Query for reads; `useMutation` for writes; invalidate `["me"]`, `["dashboard"]`, `["document", id]` as needed.
- Route loaders only prime `queryClient.ensureQueryData` for public data (e.g. plans on landing). Authenticated data is fetched in components via `useQuery` so SSR doesn't 401 (see auth-protected-server-functions guidance).
- Zustand store uses `persist` middleware with a custom storage guard for SSR (`typeof window` check).
- Feedback Studio highlights are computed client-side from `chunks[]` by mapping chunk text back into the full `extracted_text` (fallback to sequential rendering of chunks if a match isn't unique).

## Deliverable at end of Stage 1

A user can: land → register → login → see dashboard → upload a PDF → watch it scan (polling) → view the fully highlighted Feedback Studio with rings, matched sources, AI heuristics, grade form, and PDF download. Auth refresh, 402 upgrade modal, and status badges all wired.

Reply "go" to build Stage 1, or edit scope first.
