import { redirect } from "next/navigation";

export default async function CustomerPortalTokenOrderRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token, orderId } = await params;
  const query = await searchParams;
  const nextParams = new URLSearchParams();
  nextParams.set("orderId", orderId);
  for (const key of ["view", "focus"] as const) {
    const value = query[key];
    if (typeof value === "string") nextParams.set(key, value);
  }
  redirect(
    `/portal/c/${encodeURIComponent(token)}?${nextParams.toString()}`
  );
}
