export interface Order {
  id: number;
  product_id: number;
  buyer_id: number;
  seller_id: number;
  quantity: number;
  total_price: number;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  order_date: string;
  product_name?: string;
  product_image?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_cellphone?: string;
  seller_name?: string;
  created_at?: string;
  updated_at?: string;
}