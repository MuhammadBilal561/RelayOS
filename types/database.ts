// Hand-written types matching supabase/migrations/0001_init.sql, shaped to
// satisfy @supabase/supabase-js's GenericSchema constraint (Tables + Views +
// Functions + Enums + CompositeTypes) so query results type-check correctly.
//
// Once the project is deployed, regenerate these from the live schema with:
//   npx supabase gen types typescript --project-id <your-project-ref> > types/database.ts

export type LeadStatus = "new" | "qualified" | "booked" | "nurturing" | "escalated" | "lost";
export type MessageRole = "visitor" | "assistant" | "staff" | "system";
export type ConversationChannel = "widget" | "email";
export type UserRole = "owner" | "staff" | "agency_admin";

export interface OrganizationRow {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

export interface BusinessRow {
  id: string;
  organization_id: string;
  name: string;
  industry: string | null;
  timezone: string;
  public_widget_key: string;
  brand_color: string;
  system_persona: string | null;
  n8n_webhook_url: string | null;
  // Per-event n8n webhook URLs (migration 0008_three_webhook_urls.sql).
  n8n_webhook_url_lead_qualified: string | null;
  n8n_webhook_url_lead_escalated: string | null;
  n8n_webhook_url_booking_created: string | null;
  // HMAC secret used to sign outbound automation webhook requests
  // (migration 0009_webhook_signing_secret.sql).
  n8n_webhook_secret: string | null;
  avg_job_value: number | null;
  created_at: string;
}


export interface KbDocumentRow {
  id: string;
  business_id: string;
  title: string;
  source_type: string;
  content_text: string;
  created_at: string;
}

export interface KbChunkRow {
  id: string;
  document_id: string;
  business_id: string;
  chunk_text: string;
  embedding: number[];
  created_at: string;
}

export interface LeadRow {
  id: string;
  business_id: string;
  visitor_session_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  service_interest: string | null;
  source: string;
  score: number;
  status: LeadStatus;
  last_scored_at: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  lead_id: string;
  business_id: string;
  channel: ConversationChannel;
  status: string;
  summary_text: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_calls: Record<string, unknown> | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export interface CalendarConnectionRow {
  id: string;
  business_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_id: string;
  connected_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  lead_id: string;
  business_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  calendar_event_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AutomationEventRow {
  id: string;
  business_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  delivered_at: string | null;
  delivery_error: string | null;
  created_at: string;
}

type TableDef<Row, RequiredInsertKeys extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: TableDef<OrganizationRow, "name">;
      businesses: TableDef<BusinessRow, "organization_id" | "name">;
      kb_documents: TableDef<KbDocumentRow, "business_id" | "title" | "content_text">;
      kb_chunks: TableDef<KbChunkRow, "document_id" | "business_id" | "chunk_text" | "embedding">;
      leads: TableDef<LeadRow, "business_id">;
      conversations: TableDef<ConversationRow, "lead_id" | "business_id">;
      messages: TableDef<MessageRow, "conversation_id" | "role" | "content">;
      users: TableDef<UserRow, "id" | "organization_id" | "email">;
      calendar_connections: TableDef<
        CalendarConnectionRow,
        "business_id" | "access_token" | "refresh_token" | "token_expires_at"
      >;
      bookings: TableDef<BookingRow, "lead_id" | "business_id" | "start_time" | "end_time">;
      automation_events: TableDef<AutomationEventRow, "business_id" | "event_type">;
    };
    Views: Record<string, never>;
    Functions: {
      match_kb_chunks: {
        Args: {
          p_business_id: string;
          p_query_embedding: number[];
          p_match_count?: number;
        };
        Returns: { id: string; chunk_text: string; similarity: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
