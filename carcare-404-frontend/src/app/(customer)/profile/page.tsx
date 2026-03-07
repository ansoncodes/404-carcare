"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { changePassword, updateProfile } from "@/services/auth.service";
import { passwordSchema, profileSchema, type PasswordValues, type ProfileValues } from "@/lib/validators";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const toast = useToast();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setUser(data);
      toast.push("Updated", "Profile saved", "success");
    },
    onError: () => toast.push("Update failed", "Could not save profile", "error"),
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordValues) =>
      changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      }),
    onSuccess: () => {
      toast.push("Password updated", "Use new password next time", "success");
      passwordForm.reset();
    },
    onError: () => toast.push("Password update failed", "Check your old password", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage account details" />
      <form
        className="panel space-y-4 p-4"
        onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
      >
        <Input
          label="Full name"
          {...profileForm.register("full_name")}
          error={profileForm.formState.errors.full_name?.message}
        />
        <Input label="Phone" {...profileForm.register("phone")} error={profileForm.formState.errors.phone?.message} />
        <Button type="submit" disabled={profileMutation.isPending}>
          Save profile
        </Button>
      </form>

      <form
        className="panel space-y-4 p-4"
        onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
      >
        <Input
          label="Current password"
          type="password"
          {...passwordForm.register("old_password")}
          error={passwordForm.formState.errors.old_password?.message}
        />
        <Input
          label="New password"
          type="password"
          {...passwordForm.register("new_password")}
          error={passwordForm.formState.errors.new_password?.message}
        />
        <Input
          label="Confirm password"
          type="password"
          {...passwordForm.register("confirm_password")}
          error={passwordForm.formState.errors.confirm_password?.message}
        />
        <Button type="submit" disabled={passwordMutation.isPending}>
          Change password
        </Button>
      </form>
    </section>
  );
}