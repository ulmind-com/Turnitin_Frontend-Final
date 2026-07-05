import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  size?: number;
  label?: string;
  variant?: "brand" | "white";
  className?: string;
}

/**
 * Premium orbiting-dots loader. Two rings of dots orbit around a pulsing core,
 * echoing the "scanning" motion of the app.
 */
export function Loader({ size = 56, label, variant = "brand", className = "" }: Props) {
  const color = variant === "white" ? "#ffffff" : "var(--brand)";
  const accent = variant === "white" ? "rgba(255,255,255,0.6)" : "var(--ai)";

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer orbit */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="absolute rounded-full"
              style={{
                width: size * 0.14,
                height: size * 0.14,
                background: color,
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateY(-${size / 2}px) translate(-50%, -50%)`,
                transformOrigin: "0 0",
                opacity: 0.9,
              }}
            />
          ))}
        </motion.div>
        {/* Inner orbit (reverse) */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          style={{ padding: size * 0.18 }}
        >
          {[45, 225].map((deg) => (
            <span
              key={deg}
              className="absolute rounded-full"
              style={{
                width: size * 0.1,
                height: size * 0.1,
                background: accent,
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateY(-${size * 0.32}px) translate(-50%, -50%)`,
                transformOrigin: "0 0",
              }}
            />
          ))}
        </motion.div>
        {/* Core */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: `radial-gradient(circle at 30% 30%, ${color}, ${accent})`,
            top: "50%",
            left: "50%",
            translate: "-50% -50%",
            boxShadow: `0 0 ${size * 0.4}px ${color}`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      {label && (
        <motion.span
          className="text-sm font-medium"
          style={{ color: variant === "white" ? "#fff" : "var(--muted-foreground)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

/** Full-screen overlay loader for blocking async work (e.g. PDF download). */
export function LoaderOverlay({ label = "Working…" }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="rounded-2xl bg-card border shadow-2xl px-10 py-8">
        <Loader size={72} label={label} />
      </div>
    </motion.div>
  );
}

/** Inline three-dot loader for buttons. */
export function DotLoader({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* PROGRESS LOADER — animated %, stages, ring                         */
/* ------------------------------------------------------------------ */

interface ProgressLoaderProps {
  /** When true, the loader eases toward 100% and shows a "Done" state. */
  done?: boolean;
  /** Ordered stages the loader cycles through. */
  stages?: string[];
  /** Approx seconds to reach 95% before `done` flips true. */
  duration?: number;
  title?: string;
  subtitle?: string;
}

const DEFAULT_STAGES = [
  "Extracting text from document",
  "Chunking into 4-sentence windows",
  "Running AI writing heuristics",
  "Scanning web sources with Tavily",
  "Cross-checking internal submissions",
  "Compiling originality report",
];

/**
 * Premium progress loader with an animated ring, a rising percentage,
 * a stage list that ticks through the pipeline, and a shimmering track.
 * `done=true` snaps to 100% and shows a success state.
 */
export function ProgressLoader({
  done = false,
  stages = DEFAULT_STAGES,
  duration = 45,
  title = "Scanning your document",
  subtitle = "This usually takes under a minute.",
}: ProgressLoaderProps) {
  const [pct, setPct] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  // Ease toward 95% over `duration`, then snap to 100% when done.
  useEffect(() => {
    if (done) {
      setPct(100);
      setStageIdx(stages.length - 1);
      return;
    }
    const start = Date.now();
    const target = 95;
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / (duration * 1000));
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      setPct(Math.min(target, eased * target));
    }, 120);
    return () => window.clearInterval(id);
  }, [done, duration, stages.length]);

  // Cycle the "currently running" stage label.
  useEffect(() => {
    if (done) return;
    const per = (duration * 1000) / stages.length;
    const id = window.setInterval(() => {
      setStageIdx((i) => Math.min(stages.length - 1, i + 1));
    }, per);
    return () => window.clearInterval(id);
  }, [done, duration, stages.length]);

  const size = 180;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shownPct = Math.round(pct);

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border bg-card p-8 md:p-10 shadow-xl shadow-brand/5">
      <div className="flex flex-col items-center text-center">
        {/* Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Halo */}
          <motion.div
            className="absolute inset-2 rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <svg width={size} height={size} className="-rotate-90 relative">
            <defs>
              <linearGradient id="pl-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--brand)" />
                <stop offset="0.5" stopColor="var(--ai)" />
                <stop offset="1" stopColor="var(--plag)" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              stroke="var(--muted)"
              fill="none"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              stroke="url(#pl-grad)"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              animate={{ strokeDashoffset: c - (c * pct) / 100 }}
              transition={{ type: "spring", stiffness: 40, damping: 20 }}
            />
          </svg>
          {/* Rotating tick */}
          {!done && (
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <span
                className="absolute h-3 w-3 rounded-full bg-brand shadow-lg shadow-brand/50"
                style={{
                  top: stroke / 2 - 2,
                  left: size / 2 - 6,
                }}
              />
            </motion.div>
          )}
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={shownPct}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-brand tabular-nums"
            >
              {shownPct}
              <span className="text-2xl align-top">%</span>
            </motion.span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mt-1">
              {done ? "Complete" : "Analyzing"}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="mt-6 text-xl font-bold text-brand">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

        {/* Shimmering track */}
        <div className="mt-6 w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--brand), var(--ai), var(--plag))",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            initial={false}
          />
        </div>

        {/* Stage list */}
        <ul className="mt-6 w-full space-y-2 text-left">
          {stages.map((s, i) => {
            const state: "done" | "active" | "pending" =
              done || i < stageIdx ? "done" : i === stageIdx ? "active" : "pending";
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    state === "done"
                      ? "bg-emerald-500 text-white"
                      : state === "active"
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                      <path
                        d="M2 6l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : state === "active" ? (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-white"
                      animate={{ scale: [0.7, 1.2, 0.7] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-sm ${
                    state === "active"
                      ? "text-foreground font-medium"
                      : state === "done"
                      ? "text-muted-foreground line-through"
                      : "text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
                {state === "active" && <DotLoader className="text-brand ml-1" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE LOADER — centered orbit + label, for route data loading       */
/* ------------------------------------------------------------------ */

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8"
      >
        <Loader size={72} />
        <motion.p
          className="text-sm text-muted-foreground font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {label}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* ADMIN LOADER — radar sweep + shield, premium admin panel look      */
/* ------------------------------------------------------------------ */

interface AdminLoaderProps {
  label?: string;
  sublabel?: string;
  stages?: string[];
  className?: string;
}

export function AdminLoader({
  label = "Loading admin data",
  sublabel = "Fetching the latest records from the platform.",
  stages = [
    "Authenticating admin session",
    "Querying platform database",
    "Aggregating records",
    "Rendering results",
  ],
  className = "",
}: AdminLoaderProps) {
  const [stageIdx, setStageIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setStageIdx((i) => (i + 1) % stages.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [stages.length]);

  const size = 160;

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-6 py-12 px-6 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 160 160" className="absolute inset-0">
          <defs>
            <radialGradient id="admin-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="admin-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="76" fill="url(#admin-halo)" />
          {[24, 44, 64].map((r) => (
            <circle key={r} cx="80" cy="80" r={r} fill="none" stroke="#f59e0b" strokeOpacity="0.18" strokeWidth="1" />
          ))}
          <line x1="80" y1="4" x2="80" y2="156" stroke="#f59e0b" strokeOpacity="0.12" />
          <line x1="4" y1="80" x2="156" y2="80" stroke="#f59e0b" strokeOpacity="0.12" />
        </svg>

        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "50% 50%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        >
          <svg width={size} height={size} viewBox="0 0 160 160">
            <path d="M80 80 L80 8 A72 72 0 0 1 148 62 Z" fill="url(#admin-sweep)" />
          </svg>
        </motion.div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              boxShadow: "0 8px 30px rgba(245, 158, 11, 0.45)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]"
            style={{ top: 6, left: size / 2 - 4 }}
          />
        </motion.div>
      </div>

      <div className="text-center max-w-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Admin Console
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-900">{label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card/60 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.span
            key={stageIdx}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"
          />
          <motion.span
            key={`t-${stageIdx}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-slate-700 flex-1"
          >
            {stages[stageIdx]}
          </motion.span>
          <DotLoader className="text-amber-600" />
        </div>
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}


