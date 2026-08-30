"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface NavigationContextType {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
  finishNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();

  // Clear pending state when pathname changes (navigation completed)
  useEffect(() => {
    if (pendingHref && pathname) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const startNavigation = useCallback((href: string | null) => {
    setPendingHref(href);
  }, []);

  const finishNavigation = useCallback(() => {
    setPendingHref(null);
  }, []);

  return (
    <NavigationContext.Provider value={{ pendingHref, setPendingHref: startNavigation, finishNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Hook to get pending state for a specific href
export function usePendingNavigation(href: string) {
  const { pendingHref } = useNavigation();
  return pendingHref === href;
}