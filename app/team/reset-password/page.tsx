import { redirect } from "next/navigation";
import { getAdminPortalUrl } from "@/lib/team-portal";

/** @deprecated Team portal lives at admin.flopilot.io — kept as a redirect. */
export default async function TeamResetPasswordRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    }
  }
  const query = qs.toString();
  redirect(
    `${getAdminPortalUrl()}/reset-password${query ? `?${query}` : ""}`
  );
}
