import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTeamPortalHost, TEAM_PORTAL_PATH_PREFIX } from "@/lib/team-portal";

const PUBLIC_TEAM_PATHS = new Set([
  `${TEAM_PORTAL_PATH_PREFIX}/login`,
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (isTeamPortalHost(host)) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith(TEAM_PORTAL_PATH_PREFIX)) {
      const response = NextResponse.next();
      response.headers.set("x-pathname", pathname);
      response.headers.set("x-team-portal", "1");
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/"
        ? TEAM_PORTAL_PATH_PREFIX
        : `${TEAM_PORTAL_PATH_PREFIX}${pathname}`;

    const response = NextResponse.rewrite(url);
    response.headers.set("x-pathname", url.pathname);
    response.headers.set("x-team-portal", "1");
    return response;
  }

  if (
    pathname.startsWith(TEAM_PORTAL_PATH_PREFIX) &&
    !PUBLIC_TEAM_PATHS.has(pathname)
  ) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
