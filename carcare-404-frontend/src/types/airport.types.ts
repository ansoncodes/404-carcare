export interface Airport {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
