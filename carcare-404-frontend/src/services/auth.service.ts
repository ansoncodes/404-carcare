import axios from "axios";
import api from "@/services/api";
import { API_URL } from "@/lib/constants";
import type {
  AuthResponse,
  LoginRequest,
  LoginTokenResponse,
  RegisterRequest,
  User,
  UserRole,
} from "@/types/auth.types";

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data: tokens } = await axios.post<LoginTokenResponse>(`${API_URL}/auth/login/`, payload);
  const { data: user } = await axios.get<User>(`${API_URL}/auth/profile/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  return { ...tokens, user };
}

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register/", payload);
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>("/auth/profile/");
  return data;
}

export async function updateProfile(payload: {
  full_name?: string;
  phone?: string;
}): Promise<User> {
  const { data } = await api.patch<User>("/auth/profile/", payload);
  return data;
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
}): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>("/auth/change-password/", payload);
  return data;
}

export async function listUsers(role?: UserRole): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/", { params: role ? { role } : undefined });
  return data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}/`);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<Pick<User, "full_name" | "phone" | "role" | "is_active" | "airport">>
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/`, payload);
  return data;
}

export async function createSupervisor(payload: {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  airport: string;
}): Promise<User> {
  const registered = await register({
    email: payload.email,
    full_name: payload.full_name,
    phone: payload.phone,
    password: payload.password,
    password2: payload.password,
  });

  const promoted = await updateUser(registered.user.id, {
    role: "supervisor",
    airport: payload.airport,
    is_active: true,
  });

  return promoted;
}
