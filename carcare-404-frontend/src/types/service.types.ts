export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  services?: Service[];
}

export interface Service {
  id: string;
  category: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  base_price: string;
  is_active: boolean;
}

export interface ServiceCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  is_active?: boolean;
}

export interface ServicePayload {
  category: string;
  name: string;
  description?: string;
  duration_minutes: number;
  base_price: string | number;
  is_active?: boolean;
}