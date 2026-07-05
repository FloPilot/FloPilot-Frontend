import { CustomerPortalLayoutClient } from "@/components/portal/customer-portal-layout-client";

export default async function CustomerPortalTokenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <CustomerPortalLayoutClient token={decodeURIComponent(token)}>
      {children}
    </CustomerPortalLayoutClient>
  );
}
