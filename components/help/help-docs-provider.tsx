"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HelpDocsContextValue = {
  open: boolean;
  openDocs: (articleId?: string) => void;
  closeDocs: () => void;
  initialArticleId: string | null;
};

const HelpDocsContext = createContext<HelpDocsContextValue | null>(null);

export function HelpDocsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialArticleId, setInitialArticleId] = useState<string | null>(null);

  const openDocs = useCallback((articleId?: string) => {
    setInitialArticleId(articleId || null);
    setOpen(true);
  }, []);

  const closeDocs = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ open, openDocs, closeDocs, initialArticleId }),
    [open, openDocs, closeDocs, initialArticleId]
  );

  return (
    <HelpDocsContext.Provider value={value}>{children}</HelpDocsContext.Provider>
  );
}

export function useHelpDocs() {
  const ctx = useContext(HelpDocsContext);
  if (!ctx) {
    throw new Error("useHelpDocs must be used within HelpDocsProvider");
  }
  return ctx;
}

export function useOptionalHelpDocs() {
  return useContext(HelpDocsContext);
}
