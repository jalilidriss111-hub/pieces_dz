export type ShopCategory =
  | "new_parts"
  | "wrecker"
  | "bodywork"
  | "mechanical"
  | "accessories";

export type PartCondition =
  | "new"
  | "original"
  | "used"
  | "aftermarket";

export type RequestStatus =
  | "pending"
  | "found"
  | "closed";

export type NewsTag =
  | "arrival"
  | "promo"
  | "clearance";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_shop_owner: boolean;
  wilaya: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  wilaya: string;
  address: string;
  maps_link: string | null;
  category: ShopCategory;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartRequest {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  part_name: string;
  wilaya: string;
  all_algeria: boolean;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ShopResponse {
  id: string;
  request_id: string;
  shop_id: string;
  price: number | null;
  condition: PartCondition;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsPost {
  id: string;
  shop_id: string;
  title: string;
  body: string | null;
  tag: NewsTag;
  created_at: string;
}

export interface Review {
  id: string;
  shop_id: string;
  customer_id: string;
  request_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopRatingSummary {
  shop_id: string;
  avg_rating: number;
  review_count: number;
}

export interface BlockedShop {
  customer_id: string;
  shop_id: string;
  created_at: string;
}

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

type View<T> = {
  Row: T;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      shops: Table<Shop>;
      part_requests: Table<PartRequest>;
      shop_responses: Table<ShopResponse>;
      news_posts: Table<NewsPost>;
      reviews: Table<Review>;
      blocked_shops: Table<BlockedShop>;
    };

    Views: {
      shop_ratings: View<ShopRatingSummary>;
    };

    Functions: Record<string, never>;

    Enums: {
      shop_category: ShopCategory;
      part_condition: PartCondition;
      request_status: RequestStatus;
      news_tag: NewsTag;
    };

    CompositeTypes: Record<string, never>;
  };
}
