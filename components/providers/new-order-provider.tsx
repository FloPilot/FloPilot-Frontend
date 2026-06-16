"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { NewOrderDialog } from "@/components/orders/new-order-dialog";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type OpenNewOrderOptions = {
  customerId?: string;
  onCreated?: (order: Order) => void;
};

type NewOrderContextValue = {
  openNewOrder: (options?: OpenNewOrderOptions) => void;
};

const NewOrderContext = createContext<NewOrderContextValue | null>(null);

export function NewOrderProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>();
  const [onCreatedOverride, setOnCreatedOverride] = useState<
    ((order: Order) => void) | undefined
  >();

  const openNewOrder = useCallback((options?: OpenNewOrderOptions) => {
    setInitialCustomerId(options?.customerId);
    setOnCreatedOverride(() => options?.onCreated);
    setOpen(true);
  }, []);

  const handleCreated = useCallback(
    (order: Order) => {
      if (onCreatedOverride) {
        onCreatedOverride(order);
      } else {
        router.push(`/app/orders/${order.id}`);
      }
    },
    [onCreatedOverride, router]
  );

  const value = useMemo(() => ({ openNewOrder }), [openNewOrder]);

  return (
    <NewOrderContext.Provider value={value}>
      {children}
      <NewOrderDialog
        open={open}
        onOpenChange={setOpen}
        initialCustomerId={initialCustomerId}
        onCreated={handleCreated}
      />
    </NewOrderContext.Provider>
  );
}

export function useNewOrder() {
  const context = useContext(NewOrderContext);
  if (!context) {
    throw new Error("useNewOrder must be used within NewOrderProvider");
  }
  return context;
}

export function NewOrderButton({
  customerId,
  label = "New order",
  className,
  variant = "default",
  size = "default",
  showIcon = true,
  onOpen,
}: {
  customerId?: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
  onOpen?: () => void;
}) {
  const { openNewOrder } = useNewOrder();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      onClick={() => {
        onOpen?.();
        openNewOrder(customerId ? { customerId } : undefined);
      }}
    >
      {showIcon && <Plus className="size-4" />}
      {label}
    </Button>
  );
}
