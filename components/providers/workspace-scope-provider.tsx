"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createWorkspaceScopePresetId,
  DEFAULT_WORKSPACE_SCOPE,
  loadWorkspaceScope,
  loadWorkspaceScopePresets,
  normalizeWorkspaceScope,
  persistWorkspaceScope,
  persistWorkspaceScopePresets,
  scopesEqual,
  workspaceScopeIsActive,
  type WorkspaceScope,
  type WorkspaceScopePreset,
  type WorkspaceSalesRepFilter,
} from "@/lib/workspace-scope";

type WorkspaceScopeContextValue = {
  scope: WorkspaceScope;
  presets: WorkspaceScopePreset[];
  isActive: boolean;
  panelOpen: boolean;
  currentUserId: string | null;
  setScope: (next: WorkspaceScope) => void;
  patchScope: (patch: Partial<WorkspaceScope>) => void;
  setSalesRep: (salesRep: WorkspaceSalesRepFilter) => void;
  setCustomer: (customerId: string | null, customerName?: string | null) => void;
  clearScope: () => void;
  applyScope: (next: WorkspaceScope | null | undefined) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  savePreset: (name: string) => WorkspaceScopePreset | null;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
};

const WorkspaceScopeContext =
  createContext<WorkspaceScopeContextValue | null>(null);

export function WorkspaceScopeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const tenantId =
    profile?.type === "staff" || profile?.type === "portal"
      ? profile.tenant.id
      : null;
  const userId = profile?.type === "staff" ? profile.user.id : null;

  const [scope, setScopeState] = useState<WorkspaceScope>(
    DEFAULT_WORKSPACE_SCOPE
  );
  const [presets, setPresets] = useState<WorkspaceScopePreset[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !userId) {
      setScopeState(DEFAULT_WORKSPACE_SCOPE);
      setPresets([]);
      setHydratedKey(null);
      return;
    }
    const key = `${tenantId}:${userId}`;
    setScopeState(loadWorkspaceScope(tenantId, userId));
    setPresets(loadWorkspaceScopePresets(tenantId, userId));
    setHydratedKey(key);
  }, [tenantId, userId]);

  useEffect(() => {
    if (!tenantId || !userId || !hydratedKey) return;
    if (hydratedKey !== `${tenantId}:${userId}`) return;
    persistWorkspaceScope(tenantId, userId, scope);
  }, [scope, tenantId, userId, hydratedKey]);

  useEffect(() => {
    if (!tenantId || !userId || !hydratedKey) return;
    if (hydratedKey !== `${tenantId}:${userId}`) return;
    persistWorkspaceScopePresets(tenantId, userId, presets);
  }, [presets, tenantId, userId, hydratedKey]);

  const setScope = useCallback((next: WorkspaceScope) => {
    setScopeState(normalizeWorkspaceScope(next));
  }, []);

  const patchScope = useCallback((patch: Partial<WorkspaceScope>) => {
    setScopeState((current) =>
      normalizeWorkspaceScope({ ...current, ...patch })
    );
  }, []);

  const setSalesRep = useCallback((salesRep: WorkspaceSalesRepFilter) => {
    setScopeState((current) =>
      normalizeWorkspaceScope({ ...current, salesRep })
    );
  }, []);

  const setCustomer = useCallback(
    (customerId: string | null, customerName?: string | null) => {
      setScopeState((current) =>
        normalizeWorkspaceScope({
          ...current,
          customerId,
          customerName: customerId ? customerName ?? current.customerName : null,
        })
      );
    },
    []
  );

  const clearScope = useCallback(() => {
    setScopeState({ ...DEFAULT_WORKSPACE_SCOPE });
  }, []);

  const applyScope = useCallback((next: WorkspaceScope | null | undefined) => {
    if (next == null) return;
    setScopeState(normalizeWorkspaceScope(next));
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => !open);
  }, []);

  const savePreset = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) return null;
      const preset: WorkspaceScopePreset = {
        id: createWorkspaceScopePresetId(),
        name: trimmed,
        scope: normalizeWorkspaceScope(scope),
        createdAt: new Date().toISOString(),
      };
      setPresets((current) => {
        const withoutDupName = current.filter(
          (entry) => entry.name.toLowerCase() !== trimmed.toLowerCase()
        );
        return [preset, ...withoutDupName].slice(0, 12);
      });
      return preset;
    },
    [scope]
  );

  const deletePreset = useCallback((id: string) => {
    setPresets((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const applyPreset = useCallback(
    (id: string) => {
      const preset = presets.find((entry) => entry.id === id);
      if (!preset) return;
      setScopeState(normalizeWorkspaceScope(preset.scope));
    },
    [presets]
  );

  const value = useMemo<WorkspaceScopeContextValue>(
    () => ({
      scope,
      presets,
      isActive: workspaceScopeIsActive(scope),
      panelOpen,
      currentUserId: userId,
      setScope,
      patchScope,
      setSalesRep,
      setCustomer,
      clearScope,
      applyScope,
      setPanelOpen,
      togglePanel,
      savePreset,
      deletePreset,
      applyPreset,
    }),
    [
      scope,
      presets,
      panelOpen,
      userId,
      setScope,
      patchScope,
      setSalesRep,
      setCustomer,
      clearScope,
      applyScope,
      togglePanel,
      savePreset,
      deletePreset,
      applyPreset,
    ]
  );

  return (
    <WorkspaceScopeContext.Provider value={value}>
      {children}
    </WorkspaceScopeContext.Provider>
  );
}

export function useWorkspaceScope() {
  const ctx = useContext(WorkspaceScopeContext);
  if (!ctx) {
    throw new Error("useWorkspaceScope must be used within WorkspaceScopeProvider");
  }
  return ctx;
}

/** Soft hook for optional use outside provider (returns inactive defaults). */
export function useOptionalWorkspaceScope(): WorkspaceScopeContextValue {
  const ctx = useContext(WorkspaceScopeContext);
  return (
    ctx ?? {
      scope: DEFAULT_WORKSPACE_SCOPE,
      presets: [],
      isActive: false,
      panelOpen: false,
      currentUserId: null,
      setScope: () => undefined,
      patchScope: () => undefined,
      setSalesRep: () => undefined,
      setCustomer: () => undefined,
      clearScope: () => undefined,
      applyScope: () => undefined,
      setPanelOpen: () => undefined,
      togglePanel: () => undefined,
      savePreset: () => null,
      deletePreset: () => undefined,
      applyPreset: () => undefined,
    }
  );
}

export function useWorkspaceScopeOrNull() {
  return useContext(WorkspaceScopeContext);
}

export { scopesEqual, workspaceScopeIsActive };
