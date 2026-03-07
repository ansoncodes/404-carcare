"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/services/auth.service";
import { registerSchema, type RegisterValues } from "@/lib/validators";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", password2: "", full_name: "", phone: "" },
  });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth({ user: data.user, tokens: { access: data.access, refresh: data.refresh } });
      toast.push("Account created", "Registration successful", "success");
      router.replace("/dashboard");
    },
    onError: () => toast.push("Registration failed", "Please review fields", "error"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Create account</h1>
        <p className="text-sm text-[var(--text-secondary)]">Start booking and tracking in real time</p>
      </div>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input label="Full name" {...form.register("full_name")} error={form.formState.errors.full_name?.message} />
        <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
        <Input label="Phone" {...form.register("phone")} error={form.formState.errors.phone?.message} />
        <Input
          label="Password"
          type="password"
          {...form.register("password")}
          error={form.formState.errors.password?.message}
        />
        <Input
          label="Confirm password"
          type="password"
          {...form.register("password2")}
          error={form.formState.errors.password2?.message}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-[var(--text-secondary)]">
        Already registered?{" "}
        <Link href="/login" className="text-[var(--accent)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}