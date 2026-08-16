"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, LayoutGrid, BookOpen, Calendar, BarChart3, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface SidebarProps {
  businessName: string;
  businesses: { id: string; name: string }[];
  currentBusinessId: string;
}

export function Sidebar({ businessName, businesses, currentBusinessId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "__add__") {
      router.push("/settings#add-business");
      return;
    }
    window.location.href = `/api/v1/businesses/switch?businessId=${value}`;
  }

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col justify-between border-r border-ink-800/10 bg-ink-950 px-2 py-4 text-paper-50 md:w-60 md:px-3">
      <div>
        <div className="mb-3 hidden px-2 md:block">
          <p className="font-display text-sm font-semibold">RelayOS</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-paper-50/50">{businessName}</p>
        </div>

        {/* Business switcher — agency mode: one login, many client businesses. */}
        {businesses.length > 0 && (
          <div className="mb-4 hidden px-2 md:block">
            <select
              value={currentBusinessId}
              onChange={handleSwitch}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-paper-50 focus-visible:outline-none"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id} className="bg-ink-900 text-paper-50">
                  {b.name}
                </option>
              ))}
              <option value="__add__" className="bg-ink-900 text-paper-50">
                + Add a business…
              </option>
            </select>
          </div>
        )}

        <div className="mb-6 flex justify-center md:hidden">
          <span className="signal-dot signal-dot--live" />
        </div>

        <nav className="space-y-0.5">
          {primaryNav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors md:justify-start",
                  active ? "bg-white/10 text-paper-50" : "text-paper-50/60 hover:bg-white/5 hover:text-paper-50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/settings"
        title="Settings"
        className="flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-paper-50/50 hover:bg-white/5 hover:text-paper-50 md:justify-start"
      >
        <Settings className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">Settings</span>
      </Link>
    </aside>
  );
}
