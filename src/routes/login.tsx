import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AxiosError } from "axios";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Min 6 chars"),
});
type Form = z.infer<typeof schema>;

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — Turnitin Clone" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
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

  return <AuthShell title="Welcome back" subtitle="Sign in to your Turnitin account">
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </Field>
      <Button type="submit" disabled={mutation.isPending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        No account? <Link to="/register" className="text-brand font-medium">Create one</Link>
      </div>
      <div className="text-center text-xs">
        <Link to="/admin/login" className="text-muted-foreground hover:text-brand">Admin portal →</Link>
      </div>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-16 flex items-center px-6 border-b bg-background">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand">
          <ShieldCheck className="h-5 w-5" /> Turnitin
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-brand">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="rounded-xl border bg-card p-8 shadow-sm">{children}</div>
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground">© 2026 Turnitin Clone</footer>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
