import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldCheck, FileSearch, Sparkles, BarChart3, Check } from "lucide-react";
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
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center h-16 px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand">
            <ShieldCheck className="h-5 w-5" /> Turnitin
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-brand mb-6">
            <Sparkles className="h-3 w-3" /> Now with AI Detection · 2026
          </span>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-brand">
            Ensure academic integrity <br /> with confidence.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload student work and get a Turnitin-style Originality Report in seconds —
            complete with plagiarism sources, AI-writing detection, and instructor feedback.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Start scanning free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: FileSearch, title: "Plagiarism Detection", desc: "Web-scale similarity matching against billions of pages." },
          { icon: Sparkles, title: "AI Writing Detection", desc: "Burstiness, TTR, and phrase-density heuristics catch AI writing." },
          { icon: BarChart3, title: "Feedback Studio", desc: "Split-screen review with source comparison and grading." },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <div className="rounded-lg bg-accent w-10 h-10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          );
        })}
      </section>

      <section id="pricing" className="bg-surface border-t">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-brand">Simple, transparent pricing</h2>
            <p className="text-muted-foreground mt-2">Pay only for the scans you need.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(data ?? []).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl border bg-card p-8 ${i === 1 ? "ring-2 ring-brand shadow-lg" : ""}`}
              >
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">₹{p.price}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.description ?? `${p.credits} scan credits`}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand" />{p.credits} scan credits</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand" />AI + Plagiarism detection</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-brand" />PDF Originality Report</li>
                </ul>
                <Link to="/register" className="block mt-6">
                  <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                    Choose {p.name}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Turnitin Clone. All rights reserved.
      </footer>
    </div>
  );
}
