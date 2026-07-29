"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { PortalSearchPanel } from "@/components/portal/portal-search-panel";

type PortalSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSearch: () => void;
  searchAnchorRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLElement | null>;
};

const PortalSearchContext = createContext<PortalSearchContextValue | null>(
  null
);

export function PortalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, openSearch, searchAnchorRef, headerRef }),
    [open, openSearch]
  );

  return (
    <PortalSearchContext.Provider value={value}>
      {children}
      <PortalSearchPanel open={open} onOpenChange={setOpen} />
    </PortalSearchContext.Provider>
  );
}

export function usePortalSearch() {
  const context = useContext(PortalSearchContext);
  if (!context) {
    throw new Error("usePortalSearch must be used within PortalSearchProvider");
  }
  return context;
}
