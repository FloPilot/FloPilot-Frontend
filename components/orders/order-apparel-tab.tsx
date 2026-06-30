"use client";

import { Plus, Shirt, Trash2 } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
} from "@/lib/create-order";
import { formatCurrency } from "@/lib/format";
import {
  buildLineItemFromCatalog,
  createDefaultLineItem,
  guessColorKey,
  guessProductKey,
  lineItemPieceCount,
  orderPieceCount,
  sizesToRecord,
} from "@/lib/line-items";
import type { LineItem, Order } from "@/types";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 rounded-xl border-border/80 bg-white shadow-none";

function GarmentCard({
  orderId,
  item,
  canRemove,
}: {
  orderId: string;
  item: LineItem;
  canRemove: boolean;
}) {
  const { updateOrderLineItem, removeOrderLineItem } = useSchedule();
  const productKey = guessProductKey(item);
  const colorKey = guessColorKey(item);
  const sizeRecord = sizesToRecord(item.sizes);
  const pieces = lineItemPieceCount(item);

  const applyCatalog = (
    nextProductKey: string,
    nextColorKey: string,
    sizes = sizeRecord
  ) => {
    const rebuilt = buildLineItemFromCatalog(
      nextProductKey as (typeof NEW_ORDER_PRODUCTS)[number]["key"],
      nextColorKey as (typeof NEW_ORDER_COLORS)[number]["key"],
      sizes,
      item.id
    );
    updateOrderLineItem(orderId, item.id, rebuilt);
  };

  const updateSize = (size: (typeof NEW_ORDER_SIZES)[number], value: string) => {
    const quantity = Math.max(0, parseInt(value, 10) || 0);
    applyCatalog(productKey, colorKey, {
      ...sizeRecord,
      [size]: quantity,
    });
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-white overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{item.productName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {item.brand} · {item.color}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {pieces} pcs · {formatCurrency(item.unitCost)}/ea
          </span>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (
                  confirm(
                    "Remove this blank garment from the order? Events linked to it will stay, but you may want to re-link them."
                  )
                ) {
                  removeOrderLineItem(orderId, item.id);
                }
              }}
              aria-label="Remove garment"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Blank style</Label>
          <Select
            value={productKey}
            onValueChange={(value) => {
              if (!value) return;
              applyCatalog(value, colorKey);
            }}
          >
            <SelectTrigger className={cn(inputClassName, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEW_ORDER_PRODUCTS.map((product) => (
                <SelectItem key={product.key} value={product.key}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Garment color</Label>
          <Select
            value={colorKey}
            onValueChange={(value) => {
              if (!value) return;
              applyCatalog(productKey, value);
            }}
          >
            <SelectTrigger className={cn(inputClassName, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEW_ORDER_COLORS.map((color) => (
                <SelectItem key={color.key} value={color.key}>
                  {color.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 pb-4 sm:px-5 sm:pb-5">
        <Label className="text-xs text-muted-foreground">Size matrix</Label>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NEW_ORDER_SIZES.map((size) => (
            <div key={size} className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{size}</Label>
              <Input
                type="number"
                min={0}
                value={sizeRecord[size]}
                onChange={(event) => updateSize(size, event.target.value)}
                className={inputClassName}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderApparelTab({ order }: { order: Order }) {
  const { addOrderLineItem } = useSchedule();
  const totalPieces = orderPieceCount(order.lineItems);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm gap-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shirt className="size-4" />
            Blank garments
          </CardTitle>
          <CardDescription>
            {totalPieces} total pieces across {order.lineItems.length} blank
            {order.lineItems.length !== 1 ? "s" : ""}. Adjust styles, colors,
            and quantities here — same fields as when you create the order.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {order.lineItems.map((item) => (
            <GarmentCard
              key={item.id}
              orderId={order.id}
              item={item}
              canRemove={order.lineItems.length > 1}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => addOrderLineItem(order.id, createDefaultLineItem())}
          >
            <Plus className="size-3.5" />
            Add blank garment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
