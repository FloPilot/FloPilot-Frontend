import { CustomerPortalOrderPageClient } from "@/components/portal/customer-portal-order-page-client";

export default async function CustomerPortalOrderPage({
  params,
}: {
  params: Promise<{ token: string; orderId: string }>;
}) {
  const { orderId } = await params;
  return <CustomerPortalOrderPageClient orderId={decodeURIComponent(orderId)} />;
}
