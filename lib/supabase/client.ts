import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Safe to call from client components —
 * only ever uses the public anon key, and every table is protected by
 * Row Level Security policies scoped to organization_id (see
 * supabase/migrations/0001_init.sql).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
