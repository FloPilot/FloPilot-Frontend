import { redirect } from "next/navigation";
import { teamPortalRedirectPath } from "@/lib/team-portal";

export default function PlatformTicketsPage() {
  redirect(teamPortalRedirectPath("/tickets"));
}
