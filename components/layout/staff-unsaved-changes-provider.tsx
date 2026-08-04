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
} from "react";
import { usePathname, useRouter } from "next/navigation";

export type UnsavedChangesRegistration = {
  dirty: boolean;
  saving?: boolean;
  label?: string;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
};

type StaffUnsavedChangesContextValue = {
  dirty: boolean;
  saving: boolean;
  label: string;
  shaking: boolean;
  attention: boolean;
  register: (registration: UnsavedChangesRegistration | null) => void;
  save: () => Promise<void>;
  discard: () => void;
  /** Flash + shake the save bar. Returns false when leave is blocked. */
  requestLeave: (href?: string) => boolean;
};

const StaffUnsavedChangesContext =
  createContext<StaffUnsavedChangesContextValue | null>(null);

function isInternalNavigationHref(href: string): boolean {
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const url = new URL(href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return href.startsWith("/");
}

export function StaffUnsavedChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const registrationRef = useRef<UnsavedChangesRegistration | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("Unsaved changes");
  const [shaking, setShaking] = useState(false);
  const [attention, setAttention] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowLeaveRef = useRef(false);
  const pathnameRef = useRef(pathname);

  const syncFromRegistration = useCallback(
    (registration: UnsavedChangesRegistration | null) => {
      registrationRef.current = registration;
      setDirty(Boolean(registration?.dirty));
      setSaving(Boolean(registration?.saving));
      setLabel(registration?.label?.trim() || "Unsaved changes");
    },
    []
  );

  const register = useCallback(
    (registration: UnsavedChangesRegistration | null) => {
      syncFromRegistration(registration);
    },
    [syncFromRegistration]
  );

  const pulseAttention = useCallback(() => {
    setShaking(true);
    setAttention(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (attentionTimerRef.current) clearTimeout(attentionTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShaking(false), 520);
    attentionTimerRef.current = setTimeout(() => setAttention(false), 900);
  }, []);

  const requestLeave = useCallback(
    (href?: string) => {
      if (!registrationRef.current?.dirty || allowLeaveRef.current) {
        if (href) {
          allowLeaveRef.current = true;
          router.push(href);
        }
        return true;
      }
      pulseAttention();
      return false;
    },
    [pulseAttention, router]
  );

  const save = useCallback(async () => {
    const current = registrationRef.current;
    if (!current?.dirty || current.saving) return;
    await current.onSave();
  }, []);

  const discard = useCallback(() => {
    registrationRef.current?.onDiscard();
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (attentionTimerRef.current) clearTimeout(attentionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (allowLeaveRef.current) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-unsaved-changes-bar]")) return;

      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalNavigationHref(href)) return;

      let nextPath = href;
      try {
        const url = new URL(href, window.location.origin);
        nextPath = `${url.pathname}${url.search}${url.hash}`;
      } catch {
        /* keep href */
      }

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      pulseAttention();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, pulseAttention]);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    allowLeaveRef.current = false;
    // Leaving the registering screen clears registration via unmount cleanup.
  }, [pathname]);

  const value = useMemo(
    () => ({
      dirty,
      saving,
      label,
      shaking,
      attention,
      register,
      save,
      discard,
      requestLeave,
    }),
    [
      dirty,
      saving,
      label,
      shaking,
      attention,
      register,
      save,
      discard,
      requestLeave,
    ]
  );

  return (
    <StaffUnsavedChangesContext.Provider value={value}>
      {children}
    </StaffUnsavedChangesContext.Provider>
  );
}

export function useStaffUnsavedChanges() {
  const context = useContext(StaffUnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useStaffUnsavedChanges must be used within StaffUnsavedChangesProvider"
    );
  }
  return context;
}

/** Register the current screen’s dirty save/discard handlers with the top bar. */
export function useRegisterUnsavedChanges(
  registration: UnsavedChangesRegistration | null
) {
  const { register } = useStaffUnsavedChanges();
  const onSaveRef = useRef(registration?.onSave);
  const onDiscardRef = useRef(registration?.onDiscard);

  onSaveRef.current = registration?.onSave;
  onDiscardRef.current = registration?.onDiscard;

  const active = registration != null;
  const dirty = registration?.dirty ?? false;
  const saving = registration?.saving ?? false;
  const label = registration?.label;

  useEffect(() => {
    if (!active) {
      register(null);
      return;
    }
    register({
      dirty,
      saving,
      label,
      onSave: () => onSaveRef.current?.(),
      onDiscard: () => onDiscardRef.current?.(),
    });
    return () => register(null);
  }, [active, dirty, saving, label, register]);
}
