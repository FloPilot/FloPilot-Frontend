import { redirect } from "next/navigation";
import { teamPortalRedirectPath } from "@/lib/team-portal";

/** @deprecated Team portal lives at admin.flopilot.io — kept as a redirect. */
export default function TeamMembersRedirectPage() {
  redirect(teamPortalRedirectPath("/members"));
}
