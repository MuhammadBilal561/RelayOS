"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Inbox,
  LayoutGrid,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationProvider, usePendingNavigation } from "./navigation-context";
import { Spinner } from "@/components/ui/spinner";

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

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-150",
        active
          ? "bg-ink-950 font-medium text-white shadow-[0_8px_20px_-12px_rgba(17,27,35,0.7)]"
          : "text-ink-600 hover:bg-ink-900/[0.05] hover:text-ink-950"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-signal-400" : "text-ink-400 group-hover:text-ink-700")} />
      <span className="relative min-w-0 flex-1 truncate text-left">{label}</span>
      {isPending && <Spinner className={cn("h-3.5 w-3.5 shrink-0", active ? "text-signal-400" : "text-ink-400")} />}
    </Link>
  );
}

interface SidebarProps {
  businessName: string;
  businesses: { id: string; name: string }[];
  currentBusinessId: string;
  userEmail?: string;
}

function userInitials(userEmail?: string, businessName = "") {
  const local = userEmail?.split("@")[0] ?? "";
  const clean = local.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  if (clean) return clean;
  return businessName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function userName(userEmail?: string) {
  const local = userEmail?.split("@")[0] ?? "";
  const clean = local.replace(/[._-]+/g, " ").trim();
  return clean
    .split(" ")
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function Sidebar({ businessName, businesses, currentBusinessId, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

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

  const navContent = (
    <>
      <div className="flex-1 overflow-y-auto px-3 pb-4 scroll-thin">
        <div className="mb-6 mt-5 flex items-center gap-3 px-1">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-signal-400"
          >
            <span className="font-display text-base font-bold">R</span>
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold tracking-tight text-ink-950">RelayOS</p>
            <p className="truncate text-[11px] text-ink-400">{businessName}</p>
          </div>
        </div>

        {businesses.length > 0 && (
          <div className="relative mb-5 px-0.5">
            <Building2
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            />
            <select
              value={currentBusinessId}
              onChange={handleSwitch}
              aria-label="Switch business"
              className="w-full appearance-none rounded-xl border border-ink-900/10 bg-white py-2.5 pl-8 pr-7 text-xs font-medium text-ink-800 transition-colors hover:border-ink-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/50"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="__add__">+ Add a business…</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            />
          </div>
        )}

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Workspace
        </p>
        <nav className="flex flex-col gap-1" aria-label="Primary navigation">
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

      <div className="border-t border-ink-900/8 px-3 pb-4 pt-3">
        <Link
          href="/settings"
          aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors duration-150",
            pathname?.startsWith("/settings")
              ? "bg-ink-950 font-medium text-white"
              : "text-ink-600 hover:bg-ink-900/[0.05] hover:text-ink-950"
          )}
        >
          <Settings className={cn("h-4 w-4 shrink-0", pathname?.startsWith("/settings") ? "text-signal-400" : "text-ink-400")} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] text-ink-600 transition-colors duration-150 hover:bg-alert-500/10 hover:text-alert-700"
        >
          <LogOut className="h-4 w-4 shrink-0 text-ink-400" />
          Logout
        </button>
        {userEmail && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-ink-900/8 bg-white px-2.5 py-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[11px] font-semibold text-signal-300"
            >
              {userInitials(userEmail, businessName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-900">{userName(userEmail) || businessName}</p>
              <p className="truncate text-[10px] text-ink-400">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <NavigationProvider>
      <aside className="dash-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col md:flex">
        {navContent}
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-900/8 bg-[#faf6ef]/90 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-950 text-signal-400"
          >
            <span className="font-display text-sm font-bold">R</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-tight text-ink-950">RelayOS</p>
            <p className="max-w-[40vw] truncate text-[10px] text-ink-400">{businessName}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-900/10 bg-white text-ink-700 transition-colors hover:bg-[#efe8dc]"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 overflow-hidden transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "dash-sidebar absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col shadow-float transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
          {navContent}
        </div>
      </div>
    </NavigationProvider>
  );
}
