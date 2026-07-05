import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DotLoader } from "@/components/Loader";
import { AuthShell, Field } from "./login";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email(),
  password: z.string().min(6, "Min 6 characters"),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — NAK Detection Tool" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (v: Form) => (await api.post("/auth/register", v)).data,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      toast.error("Sign up failed", { description: err.response?.data?.detail ?? "Try again" });
    },
  });

  return (
    <AuthShell title="Create your account" subtitle="Start scanning in seconds — no card required">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Field label="Name" error={errors.name?.message} icon={User}>
          <Input placeholder="Ada Lovelace" className="pl-10 h-11" {...register("name")} />
        </Field>
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
            autoComplete="new-password"
            placeholder="At least 6 characters"
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
            <>Creating <DotLoader className="ml-1" /></>
          ) : (
            <>Create account <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
        <div className="text-center text-sm text-muted-foreground pt-2">
          Already have one?{" "}
          <Link to="/login" className="text-brand font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
