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
import { StaffSearchPanel } from "@/components/layout/staff-search-panel";

type StaffSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSearch: () => void;
  searchAnchorRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLElement | null>;
};

const StaffSearchContext = createContext<StaffSearchContextValue | null>(null);

export function StaffSearchProvider({ children }: { children: ReactNode }) {
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
    <StaffSearchContext.Provider value={value}>
      {children}
      <StaffSearchPanel open={open} onOpenChange={setOpen} />
    </StaffSearchContext.Provider>
  );
}

export function useStaffSearch() {
  const context = useContext(StaffSearchContext);
  if (!context) {
    throw new Error("useStaffSearch must be used within StaffSearchProvider");
  }
  return context;
}
