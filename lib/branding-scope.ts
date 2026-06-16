/** Routes where the signed-in shop's white-label branding is active. */
export function isStaffBrandedRoute(pathname: string): boolean {
  return pathname.startsWith("/app") || pathname.startsWith("/station");
}
