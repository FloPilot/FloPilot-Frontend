import {
  applyBrandingCssVars,
  BRANDING_CSS_VAR_KEYS,
  BRANDING_STYLE_ID,
  getBrandingCssVars,
  type TenantBranding,
} from "@/lib/tenant-branding";

const STORAGE_KEY = "flopilot:tenant-branding";
export const BRANDING_COOKIE_NAME = "flopilot-branding-vars";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type BrandingCache = {
  tenantId: string;
  vars: Record<string, string>;
};

function setBrandingCookie(vars: Record<string, string>): void {
  const value = encodeURIComponent(JSON.stringify(vars));
  document.cookie = `${BRANDING_COOKIE_NAME}=${value};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function clearBrandingCookie(): void {
  document.cookie = `${BRANDING_COOKIE_NAME}=;path=/;max-age=0`;
}

export function persistTenantBrandingCache(
  tenantId: string,
  branding: TenantBranding
): void {
  if (typeof window === "undefined") return;

  const payload: BrandingCache = {
    tenantId,
    vars: getBrandingCssVars(branding),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setBrandingCookie(payload.vars);
  } catch {
    // Storage unavailable — cookie/local cache skipped; controller applies live branding.
  }
}

export function readTenantBrandingCache(): BrandingCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BrandingCache;
    if (!data?.vars || typeof data.vars !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function clearTenantBrandingCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    clearBrandingCookie();
  } catch {
    // ignore
  }
}

export function restoreTenantBrandingFromCache(): boolean {
  const cached = readTenantBrandingCache();
  if (!cached?.vars) return false;
  applyBrandingCssVars(cached.vars);
  setBrandingCookie(cached.vars);
  return true;
}

const LEGACY_INLINE_KEYS = BRANDING_CSS_VAR_KEYS.map((k) => `"${k}"`).join(",");

/** Client fallback on /app and /station only — runs before React hydrates. */
export const TENANT_BRANDING_BOOTSTRAP = `(function(){try{var p=location.pathname;if(p.indexOf("/app")!==0&&p.indexOf("/station")!==0)return;var root=document.documentElement;var legacy=[${LEGACY_INLINE_KEYS}];for(var i=0;i<legacy.length;i++)root.style.removeProperty(legacy[i]);var raw=localStorage.getItem("${STORAGE_KEY}");if(!raw)return;var data=JSON.parse(raw);if(!data||!data.vars)return;var css=":root{";for(var k in data.vars){if(Object.prototype.hasOwnProperty.call(data.vars,k))css+=k+":"+data.vars[k]+";"}css+="}";var el=document.getElementById("${BRANDING_STYLE_ID}");if(!el){el=document.createElement("style");el.id="${BRANDING_STYLE_ID}";document.head.appendChild(el);}el.textContent=css;var cookieVal=encodeURIComponent(JSON.stringify(data.vars));document.cookie="${BRANDING_COOKIE_NAME}="+cookieVal+";path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax";}catch(e){}})();`;
