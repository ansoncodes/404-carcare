import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = loginSchema
  .extend({
    full_name: z.string().min(2).max(255),
    phone: z.string().min(8).max(15).optional(),
    password2: z.string().min(6),
  })
  .refine((v) => v.password === v.password2, {
    message: "Passwords must match",
    path: ["password2"],
  });

export const vehicleSchema = z.object({
  plate_number: z.string().min(4).max(20),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  year: z.coerce.number().min(1990).max(2100).optional(),
  vehicle_type: z.enum(["sedan", "suv", "hatchback", "truck", "van"]).optional(),
  vehicle_size: z.enum(["small", "medium", "large", "xl"]).optional(),
});

export const profileSchema = z.object({
  full_name: z.string().min(2).max(255),
  phone: z.string().min(8).max(15).optional(),
});

export const passwordSchema = z
  .object({
    old_password: z.string().min(6),
    new_password: z.string().min(6),
    confirm_password: z.string().min(6),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type VehicleValues = z.infer<typeof vehicleSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;