import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, Field } from "./login";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email(),
  password: z.string().min(6, "Min 6 characters"),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Turnitin Clone" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
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
    <AuthShell title="Create your account" subtitle="Start scanning in seconds">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Button type="submit" disabled={mutation.isPending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          {mutation.isPending ? "Creating…" : "Create account"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Already have one? <Link to="/login" className="text-brand font-medium">Sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
