import { PortalPreviewLayoutClient } from "@/components/portal/portal-preview-layout-client";

export default async function PortalPreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <PortalPreviewLayoutClient token={decodeURIComponent(token)}>
      {children}
    </PortalPreviewLayoutClient>
  );
}
