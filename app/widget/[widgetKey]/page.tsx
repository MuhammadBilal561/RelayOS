import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ChatWidget } from "@/components/widget/chat-widget";

export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: { widgetKey: string } }) {
  const supabase = createServiceRoleClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, brand_color")
    .eq("public_widget_key", params.widgetKey)
    .single();

  if (!business) notFound();

  return (
    <div className="h-screen w-screen bg-transparent p-2">
      <ChatWidget widgetKey={params.widgetKey} businessName={business.name} brandColor={business.brand_color} />
    </div>
  );
}
