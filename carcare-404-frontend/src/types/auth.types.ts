export type UserRole = "customer" | "supervisor" | "admin";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  is_staff?: boolean;
  airport: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserMini {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginTokenResponse extends AuthTokens {}

export interface RegisterRequest extends LoginRequest {
  full_name: string;
  phone?: string;
  password2: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
