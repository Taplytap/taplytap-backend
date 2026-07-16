export type QrStatus = "active" | "inactive" | "blocked";
export type BoostSubscriptionStatus = "inactive" | "active" | "canceled" | "past_due";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type QrCode = {
  id: string;
  code: string;
  status: QrStatus;
  public_url: string | null;
  destination_url: string | null;
  boost_enabled: boolean;
  place_id: string | null;
  business_name: string | null;
  contact_name: string | null;
  whatsapp: string | null;
  owner_email: string | null;
  owner_user_id: string | null;
  shopify_order_number: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  claimed_at: string | null;
};

export type ScanEvent = {
  id: string;
  qr_code_id: string | null;
  code: string;
  status_at_scan: QrStatus | "not_found";
  destination_url: string | null;
  user_agent: string | null;
  referrer: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type BoostFeedback = {
  id: string;
  qr_code_id: string | null;
  code: string;
  rating: number;
  message: string;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type BoostSubscription = {
  id: string;
  user_id: string;
  status: BoostSubscriptionStatus;
  source: string | null;
  email: string | null;
  shopify_customer_id: string | null;
  shopify_order_id: string | null;
  shopify_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopifyWebhookEvent = {
  id: string;
  topic: string;
  shop_domain: string | null;
  processed_at: string;
};

export type BoostSubscriptionPending = {
  id: string;
  email: string;
  status: BoostSubscriptionStatus;
  shopify_customer_id: string | null;
  shopify_order_id: string | null;
  payload: Json | null;
  created_at: string;
};

export type InstagramPlate = {
  id: string;
  code: string;
  status: QrStatus;
  public_url: string | null;
  destination_url: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  activation_code: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      qr_codes: {
        Row: QrCode;
        Insert: Partial<Omit<QrCode, "id" | "created_at" | "updated_at">> & {
          code: string;
          status?: QrStatus;
        };
        Update: Partial<Omit<QrCode, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      scan_events: {
        Row: ScanEvent;
        Insert: Partial<Omit<ScanEvent, "id" | "created_at">> & {
          code: string;
          status_at_scan: QrStatus | "not_found";
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "scan_events_qr_code_id_fkey";
            columns: ["qr_code_id"];
            isOneToOne: false;
            referencedRelation: "qr_codes";
            referencedColumns: ["id"];
          }
        ];
      };
      boost_feedback: {
        Row: BoostFeedback;
        Insert: Partial<Omit<BoostFeedback, "id" | "created_at">> & {
          code: string;
          rating: number;
          message: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "boost_feedback_qr_code_id_fkey";
            columns: ["qr_code_id"];
            isOneToOne: false;
            referencedRelation: "qr_codes";
            referencedColumns: ["id"];
          }
        ];
      };
      boost_subscriptions: {
        Row: BoostSubscription;
        Insert: Partial<Omit<BoostSubscription, "id" | "created_at">> & {
          user_id: string;
          status?: BoostSubscriptionStatus;
        };
        Update: Partial<Omit<BoostSubscription, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "boost_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      shopify_webhook_events: {
        Row: ShopifyWebhookEvent;
        Insert: {
          id: string;
          topic: string;
          shop_domain?: string | null;
          processed_at?: string;
        };
        Update: Partial<Omit<ShopifyWebhookEvent, "id">>;
        Relationships: [];
      };
      boost_subscription_pending: {
        Row: BoostSubscriptionPending;
        Insert: Partial<Omit<BoostSubscriptionPending, "id" | "created_at">> & {
          email: string;
          status?: BoostSubscriptionStatus;
        };
        Update: Partial<Omit<BoostSubscriptionPending, "id" | "created_at">>;
        Relationships: [];
      };
      instagram_plates: {
        Row: InstagramPlate;
        Insert: Partial<Omit<InstagramPlate, "id" | "created_at" | "updated_at">> & {
          code: string;
          status?: QrStatus;
        };
        Update: Partial<Omit<InstagramPlate, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      qr_status: QrStatus;
    };
  };
};
