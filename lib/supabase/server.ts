import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client bound to the current user's session cookie.
 * Use this in Server Components, Route Handlers, and Server Actions that
 * act on behalf of a logged-in dashboard user — RLS applies normally.
 * 
 * Optimized with global connection settings for better performance.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    {
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            cache: options.cache || 'no-store',
          });
        },
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — safe to ignore when
            // middleware is refreshing the session instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

/**
 * Privileged service-role client. This BYPASSES Row Level Security, so it
 * must only ever be used inside trusted server code (route handlers), and
 * only after the caller has been independently authenticated — e.g. the
 * widget endpoint validates a per-business public key before using this.
 * NEVER import this file into a client component.
 * 
 * Optimized with connection pooling settings.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? "",
    { 
      auth: { persistSession: false },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            keepalive: true,
          });
        },
      },
    }
  );
}
