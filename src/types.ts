export type OrderStatus = 'Pending' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface MenuItem {
  id: string; // Document ID
  name: string;
  price: number;
  category: string;
  is_available: boolean;
  is_express?: boolean;
  description?: string;
  isTest?: boolean;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  is_express?: boolean;
  isTest?: boolean;
}

export interface Order {
  id: string; // Document ID
  uid: string; // Anonymous User ID
  token_number: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  created_at: number; // timestamp
  payment_status: 'Unverified' | 'Verified';
  payment_method?: string;
  scheduled_for?: string | null;
  utr_number?: string;
}
