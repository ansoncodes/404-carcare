export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  services?: Service[];
}

export interface ServiceStage {
  id: string;
  stage_name: string;
  stage_order: number;
  description: string | null;
  estimated_duration_minutes: number;
  created_at: string;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  base_price: string;
  is_active: boolean;
  stages?: ServiceStage[];
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
