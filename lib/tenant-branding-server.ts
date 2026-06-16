import { cookies } from "next/headers";
import { brandingVarsToCss } from "@/lib/tenant-branding";
import { BRANDING_COOKIE_NAME } from "@/lib/tenant-branding-cache";

export function parseBrandingVarsCookie(
  raw: string | undefined
): Record<string, string> | null {
  if (!raw) return null;
  try {
    const vars = JSON.parse(decodeURIComponent(raw)) as Record<string, string>;
    if (!vars || typeof vars !== "object") return null;
    return vars;
  } catch {
    return null;
  }
}

/** Brand CSS for SSR — read from cookie set when the user last loaded settings. */
export async function getServerBrandingStyleContent(): Promise<string | null> {
  const cookieStore = await cookies();
  const vars = parseBrandingVarsCookie(
    cookieStore.get(BRANDING_COOKIE_NAME)?.value
  );
  if (!vars) return null;
  return brandingVarsToCss(vars);
}
