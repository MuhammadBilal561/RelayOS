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
        "dash-nav-item group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150",
        active
          ? "bg-white/[0.09] font-medium text-white"
          : "text-white/55 hover:bg-white/[0.05] hover:text-white"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-signal-400"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-signal-400" : "text-white/40 group-hover:text-white/70")} />
      <span className="relative min-w-0 flex-1 truncate text-left">{label}</span>
      {isPending && <Spinner className="h-3.5 w-3.5 shrink-0 text-signal-400" />}
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
        <div className="mb-5 mt-5 flex items-center gap-2.5 px-1">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-signal-400 to-signal-600 text-ink-950 shadow-[0_0_0_1px_rgba(242,169,59,0.25)]"
          >
            <span className="font-display text-sm font-bold">R</span>
          </span>
          <div className="min-w-0">
            <p className="font-display text-[13px] font-semibold tracking-tight text-white">RelayOS</p>
            <p className="truncate font-mono text-[10px] text-white/40">{businessName}</p>
          </div>
        </div>

        {businesses.length > 0 && (
          <div className="relative mb-4 px-1">
            <Building2
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
            />
            <select
              value={currentBusinessId}
              onChange={handleSwitch}
              aria-label="Switch business"
              className="w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.05] py-2 pl-8 pr-7 text-xs text-white/80 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/60"
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
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
            />
          </div>
        )}

        <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
          Workspace
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Primary navigation">
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

      <div className="border-t border-white/[0.07] px-3 pb-4 pt-3">
        <Link
          href="/settings"
          aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150",
            pathname?.startsWith("/settings")
              ? "bg-white/[0.09] font-medium text-white"
              : "text-white/55 hover:bg-white/[0.05] hover:text-white"
          )}
        >
          <Settings className={cn("h-4 w-4 shrink-0", pathname?.startsWith("/settings") ? "text-signal-400" : "text-white/40")} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/55 transition-colors duration-150 hover:bg-alert-500/10 hover:text-alert-400"
        >
          <LogOut className="h-4 w-4 shrink-0 text-white/40" />
          Logout
        </button>
        {userEmail && (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-500/20 text-[11px] font-semibold text-signal-300"
            >
              {userInitials(userEmail, businessName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/90">{userName(userEmail) || businessName}</p>
              <p className="truncate text-[10px] text-white/35">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <NavigationProvider>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#0e1117] md:flex">
        {navContent}
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-900/8 bg-white/80 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-signal-400 to-signal-600 text-ink-950"
          >
            <span className="font-display text-sm font-bold">R</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-tight text-ink-950">RelayOS</p>
            <p className="max-w-[40vw] truncate font-mono text-[10px] text-ink-400">{businessName}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-900/10 bg-white text-ink-700 transition-colors hover:bg-paper-50"
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
          className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-[#0e1117] shadow-float transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
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
