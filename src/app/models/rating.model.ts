export interface Rating {
  id?: number;
  order_id: number;
  user_id: number;
  product_id: number;
  rating: number; // 1-5 stars
  review?: string;
  created_at?: string;
}

export interface ProductRating {
  product_id: number;
  product_name: string;
  average_rating: number;
  total_ratings: number;
  ratings?: Rating[];
}
