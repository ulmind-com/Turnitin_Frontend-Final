import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FileSearch,
  Sparkles,
  BarChart3,
  Check,
  ArrowRight,
  Zap,
  Users,
  BookOpen,
  Award,
  Twitter,
  Github,
  Linkedin,
  Mail,
  Quote,
  Star,
  Globe,
  Lock,
  Upload,
  ScanLine,
  FileCheck2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
  description: string | null;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Turnitin — Academic Integrity, Reimagined for 2026" },
      {
        name: "description",
        content:
          "Empower students to do their best, original work. AI writing detection and web-scale plagiarism analysis in one premium Feedback Studio.",
      },
      { property: "og:title", content: "Turnitin — Academic Integrity, Reimagined" },
      {
        property: "og:description",
        content: "AI + plagiarism detection with a Feedback Studio built for 2026 classrooms.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api.get<{ plans: Plan[] }>("/plans")).data.plans,
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Header />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Features />
      <StudioShowcase />
      <Testimonials />
      <Pricing plans={data ?? []} />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HEADER                                                              */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center h-16 px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand text-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-brand/30 blur-md rounded-full" />
            <ShieldCheck className="relative h-6 w-6" />
          </div>
          Turnitin
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-1">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
            ["Reviews", "#reviews"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm text-muted-foreground hover:text-brand px-3 py-2 rounded-md hover:bg-brand/5 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg shadow-brand/25"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered backdrop */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-brand/[0.07] via-background to-background" />
      <GridPattern />
      <div className="absolute -top-48 -left-40 h-[500px] w-[500px] rounded-full bg-brand/20 blur-[120px] -z-10" />
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[color:var(--ai)]/25 blur-[120px] -z-10" />
      <div className="absolute top-1/2 left-1/2 h-[300px] w-[600px] rounded-full bg-plag/10 blur-[100px] -z-10 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-gradient-to-r from-brand/10 to-[color:var(--ai)]/10 px-4 py-1.5 text-xs font-semibold text-brand mb-7 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            AI Detection · GA for 2026 · Now with GPT-5 coverage
          </motion.span>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-brand leading-[1.02]">
            Empower{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-br from-brand via-[color:var(--ai)] to-plag bg-clip-text text-transparent">
                original
              </span>
              <svg
                aria-hidden
                className="absolute -bottom-3 left-0 w-full"
                height="14"
                viewBox="0 0 300 14"
                fill="none"
              >
                <path
                  d="M2 8 Q 75 2 150 8 T 298 8"
                  stroke="url(#hg)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="hg" x1="0" x2="300">
                    <stop offset="0" stopColor="var(--brand)" />
                    <stop offset="1" stopColor="var(--ai)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{" "}
            work.
            <br /> Detect what isn't.
          </h1>

          <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Upload student writing and get a Turnitin-style{" "}
            <b className="text-foreground">Originality Report</b> in seconds — plagiarism
            sources, AI-writing heuristics, and inline feedback in one premium studio.
          </p>

          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <Link to="/register">
              <Button
                size="lg"
                className="h-12 px-6 text-base bg-brand text-brand-foreground hover:bg-brand/90 shadow-xl shadow-brand/30 group"
              >
                Start scanning free
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                See how it works
              </Button>
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            {[
              "No card required",
              "PDF & DOCX",
              "Report in seconds",
            ].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="rounded-full bg-emerald-100 p-0.5">
                  <Check className="h-3 w-3 text-emerald-700" strokeWidth={3} />
                </div>
                {t}
              </div>
            ))}
          </div>
        </motion.div>

        <HeroMockup />
      </div>
    </section>
  );
}

