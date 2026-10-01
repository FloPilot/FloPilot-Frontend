"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOptionalStaffUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";

type GuardedNavigateOptions = {
  /** Soft in-page switch (tabs) — only blocks non-persistAcrossTabs drafts. */
  inPage?: boolean;
  replace?: boolean;
};

/**
 * Staff-app router that refuses to leave while the unsaved save bar is active.
 * Outside StaffUnsavedChangesProvider (e.g. portal chrome) it behaves like
 * the normal Next.js router and always allows navigation.
 */
export function useGuardedRouter() {
  const router = useRouter();
  const unsaved = useOptionalStaffUnsavedChanges();

  return useMemo(() => {
    const push = (href: string, options?: GuardedNavigateOptions) => {
      if (!unsaved) {
        if (options?.replace) router.replace(href);
        else router.push(href);
        return true;
      }
      return unsaved.requestLeave(href, {
        inPage: options?.inPage,
        replace: options?.replace === true,
      });
    };

    return {
      prefetch: router.prefetch.bind(router),
      refresh: router.refresh.bind(router),
      forward: router.forward.bind(router),
      back: () => {
        if (unsaved && !unsaved.requestLeave()) return false;
        router.back();
        return true;
      },
      push,
      replace: (href: string, options?: GuardedNavigateOptions) =>
        push(href, { ...options, replace: true }),
    };
  }, [router, unsaved]);
}
