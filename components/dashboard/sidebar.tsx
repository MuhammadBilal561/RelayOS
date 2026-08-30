"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, LayoutGrid, BookOpen, Calendar, BarChart3, Settings, Users, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationProvider, usePendingNavigation } from "./navigation-context";
import { Tooltip } from "@/components/ui/tooltip";

const primaryNav = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  const isPending = usePendingNavigation(href);
  const isActive = active;

  return (
    <Tooltip content={label} side="right">
      <Link
        href={href}
        title={label}
        className={cn(
          "flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors md:justify-start relative",
          isActive ? "bg-white/10 text-paper-50" : "text-paper-50/60 hover:bg-white/5 hover:text-paper-50",
          isPending && "opacity-70"
        )}
        onClick={() => {
          // Navigation will be handled by Next.js Link
        }}
      >
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-signal-500 animate-spin" aria-hidden="true" />
          </div>
        )}
        <span className="relative z-10">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="hidden md:inline">{label}</span>
        </span>
      </Link>
    </Tooltip>
  );
}

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

  async function handleLogout(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok || res.redirected) {
      window.location.href = "/login";
    }
  }

  return (
    <NavigationProvider>
      <aside className="fixed top-0 left-0 z-40 flex h-screen w-16 shrink-0 flex-col justify-between border-r border-ink-800/10 bg-ink-950 px-2 py-4 text-paper-50 md:w-60 md:px-3">
      <div className="overflow-y-auto pr-2 md:pr-0">
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
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
              />
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-ink-800/10 pt-4">
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors md:justify-start",
            pathname?.startsWith("/settings")
              ? "bg-white/10 text-paper-50"
              : "text-paper-50/50 hover:bg-white/5 hover:text-paper-50"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="hidden md:inline">Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          title="Logout"
          className={cn(
            "flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors md:justify-start",
            "text-paper-50/50 hover:bg-white/5 hover:text-paper-50"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </aside>
  </NavigationProvider>
  );
}
