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
      { title: "Turnitin Clone — Academic Integrity for 2026" },
      {
        name: "description",
        content:
          "Detect AI-generated writing and plagiarism with confidence. The Feedback Studio built for modern classrooms.",
      },
      { property: "og:title", content: "Turnitin Clone — Academic Integrity for 2026" },
      {
        property: "og:description",
        content: "AI + plagiarism detection with a premium Feedback Studio.",
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center h-16 px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand">
            <ShieldCheck className="h-5 w-5" /> Turnitin
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <a href="#features" className="hidden sm:inline text-sm text-muted-foreground hover:text-brand px-3">
              Features
            </a>
            <a href="#pricing" className="hidden sm:inline text-sm text-muted-foreground hover:text-brand px-3">
              Pricing
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-md shadow-brand/20">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/5 via-background to-background" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand/15 blur-3xl -z-10" />
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-[color:var(--ai)]/15 blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand mb-6">
              <Sparkles className="h-3 w-3" /> AI Detection · Now GA for 2026
            </span>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-brand leading-[1.05]">
              Ensure academic{" "}
              <span className="bg-gradient-to-br from-brand to-[color:var(--ai)] bg-clip-text text-transparent">
                integrity
              </span>
              <br /> with confidence.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Upload student work and get a Turnitin-style Originality Report in seconds —
              plagiarism sources, AI-writing heuristics, and inline instructor feedback in one
              premium studio.
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg shadow-brand/20"
                >
                  Start scanning free <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline">
                  View pricing
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> No card required
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> PDF & DOCX
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Report in seconds
              </div>
            </div>
          </motion.div>

          {/* Report Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-brand/20 to-[color:var(--ai)]/15 blur-2xl rounded-3xl -z-10" />
            <div className="rounded-2xl border border-border/70 bg-card shadow-2xl shadow-brand/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-3 text-xs text-muted-foreground font-mono truncate">
                  thesis-final-draft.pdf
                </div>
              </div>
              <div className="grid grid-cols-[1fr_140px]">
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
                    heuristics —
                    <mark className="bg-red-100 text-red-900 px-0.5 rounded">
                      burstiness, type-token ratio, and phrase density
                    </mark>{" "}
                    — to keep pace with generative models.
                  </p>
                  <p className="text-muted-foreground italic pt-1">
                    Additional context follows in the extracted body…
                  </p>
                </div>
                <div className="border-l bg-muted/30 p-3 space-y-3 text-[10px]">
                  <MiniRing pct={12} color="var(--plag)" label="Plagiarism" />
                  <MiniRing pct={45} color="var(--ai)" label="AI Writing" />
                  <div className="pt-1 border-t space-y-1">
                    <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground">
                      Sources
                    </div>
                    <div className="truncate text-brand">wiki/ai-detection</div>
                    <div className="truncate text-brand">arxiv/2406.11</div>
                    <div className="truncate text-brand">jstor/89321</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust bar */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <TrustStat icon={Users} value="180k+" label="Papers analyzed" />
            <TrustStat icon={BookOpen} value="42k+" label="Instructors" />
            <TrustStat icon={Zap} value="< 30s" label="Avg. report time" />
            <TrustStat icon={Award} value="99.2%" label="Detection recall" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">
            The studio
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-brand mt-2">
            Built for the way instructors actually grade.
          </h2>
          <p className="text-muted-foreground mt-3">
            Every report is a workspace — highlight matches, compare sources, and drop feedback
            without leaving the page.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: FileSearch,
              title: "Plagiarism Detection",
              desc: "Two-tier matching — internal N-gram Jaccard against every past submission, plus Tavily web search on 4-sentence chunks.",
              color: "var(--plag)",
            },
            {
              icon: Sparkles,
              title: "AI Writing Detection",
              desc: "Burstiness, TTR, phrase-density, and sentence-length heuristics anchor an LLM verdict on every 800-word window.",
              color: "var(--ai)",
            },
            {
              icon: BarChart3,
              title: "Feedback Studio",
              desc: "Split-screen review with highlighted document, source comparison, ring charts, and inline grade + feedback.",
              color: "var(--brand)",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border bg-card p-6 transition-shadow hover:shadow-xl hover:shadow-brand/5"
              >
                <div
                  className="rounded-xl w-11 h-11 flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${f.color} 12%, transparent)`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-surface border-t">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-brand font-semibold">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-brand mt-2">
              Pay only for what you scan.
            </h2>
            <p className="text-muted-foreground mt-3">
              One-time credit packs. No subscriptions. Credits stack when you top up.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(data ?? []).map((p, i) => {
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
                      ? "ring-2 ring-brand shadow-xl shadow-brand/15 md:-translate-y-2"
                      : ""
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand text-brand-foreground px-3 py-0.5 text-xs font-semibold shadow-md">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-brand">₹{p.price}</span>
                    <span className="text-sm text-muted-foreground">one-time</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.description ?? `${p.credits} scan credits`}
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      {p.credits} scan credits
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      AI + plagiarism detection
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      Downloadable PDF report
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      Inline grading & feedback
                    </li>
                  </ul>
                  <Link to="/register" className="block mt-8">
                    <Button
                      className={`w-full ${
                        featured
                          ? "bg-brand text-brand-foreground hover:bg-brand/90 shadow-md shadow-brand/20"
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
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="rounded-3xl border bg-gradient-to-br from-brand to-[color:var(--ai)] p-10 md:p-14 text-brand-foreground shadow-2xl shadow-brand/25">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to defend academic integrity?
          </h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">
            Create an account and get your first Originality Report in under a minute.
          </p>
          <Link to="/register" className="inline-block mt-6">
            <Button size="lg" className="bg-white text-brand hover:bg-white/90 shadow-lg">
              Get started free <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Turnitin Clone. Academic integrity, reimagined.
      </footer>
    </div>
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
    <div className="flex flex-col items-center">
      <Icon className="h-5 w-5 text-brand mb-2" />
      <div className="text-2xl font-bold text-brand tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
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
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
