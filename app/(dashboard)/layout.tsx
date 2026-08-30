import { Sidebar } from "@/components/dashboard/sidebar";
import { getCurrentBusiness, getBusinessesForCurrentUser } from "@/lib/current-business";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [business, businesses] = await Promise.all([getCurrentBusiness(), getBusinessesForCurrentUser()]);

  return (
    <div className="min-h-screen bg-paper-50">
      <Sidebar businessName={business.name} businesses={businesses} currentBusinessId={business.id} />
      <main className="min-w-0 flex-1 overflow-y-auto md:ml-60 pt-4 md:pt-0">{children}</main>
    </div>
  );
}
