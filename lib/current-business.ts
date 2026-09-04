import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BusinessRow } from "@/types/database";
import { cache } from "react";

export const ACTIVE_BUSINESS_COOKIE = "relayos_active_business_id";

type CurrentBusiness = Pick<BusinessRow, "id" | "name" | "public_widget_key" | "brand_color">;

/**
 * Every dashboard page needs "which business am I looking at." Phase 5's
 * agency mode means an organization can own several businesses, so the
 * answer is: whichever one is in the relayos_active_business_id cookie
 * (set by the business switcher / switch route), as long as it actually
 * belongs to this user's organization — otherwise, the first business
 * under the org, same as the Phase 1 default.
 * 
 * CACHED: This function is now cached per-request to avoid multiple DB calls
 */
export const getCurrentBusiness = cache(async (): Promise<CurrentBusiness> => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Current business auth lookup failed:", authError.message);
    redirect("/login");
  }
  if (!user) redirect("/login");

  const { data: userRow, error: userError } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (userError) {
    console.error("Current business user lookup failed:", userError.message, { userId: user.id });
    redirect("/signup");
  }
  if (!userRow?.organization_id) {
    console.error("User has no organization_id:", user.id);
    redirect("/signup");
  }

  const activeBusinessId = cookies().get(ACTIVE_BUSINESS_COOKIE)?.value;

  if (activeBusinessId) {
    const { data: cookieBusiness, error: cookieError } = await supabase
      .from("businesses")
      .select("id, name, public_widget_key, brand_color")
      .eq("id", activeBusinessId)
      .eq("organization_id", userRow.organization_id) // ownership check — a stale/tampered cookie can't leak another org's business
      .maybeSingle();

    if (cookieError) {
      console.error("Active business lookup failed:", cookieError.message, { activeBusinessId });
    } else if (cookieBusiness) return cookieBusiness;
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, public_widget_key, brand_color")
    .eq("organization_id", userRow.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (businessError) {
    console.error("Default business lookup failed:", businessError.message, { organizationId: userRow.organization_id });
    throw new Error(`Failed to load business: ${businessError.message}`);
  }
  if (!business) {
    console.error("No business found for organization:", userRow.organization_id);
    redirect("/signup");
  }

  return business;
});

/** All businesses under the current user's organization, for the sidebar switcher. CACHED per-request. */
export const getBusinessesForCurrentUser = cache(async (): Promise<{ id: string; name: string }[]> => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    if (authError) console.error("Business list auth lookup failed:", authError.message);
    return [];
  }

  const { data: userRow, error: userError } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (userError || !userRow) {
    if (userError) console.error("Business list user lookup failed:", userError.message, { userId: user.id });
    return [];
  }

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("organization_id", userRow.organization_id)
    .order("created_at", { ascending: true });

  if (businessesError) {
    console.error("Business list lookup failed:", businessesError.message, { organizationId: userRow.organization_id });
    return [];
  }
  return businesses ?? [];
});
