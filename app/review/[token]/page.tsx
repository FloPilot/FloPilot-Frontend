import { CustomerReviewFlow } from "@/components/review/customer-review-flow";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CustomerReviewFlow token={decodeURIComponent(token)} />;
}
