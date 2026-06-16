"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNewOrder } from "@/components/providers/new-order-provider";

export default function NewOrderRedirectPage() {
  const router = useRouter();
  const { openNewOrder } = useNewOrder();

  useEffect(() => {
    const customerId =
      new URLSearchParams(window.location.search).get("customer") ?? undefined;

    openNewOrder(customerId ? { customerId } : undefined);
    router.replace(customerId ? `/app/customers/${customerId}` : "/app/orders");
  }, [openNewOrder, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-brand-muted">
      Opening new order…
    </div>
  );
}
