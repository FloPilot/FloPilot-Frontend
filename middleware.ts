import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getShopSubdomain,
  looksLikeStoreShareJwt,
} from "@/lib/shop-store-host";
import {
  adminPathFromTeamRequest,
  getAdminPortalUrl,
  isTeamPortalHost,
  TEAM_PORTAL_PATH_PREFIX,
} from "@/lib/team-portal";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  const shopSubdomain = getShopSubdomain(host);
  if (shopSubdomain) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // {shop}.flopilot.io/store/{storeSlug} → /store/{shop}/{storeSlug}
    const storeMatch = pathname.match(/^\/store\/([^/]+)\/?$/);
    if (storeMatch?.[1] && !looksLikeStoreShareJwt(storeMatch[1])) {
      const url = request.nextUrl.clone();
      url.pathname = `/store/${encodeURIComponent(shopSubdomain)}/${encodeURIComponent(storeMatch[1])}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // Legacy team host + /team/* → standalone admin app
  if (
    isTeamPortalHost(host) ||
    pathname === TEAM_PORTAL_PATH_PREFIX ||
    pathname.startsWith(`${TEAM_PORTAL_PATH_PREFIX}/`)
  ) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const adminPath = adminPathFromTeamRequest(pathname);
    const target = new URL(`${getAdminPortalUrl()}${adminPath}${search}`);
    return NextResponse.redirect(target, 308);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
