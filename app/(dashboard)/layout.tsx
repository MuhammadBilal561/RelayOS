import { Sidebar } from "@/components/dashboard/sidebar";
import { getCurrentBusiness, getBusinessesForCurrentUser } from "@/lib/current-business";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const [{ data: auth }, business, businesses] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentBusiness(),
    getBusinessesForCurrentUser(),
  ]);

  return (
    <div className="dashboard-shell">
      <Sidebar
        businessName={business.name}
        businesses={businesses}
        currentBusinessId={business.id}
        userEmail={auth.user?.email ?? undefined}
      />
      <main className="min-w-0 pt-14 md:pl-64 md:pt-0">{children}</main>
    </div>
  );
}
