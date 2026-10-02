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
  /**
   * When true, in-page tab switches may proceed while this surface is dirty
   * because state is kept in a parent that stays mounted.
   */
  persistAcrossTabs?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
};

type LeaveOptions = {
  /** Soft tab/section switch — only blocks drafts that do not persist across tabs. */
  inPage?: boolean;
  /** Use router.replace instead of push when navigation is allowed. */
  replace?: boolean;
};

type StaffUnsavedChangesContextValue = {
  dirty: boolean;
  saving: boolean;
  label: string;
  shaking: boolean;
  attention: boolean;
  /** Register or clear a named surface. Multiple surfaces can be dirty at once. */
  register: (
    id: string,
    registration: UnsavedChangesRegistration | null
  ) => void;
  save: () => Promise<void>;
  discard: () => void;
  /**
   * Flash + shake the save bar when leave is blocked.
   * Pass href to navigate after the check passes.
   * Returns false when leave is blocked.
   */
  requestLeave: (href?: string, options?: LeaveOptions) => boolean;
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

function resolveNextPath(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function summarizeRegistrations(
  entries: Map<string, UnsavedChangesRegistration>
) {
  const list = [...entries.values()];
  const dirtyEntries = list.filter((entry) => entry.dirty);
  const dirty = dirtyEntries.length > 0;
  const saving = list.some((entry) => entry.saving);
  const labels = [
    ...new Set(
      dirtyEntries
        .map((entry) => entry.label?.trim())
        .filter((label): label is string => Boolean(label))
    ),
  ];
  const label =
    labels.length === 0
      ? "Unsaved changes"
      : labels.length === 1
        ? labels[0]
        : `${labels.length} unsaved sections`;
  return { dirty, saving, label, dirtyEntries };
}

function isInPageHref(href: string): boolean {
  try {
    const next = new URL(href, window.location.origin);
    return next.pathname === window.location.pathname;
  } catch {
    return false;
  }
}

export function StaffUnsavedChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const registrationsRef = useRef(
    new Map<string, UnsavedChangesRegistration>()
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("Unsaved changes");
  const [shaking, setShaking] = useState(false);
  const [attention, setAttention] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowLeaveRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const dirtyRef = useRef(false);
  const lockedPathRef = useRef<string | null>(null);

  const syncFromRegistrations = useCallback(() => {
    const summary = summarizeRegistrations(registrationsRef.current);
    dirtyRef.current = summary.dirty;
    setDirty(summary.dirty);
    setSaving(summary.saving);
    setLabel(summary.label);
  }, []);

  const register = useCallback(
    (id: string, registration: UnsavedChangesRegistration | null) => {
      if (!registration) {
        registrationsRef.current.delete(id);
      } else {
        registrationsRef.current.set(id, registration);
      }
      syncFromRegistrations();
    },
    [syncFromRegistrations]
  );

  const pulseAttention = useCallback(() => {
    setShaking(true);
    setAttention(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (attentionTimerRef.current) clearTimeout(attentionTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShaking(false), 520);
    attentionTimerRef.current = setTimeout(() => setAttention(false), 900);
  }, []);

  const getBlockingEntries = useCallback((inPage?: boolean) => {
    const { dirtyEntries } = summarizeRegistrations(registrationsRef.current);
    return inPage
      ? dirtyEntries.filter((entry) => !entry.persistAcrossTabs)
      : dirtyEntries;
  }, []);

  const requestLeave = useCallback(
    (href?: string, options?: LeaveOptions) => {
      const inPage =
        options?.inPage === true ||
        (Boolean(href) && typeof window !== "undefined" && isInPageHref(href!));
      const blockingEntries = getBlockingEntries(inPage);
      if (blockingEntries.length === 0 || allowLeaveRef.current) {
        if (href) {
          allowLeaveRef.current = true;
          if (options?.replace) {
            router.replace(href);
          } else {
            router.push(href);
          }
        } else if (!inPage) {
          // Allow a follow-up history.back() / programmatic leave.
          allowLeaveRef.current = true;
        }
        return true;
      }
      pulseAttention();
      return false;
    },
    [getBlockingEntries, pulseAttention, router]
  );

  const saveInFlightRef = useRef(false);

  const save = useCallback(async () => {
    if (saveInFlightRef.current) return;
    const { dirtyEntries } = summarizeRegistrations(registrationsRef.current);
    if (dirtyEntries.length === 0) return;
    saveInFlightRef.current = true;
    try {
      for (const entry of dirtyEntries) {
        await entry.onSave();
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, []);

  const discard = useCallback(() => {
    if (saveInFlightRef.current) return;
    const { dirtyEntries } = summarizeRegistrations(registrationsRef.current);
    for (const entry of dirtyEntries) {
      entry.onDiscard();
    }
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

  // Capture-phase click guard for Next.js <Link> and plain anchors.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || allowLeaveRef.current) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-unsaved-changes-bar]")) return;
      if (target?.closest?.("[data-allow-unsaved-leave]")) return;

      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalNavigationHref(href)) return;

      const nextPath = resolveNextPath(href);
      if (nextPath === currentPath()) return;

      const inPage = isInPageHref(href);
      if (getBlockingEntries(inPage).length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      // Stop Next.js Link from also handling the event.
      event.stopImmediatePropagation?.();
      pulseAttention();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [getBlockingEntries, pulseAttention]);

  // Browser back/forward while dirty — restore the locked URL and shake the bar.
  useEffect(() => {
    if (!dirty) {
      lockedPathRef.current = null;
      return;
    }

    if (!lockedPathRef.current) {
      lockedPathRef.current = currentPath();
    }
    const locked = lockedPathRef.current;

    const onPopState = () => {
      if (allowLeaveRef.current) return;
      if (getBlockingEntries(false).length === 0) return;
      window.history.pushState(null, "", locked);
      pulseAttention();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dirty, getBlockingEntries, pulseAttention]);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    allowLeaveRef.current = false;
    if (!dirtyRef.current) {
      lockedPathRef.current = null;
    }
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

/** Soft access for chrome shared with portal (no unsaved provider there). */
export function useOptionalStaffUnsavedChanges() {
  return useContext(StaffUnsavedChangesContext);
}

/** Register the current screen’s dirty save/discard handlers with the top bar. */
export function useRegisterUnsavedChanges(
  registration: UnsavedChangesRegistration | null,
  id = "default"
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
  const persistAcrossTabs = registration?.persistAcrossTabs;

  useEffect(() => {
    if (!active) {
      register(id, null);
      return;
    }
    register(id, {
      dirty,
      saving,
      label,
      persistAcrossTabs,
      onSave: () => onSaveRef.current?.(),
      onDiscard: () => onDiscardRef.current?.(),
    });
    return () => register(id, null);
  }, [id, active, dirty, saving, label, persistAcrossTabs, register]);
}
