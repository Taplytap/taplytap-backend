export type QrStatus = "active" | "inactive" | "blocked";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      qr_status: QrStatus;
    };
  };
};
