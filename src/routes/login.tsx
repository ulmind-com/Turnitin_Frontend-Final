import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock, ArrowRight, Sparkles, Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DotLoader } from "@/components/Loader";
import type { AxiosError } from "axios";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Min 6 chars"),
});
type Form = z.infer<typeof schema>;

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — NAK Detection Tool Clone" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (v: Form) => (await api.post("/auth/login", v)).data,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      toast.success("Welcome back");
      navigate({ to: (search.redirect as "/dashboard") ?? "/dashboard" });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      toast.error("Sign in failed", { description: err.response?.data?.detail ?? "Check your credentials" });
    },
  });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your Feedback Studio">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Field label="Email" error={errors.email?.message} icon={Mail}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            className="pl-10 h-11"
            {...register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message} icon={Lock}>
          <Input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-10 pr-10 h-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-11 bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg shadow-brand/25"
        >
          {mutation.isPending ? (
            <>Signing in <DotLoader className="ml-1" /></>
          ) : (
            <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="text-brand font-semibold hover:underline">
            Create one free
          </Link>
        </div>
        <div className="text-center text-xs">
          <Link to="/admin/login" className="text-muted-foreground hover:text-brand">
            Admin portal →
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED AUTH SHELL                                                   */
/* ------------------------------------------------------------------ */

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_1.1fr]">
      {/* Left: form */}
      <div className="flex flex-col min-h-screen">
        <header className="h-16 flex items-center px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand">
            <ShieldCheck className="h-5 w-5" /> NAK Detection Tool
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-brand tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            </div>
            <div className="rounded-2xl border bg-card p-8 shadow-xl shadow-brand/5">
              {children}
            </div>
            <div className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <a href="#" className="underline hover:text-brand">Terms</a> &{" "}
              <a href="#" className="underline hover:text-brand">Privacy</a>.
            </div>
          </motion.div>
        </main>
        <footer className="py-4 px-6 text-center text-xs text-muted-foreground">
          © 2026 NAK Detection Tool Clone
        </footer>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand via-[color:var(--ai)] to-plag" />
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="auth-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-dots)" />
          </svg>
        </div>
        {/* Floating orbs */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 -right-20 h-80 w-80 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 -left-20 h-80 w-80 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative h-full flex flex-col justify-between p-14 text-white">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 backdrop-blur px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Trusted by 42k+ instructors
            </div>
            <h2 className="mt-8 text-4xl font-bold leading-tight max-w-md">
              Academic integrity, reimagined for the AI era.
            </h2>
            <p className="mt-5 text-white/85 text-lg max-w-md leading-relaxed">
              Detect plagiarism and AI-written prose in a single premium Feedback Studio.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "AI + plagiarism in one report",
                "Under 30-second scans",
                "Inline grading & PDF export",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-white/90">
                  <div className="rounded-full bg-white/20 p-0.5">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Mini report card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-5 max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Feedback Studio
              </div>
              <span className="text-[10px] rounded-full bg-emerald-400/30 border border-emerald-300/50 px-2 py-0.5 text-emerald-50">
                Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold tabular-nums">12%</div>
                <div className="text-[10px] uppercase tracking-wide text-white/70">Similarity</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">82%</div>
                <div className="text-[10px] uppercase tracking-wide text-white/70">AI Written</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 space-y-1.5">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white/80 rounded-full" style={{ width: "82%" }} />
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white/50 rounded-full" style={{ width: "45%" }} />
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-white/40 rounded-full" style={{ width: "63%" }} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  icon: Icon,
  children,
}: {
  label: string;
  error?: string;
  icon?: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        {children}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
