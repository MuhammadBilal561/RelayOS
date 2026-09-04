import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Runs once, right after a new user signs up. Organizations/users/
 * businesses can't be created through normal RLS-protected inserts
 * because the chicken-and-egg problem (a brand new user has no
 * organization_id yet, so auth_organization_id() returns nothing) —
 * so this one bootstrap step uses the service-role key, gated by
 * requiring a valid, just-created auth session first.
 */
export async function POST(req: NextRequest) {
  console.log("=== PROVISION API CALLED ===");
  
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("Authenticated user:", user?.id || "NONE");

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { organizationName?: string; businessName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { organizationName, businessName } = body;
  console.log("Provision request:", { organizationName, businessName });
  
  if (!organizationName?.trim() || !businessName?.trim()) {
    return NextResponse.json({ error: "organizationName and businessName are required" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  // Guard against re-provisioning if this route is ever called twice.
  const { data: existing, error: existingError } = await service.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existingError) {
    console.error("Provision existing-user check failed:", existingError.message, { userId: user.id });
    return NextResponse.json({ error: "Couldn't verify account state" }, { status: 500 });
  }
  console.log("Existing user check:", existing ? "ALREADY EXISTS" : "NEW USER");
  
  if (existing) {
    return NextResponse.json({ error: "Account already provisioned" }, { status: 409 });
  }

  const { data: organization, error: orgError } = await service
    .from("organizations")
    .insert({ name: organizationName })
    .select("id")
    .single();
  
  console.log("Organization insert:", organization?.id || "FAILED", orgError?.message || "");
  
  if (orgError || !organization) {
    return NextResponse.json({ error: `Failed to create organization: ${orgError?.message}` }, { status: 500 });
  }

  const { error: userError } = await service.from("users").insert({
    id: user.id,
    organization_id: organization.id,
    email: user.email ?? "",
    role: "owner",
  });
  
  console.log("User insert:", userError ? `FAILED: ${userError.message}` : "SUCCESS");
  
  if (userError) {
    await cleanupProvisionedOrganization(service, organization.id);
    return NextResponse.json({ error: `Failed to create user record: ${userError.message}` }, { status: 500 });
  }

  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ organization_id: organization.id, name: businessName })
    .select("id, public_widget_key")
    .single();
  
  console.log("Business insert:", business?.id || "FAILED", businessError?.message || "");
  
  if (businessError || !business) {
    await cleanupProvisionedOrganization(service, organization.id);
    return NextResponse.json({ error: `Failed to create business: ${businessError?.message}` }, { status: 500 });
  }

  // Force session refresh so the client knows about the new user record
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) console.warn("Provision succeeded but session refresh failed:", refreshError.message, { userId: user.id });
  
  console.log("=== PROVISION COMPLETE ===");

  return NextResponse.json({ organizationId: organization.id, businessId: business.id, widgetKey: business.public_widget_key });
}

async function cleanupProvisionedOrganization(service: ReturnType<typeof createServiceRoleClient>, organizationId: string) {
  const { error } = await service.from("organizations").delete().eq("id", organizationId);
  if (error) console.error("Failed to clean up partial organization provisioning:", error.message, { organizationId });
}
