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
import { fetchMe, type MeResponse } from "@/lib/api";
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
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (forceTokenRefresh?: boolean) => Promise<MeResponse | null>;
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

  const getIdToken = useCallback(
    async (forceRefresh = false) => {
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    [user]
  );

  const refreshProfile = useCallback(
    async (forceTokenRefresh = false) => {
      if (!user) {
        profileFetchGeneration.current += 1;
        setProfile(null);
        return null;
      }

      const generation = ++profileFetchGeneration.current;

      try {
        const token = await user.getIdToken(forceTokenRefresh);
        if (!token) return null;
        const me = await fetchMe(token);
        applyProfile(me, generation);
        return me;
      } catch {
        if (generation === profileFetchGeneration.current) {
          setProfile(null);
        }
        return null;
      }
    },
    [user, applyProfile]
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

      const generation = profileFetchGeneration.current;

      try {
        const token = await nextUser.getIdToken(true);
        if (token) {
          const me = await fetchMe(token);
          applyProfile(me, generation);
        }
      } catch {
        if (generation === profileFetchGeneration.current) {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
  }, [configured, applyProfile]);

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

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured,
      getIdToken,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      configured,
      getIdToken,
      signIn,
      signUp,
      signOut,
      refreshProfile,
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
