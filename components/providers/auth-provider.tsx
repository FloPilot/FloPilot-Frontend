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
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { fetchMe, listUserTenants, switchTenant as apiSwitchTenant, type MeResponse } from "@/lib/api";
import { normalizeShopSettings } from "@/lib/shop-settings";
import { resetTenantBrandingOnDocument } from "@/lib/tenant-branding";
import {
  clearTenantBrandingCache,
  persistTenantBrandingCache,
} from "@/lib/tenant-branding-cache";

type AuthContextValue = {
  user: User | null;
  profile: MeResponse | null;
  loading: boolean;
  configured: boolean;
  switchingShop: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (forceTokenRefresh?: boolean) => Promise<MeResponse | null>;
  switchShop: (tenantId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistStaffBranding(me: MeResponse) {
  if (me.type === "staff") {
    const branding = normalizeShopSettings(me.tenant.settings).branding;
    persistTenantBrandingCache(me.tenant.id, branding);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingShop, setSwitchingShop] = useState(false);
  const configured = isFirebaseConfigured();
  /** Bumped when refreshProfile runs so stale onAuthStateChanged handlers cannot overwrite. */
  const profileFetchGeneration = useRef(0);

  const applyProfile = useCallback((me: MeResponse, generation: number) => {
    if (generation !== profileFetchGeneration.current) return;

    setProfile((current) => {
      if (current?.type === "staff" && me.type === "none") {
        return current;
      }
      return me;
    });

    persistStaffBranding(me);
  }, []);

  const resolveStaffSession = useCallback(
    async (token: string, generation: number) => {
      let me = await fetchMe(token);
      if (me.type === "none" && !me.needsRegistration) {
        const { tenants } = await listUserTenants(token);
        if (tenants.length > 0) {
          await apiSwitchTenant(token, tenants[0].tenantId);
          const activeUser = user ?? getFirebaseAuth().currentUser;
          const refreshedToken = await activeUser?.getIdToken(true);
          if (refreshedToken) {
            me = await fetchMe(refreshedToken);
          }
        }
      }
      applyProfile(me, generation);
      return me;
    },
    [user, applyProfile]
  );

  const getIdToken = useCallback(
    async (forceRefresh = false) => {
      const activeUser = user ?? getFirebaseAuth().currentUser;
      if (!activeUser) return null;
      return activeUser.getIdToken(forceRefresh);
    },
    [user]
  );

  const refreshProfile = useCallback(
    async (forceTokenRefresh = false) => {
      const activeUser = user ?? getFirebaseAuth().currentUser;
      if (!activeUser) {
        profileFetchGeneration.current += 1;
        setProfile(null);
        return null;
      }

      const generation = ++profileFetchGeneration.current;
      setLoading(true);

      try {
        const token = await activeUser.getIdToken(forceTokenRefresh);
        if (!token) return null;
        return await resolveStaffSession(token, generation);
      } catch {
        if (generation === profileFetchGeneration.current) {
          setProfile(null);
        }
        return null;
      } finally {
        if (generation === profileFetchGeneration.current) {
          setLoading(false);
        }
      }
    },
    [user, resolveStaffSession]
  );

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        profileFetchGeneration.current += 1;
        setProfile(null);
        setLoading(false);
        return;
      }

      const generation = ++profileFetchGeneration.current;
      setLoading(true);

      try {
        const token = await nextUser.getIdToken(true);
        if (token) {
          await resolveStaffSession(token, generation);
        }
      } catch {
        if (generation === profileFetchGeneration.current) {
          setProfile(null);
        }
      } finally {
        if (generation === profileFetchGeneration.current) {
          setLoading(false);
        }
      }
    });
  }, [configured, applyProfile, resolveStaffSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    setProfile(null);
    clearTenantBrandingCache();
    resetTenantBrandingOnDocument();
  }, []);

  const switchShop = useCallback(
    async (tenantId: string) => {
      if (profile?.type === "staff" && profile.tenant.id === tenantId) {
        return;
      }

      setSwitchingShop(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");

        await apiSwitchTenant(token, tenantId);
        clearTenantBrandingCache();
        resetTenantBrandingOnDocument();
        await refreshProfile(true);
      } finally {
        setSwitchingShop(false);
      }
    },
    [profile, getIdToken, refreshProfile]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured,
      switchingShop,
      getIdToken,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      switchShop,
    }),
    [
      user,
      profile,
      loading,
      configured,
      switchingShop,
      getIdToken,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      switchShop,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
