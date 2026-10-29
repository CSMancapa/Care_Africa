export interface RewardItem {
  id?: string;
  name: string;
  type: string;
  points_required: number;
  service_id?: string;
  product_id?: string;
  discount_percentage?: number;
  description?: string;
  practice_id?: string;
  deleted_at?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
} 