function GridPattern() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 -z-10 h-full w-full [mask-image:radial-gradient(60%_50%_at_50%_0%,#000_20%,transparent_100%)] text-brand/[0.05]"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24, rotateY: 8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="relative"
      style={{ perspective: 1200 }}
    >
      {/* Glow */}
      <div className="absolute -inset-6 bg-gradient-to-br from-brand/30 via-[color:var(--ai)]/25 to-plag/20 blur-3xl rounded-3xl -z-10" />

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -top-4 -left-4 z-20 rounded-xl bg-card border shadow-xl px-3 py-2 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <FileCheck2 className="h-4 w-4 text-emerald-700" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Report</div>
          <div className="text-xs font-bold">Ready in 23s</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -bottom-4 -right-4 z-20 rounded-xl bg-card border shadow-xl px-3 py-2 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-[color:var(--ai)]/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-ai" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">AI</div>
          <div className="text-xs font-bold">GPT-5 detected</div>
        </div>
      </motion.div>

      {/* Window frame */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-2xl shadow-brand/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gradient-to-b from-muted/60 to-muted/30">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground font-mono truncate">
            thesis-final-draft.pdf · Feedback Studio
          </div>
        </div>
        <div className="grid grid-cols-[1fr_150px]">
          <div className="p-4 space-y-1.5 text-[11px] leading-relaxed">
            <p>The rapid evolution of large language models has fundamentally</p>
            <p>
              <mark className="bg-red-100 text-red-900 px-0.5 rounded">
                reshaped how academic writing is produced and evaluated across
              </mark>{" "}
              disciplines.
            </p>
            <p>
              Researchers must now consider not only source attribution but{" "}
              <span className="underline decoration-2 decoration-[color:var(--ai)] decoration-wavy">
                the provenance of the prose itself
              </span>
              .
            </p>
            <p>
              A robust originality workflow blends web-scale similarity with linguistic
              heuristics —{" "}
              <mark className="bg-red-100 text-red-900 px-0.5 rounded">
                burstiness, type-token ratio, and phrase density
              </mark>{" "}
              — to keep pace with generative models.
            </p>
            <p>
              <span className="underline decoration-2 decoration-[color:var(--ai)] decoration-wavy">
                Institutions therefore require tooling that combines rigor with speed
              </span>{" "}
              at scale.
            </p>
            <p className="text-muted-foreground italic pt-1">
              Additional context follows in the extracted body…
            </p>
          </div>
          <div className="border-l bg-gradient-to-b from-muted/40 to-muted/10 p-3 space-y-3 text-[10px]">
            <MiniRing pct={12} color="var(--plag)" label="Plagiarism" />
            <MiniRing pct={45} color="var(--ai)" label="AI Writing" />
            <div className="pt-2 border-t space-y-1">
              <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground">
                Sources
              </div>
              {["wiki/ai-detection", "arxiv/2406.11", "jstor/89321"].map((s) => (
                <div key={s} className="truncate text-brand flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-brand" /> {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const size = 56;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--muted)" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          fill="none"
        />
      </svg>
      <div>
        <div className="text-sm font-bold tabular-nums" style={{ color }}>
          {pct}%
        </div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TRUST BAR                                                           */
/* ------------------------------------------------------------------ */

function TrustBar() {
  return (
    <section className="border-y bg-gradient-to-r from-brand/[0.03] via-transparent to-[color:var(--ai)]/[0.04]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-8">
          Trusted by 15,000+ institutions worldwide
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <TrustStat icon={Users} value="180k+" label="Papers analyzed" />
          <TrustStat icon={BookOpen} value="42k+" label="Instructors" />
          <TrustStat icon={Zap} value="< 30s" label="Avg. report time" />
          <TrustStat icon={Award} value="99.2%" label="Detection recall" />
        </div>
      </div>
    </section>
  );
}

function TrustStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col items-center"
    >
      <div className="rounded-xl bg-gradient-to-br from-brand/10 to-[color:var(--ai)]/10 p-2.5 mb-3">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <div className="text-3xl font-bold text-brand tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* HOW IT WORKS                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Upload the paper",
      desc: "Drop a PDF or DOCX. We extract, chunk, and prepare it for scanning.",
      color: "var(--brand)",
    },
    {
      icon: ScanLine,
      title: "Two-tier scan",
      desc: "Internal N-gram matching and Tavily web search run in parallel with our AI heuristics.",
      color: "var(--ai)",
    },
    {
      icon: FileCheck2,
      title: "Grade with confidence",
      desc: "Open the Feedback Studio, review highlighted matches, drop feedback, export a PDF.",
      color: "var(--plag)",
    },
  ];
  return (
    <section id="how" className="max-w-7xl mx-auto px-6 py-24">
      <SectionEyebrow>Workflow</SectionEyebrow>
      <SectionTitle>From upload to grade in one flow.</SectionTitle>
      <SectionSubtitle>
        A single screen replaces the tab-hopping between plagiarism tools, AI detectors, and
        your gradebook.
      </SectionSubtitle>

      <div className="mt-14 grid md:grid-cols-3 gap-6 relative">
        {/* Connector line */}
        <div
          aria-hidden
          className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-brand via-[color:var(--ai)] to-plag opacity-30"
        />
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-card rounded-2xl border p-6 text-center"
            >
              <div className="mx-auto relative w-16 h-16">
                <div
                  className="absolute inset-0 rounded-full blur-lg opacity-40"
                  style={{ background: s.color }}
                />
                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${s.color}, color-mix(in oklab, ${s.color} 60%, white))` }}
                >
                  <Icon className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </div>
              <h3 className="mt-2 font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURES                                                            */
/* ------------------------------------------------------------------ */

function Features() {
  return (
    <section id="features" className="bg-surface border-y">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <SectionEyebrow>The studio</SectionEyebrow>
        <SectionTitle>Built for the way instructors actually grade.</SectionTitle>
        <SectionSubtitle>
          Every report is a workspace — highlight matches, compare sources, drop feedback,
          export a PDF. Without leaving the page.
        </SectionSubtitle>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: FileSearch,
              title: "Plagiarism Detection",
              desc: "Two-tier matching — internal N-gram Jaccard against every past submission plus Tavily web search on 4-sentence chunks.",
              color: "var(--plag)",
              bullets: ["Web-scale similarity", "Cross-submission match", "Highlighted source diff"],
            },
            {
              icon: Sparkles,
              title: "AI Writing Detection",
              desc: "Burstiness, TTR, phrase-density, and sentence-length heuristics anchor an LLM verdict on every 800-word window.",
              color: "var(--ai)",
              bullets: ["4 statistical heuristics", "GPT-5 / Claude coverage", "Explains the verdict"],
            },
            {
              icon: BarChart3,
              title: "Feedback Studio",
              desc: "Split-screen review with highlighted document, source comparison, ring charts, and inline grade + feedback.",
              color: "var(--brand)",
              bullets: ["Inline highlights", "Rings & heuristics", "One-click PDF export"],
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl border bg-card p-7 transition-shadow hover:shadow-2xl hover:shadow-brand/10 overflow-hidden"
              >
                <div
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
                  style={{ background: f.color }}
                />
                <div
                  className="relative rounded-xl w-12 h-12 flex items-center justify-center mb-5 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${f.color}, color-mix(in oklab, ${f.color} 55%, white))`,
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                <ul className="mt-5 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-foreground/80">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: f.color }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* STUDIO SHOWCASE                                                     */
/* ------------------------------------------------------------------ */

function StudioShowcase() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-14 items-center">
      <div>
        <SectionEyebrow>Insight, at a glance</SectionEyebrow>
        <h2 className="text-3xl md:text-4xl font-bold text-brand mt-2 leading-tight">
          Two scores. Every source. Zero guesswork.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Every report opens with two rings — Similarity and AI Written — plus a plain-English
          summary of what triggered each score. Drill down into matched sources or per-chunk
          heuristics with a single click.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            { icon: Globe, t: "Web + internal sources", d: "Every match links back to its origin." },
            { icon: Sparkles, t: "Per-chunk AI score", d: "See which 800-word window looks synthetic." },
            { icon: Lock, t: "FERPA-friendly", d: "Student uploads stay in your workspace." },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.t} className="flex gap-4">
                <div className="rounded-lg bg-brand/10 text-brand h-10 w-10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold">{r.t}</div>
                  <div className="text-sm text-muted-foreground">{r.d}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative"
      >
        <div className="absolute -inset-8 bg-gradient-to-tr from-brand/25 via-[color:var(--ai)]/20 to-plag/20 blur-3xl -z-10 rounded-full" />
        <div className="rounded-2xl border bg-card shadow-2xl shadow-brand/10 p-8">
          <div className="flex items-center justify-around">
            <BigRing pct={12} color="var(--plag)" label="Similarity" />
            <BigRing pct={82} color="var(--ai)" label="AI Written" />
          </div>
          <div className="mt-6 pt-6 border-t space-y-3 text-sm">
            <div>
              <div className="font-semibold text-plag">Plagiarism</div>
              <div className="text-muted-foreground text-xs">
                20 matching web sources with 29.0% average similarity.
              </div>
            </div>
            <div>
              <div className="font-semibold text-ai">AI Detection</div>
              <div className="text-muted-foreground text-xs">
                Very likely AI-generated (82.0% AI score). Burstiness 0.75 · TTR 0.48.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function BigRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--muted)" fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            stroke={color}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c - (c * pct) / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground mt-2 font-semibold">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TESTIMONIALS                                                        */
/* ------------------------------------------------------------------ */

function Testimonials() {
  const items = [
    {
      quote: "The Feedback Studio changed how our department reviews term papers. Two rings and I know where to look.",
      name: "Dr. Priya Iyer",
      role: "English Dept. Head, IIT Bombay",
      color: "var(--brand)",
    },
    {
      quote: "AI heuristics that actually explain themselves. I can defend the verdict to the student in the same tab.",
      name: "Prof. Marcus Chen",
      role: "CS Faculty, NUS",
      color: "var(--ai)",
    },
    {
      quote: "Reports in under 30 seconds. My TA team saved an entire day per assignment cycle.",
      name: "Sarah Whitman",
      role: "Program Director, Oxford Online",
      color: "var(--plag)",
    },
  ];
  return (
    <section id="reviews" className="bg-surface border-y">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <SectionEyebrow>Loved by educators</SectionEyebrow>
        <SectionTitle>Instructors ship better feedback, faster.</SectionTitle>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border bg-card p-7 shadow-sm hover:shadow-xl hover:shadow-brand/5 transition-shadow"
            >
              <Quote
                className="absolute top-5 right-5 h-8 w-8 opacity-10"
                style={{ color: t.color }}
              />
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
              <div className="mt-5 pt-5 border-t flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: `linear-gradient(135deg, ${t.color}, color-mix(in oklab, ${t.color} 50%, white))` }}
                >
                  {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PRICING                                                             */
/* ------------------------------------------------------------------ */

function Pricing({ plans }: { plans: Plan[] }) {
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
      <SectionEyebrow>Pricing</SectionEyebrow>
      <SectionTitle>Pay only for what you scan.</SectionTitle>
      <SectionSubtitle>
        One-time credit packs. No subscriptions. Credits stack when you top up.
      </SectionSubtitle>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {plans.map((p, i) => {
          const featured = i === 1;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl border bg-card p-8 ${
                featured
                  ? "ring-2 ring-brand shadow-2xl shadow-brand/20 md:-translate-y-3 bg-gradient-to-b from-brand/[0.04] to-card"
                  : "hover:shadow-xl transition-shadow"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-[color:var(--ai)] text-white px-4 py-1 text-xs font-semibold shadow-lg">
                  ★ Most popular
                </span>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-brand tabular-nums">₹{p.price}</span>
                <span className="text-sm text-muted-foreground">one-time</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.description ?? `${p.credits} scan credits`}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  `${p.credits} scan credits`,
                  "AI + plagiarism detection",
                  "Downloadable PDF report",
                  "Inline grading & feedback",
                ].map((li) => (
                  <li key={li} className="flex gap-2">
                    <div className="rounded-full bg-brand/10 p-0.5 mt-0.5 shrink-0">
                      <Check className="h-3 w-3 text-brand" strokeWidth={3} />
                    </div>
                    {li}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block mt-8">
                <Button
                  className={`w-full h-11 ${
                    featured
                      ? "bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg shadow-brand/25"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  Choose {p.name}
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FINAL CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-brand/30">
        {/* Animated backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand via-[color:var(--ai)] to-plag" />
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-dots)" />
          </svg>
        </div>
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative p-12 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Ready to defend academic integrity?
          </h2>
          <p className="mt-4 text-white/85 max-w-2xl mx-auto text-lg">
            Create an account and get your first Originality Report in under a minute.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="h-12 px-7 bg-white text-brand hover:bg-white/90 shadow-xl">
                Get started free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-7 border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white backdrop-blur"
              >
                View pricing
              </Button>
            </a>
          </div>
          <div className="mt-6 text-xs text-white/70 flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> No card required</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Free scans included</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  const cols = [
    {
      title: "Product",
      links: [
        ["Features", "#features"],
        ["How it works", "#how"],
        ["Pricing", "#pricing"],
        ["Reviews", "#reviews"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "#"],
        ["Blog", "#"],
        ["Careers", "#"],
        ["Contact", "#"],
      ],
    },
    {
      title: "Legal",
      links: [
        ["Privacy", "#"],
        ["Terms", "#"],
        ["Cookies", "#"],
        ["Security", "#"],
      ],
    },
  ];
  return (
    <footer className="bg-gradient-to-b from-background to-surface border-t">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
        <div>
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand text-lg">
            <ShieldCheck className="h-6 w-6" /> Turnitin
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
            Academic integrity, reimagined for the AI era. Built for educators who care about
            original work and fair grading.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/40 hover:bg-brand/5 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-semibold text-foreground mb-4">{c.title}</div>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-muted-foreground hover:text-brand transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© 2026 Turnitin Clone. Academic integrity, reimagined.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SOC 2 · FERPA</span>
            <span>Made with care for educators</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED                                                              */
/* ------------------------------------------------------------------ */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <span className="inline-block text-xs uppercase tracking-[0.2em] text-brand font-semibold bg-brand/10 rounded-full px-3 py-1">
        {children}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl md:text-5xl font-bold text-brand mt-4 text-center max-w-3xl mx-auto leading-tight">
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mt-4 text-center max-w-2xl mx-auto text-lg leading-relaxed">
      {children}
    </p>
  );
}
