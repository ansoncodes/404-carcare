"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/services/auth.service";
import { loginSchema, type LoginValues } from "@/lib/validators";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth({ user: data.user, tokens: { access: data.access, refresh: data.refresh } });
      toast.push("Welcome back", "Signed in successfully", "success");
      if (data.user.role === "customer") {
        router.replace("/dashboard");
      } else if (data.user.role === "supervisor") {
        router.replace("/supervisor/dashboard");
      } else {
        router.replace("/admin/dashboard");
      }
    },
    onError: () => toast.push("Login failed", "Check credentials and try again", "error"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Sign in</h1>
        <p className="text-sm text-[var(--text-secondary)]">Access your 404 CarCare dashboard</p>
      </div>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
        <Input
          label="Password"
          type="password"
          {...form.register("password")}
          error={form.formState.errors.password?.message}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-[var(--text-secondary)]">
        New here?{" "}
        <Link href="/register" className="text-[var(--accent)]">
          Create account
        </Link>
      </p>
    </div>
  );
}