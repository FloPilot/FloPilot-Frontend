import { PortalClaimPageClient } from "@/components/portal/portal-claim-page-client";

export default async function CustomerPortalInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PortalClaimPageClient token={decodeURIComponent(token)} />;
}
