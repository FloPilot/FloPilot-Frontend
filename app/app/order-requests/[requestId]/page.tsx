import { OrderRequestDetailView } from "@/components/orders/order-request-detail-view";

export default async function OrderRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <OrderRequestDetailView requestId={requestId} />;
}
