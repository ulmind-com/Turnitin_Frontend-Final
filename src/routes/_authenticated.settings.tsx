import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useEffect } from "react";
import { UserCog, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader, LoaderOverlay } from "@/components/Loader";

const schema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email"),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Account settings — NAK Detection Tool Clone" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: async (v: Form) => (await api.put<AuthUser>("/user/profile", v)).data,
    onSuccess: (updated) => {
      setUser(updated);
      qc.setQueryData(["me"], updated);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Profile updated", { description: "Your changes are live." });
      reset({ name: updated.name, email: updated.email });
    },
    onError: (err) => {
      const ax = err as AxiosError<{ detail?: string }>;
      const status = ax.response?.status;
      if (status === 409) {
        toast.error("Email already in use", {
          description: "That email belongs to another account.",
        });
      } else if (status !== 401) {
        toast.error("Could not update profile", {
          description: ax.response?.data?.detail ?? "Try again in a moment.",
        });
      }
    },
  });

  if (isLoading || !user) {
    return <PageLoader label="Loading your account settings…" />;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {mutation.isPending && <LoaderOverlay label="Saving your changes…" />}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand grid place-items-center">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            Update the name and email associated with your account.
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-brand/5 to-transparent">
          <h2 className="font-semibold">Profile</h2>
        </div>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="p-6 space-y-5"
        >
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} autoComplete="name" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" {...register("email")} autoComplete="email" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </div>
              <Button
                type="submit"
                disabled={!isDirty || mutation.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Save changes
                  </>
                )}
              </Button>
            </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Account summary</h2>
        </div>
        <dl className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Info label="Role" value={user.role} />
          <Info label="Status" value={user.account_status} />
          <Info label="Credits" value={user.credits.toString()} />
          <Info label="Active plan" value={user.active_plan?.name ?? "No plan"} />
        </dl>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}
