import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { WidgetFrame } from "@/components/widget/widget-frame";

export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: { widgetKey: string } }) {
  const supabase = createServiceRoleClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, brand_color")
    .eq("public_widget_key", params.widgetKey)
    .single();

  if (error) throw new Error(`Failed to load widget business: ${error.message}`);
  if (!business) notFound();

  return (
    <WidgetFrame
      widgetKey={params.widgetKey}
      businessName={business.name}
      brandColor={business.brand_color}
    />
  );
}
