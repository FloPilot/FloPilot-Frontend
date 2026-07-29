import { redirect } from "next/navigation";

export default async function CustomerPortalTokenSectionRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/portal/c/${encodeURIComponent(token)}`);
}
