"use client";

import type { CSSProperties } from "react";
import type { PublicClientStoreProduct } from "@/lib/client-stores";
import { getProductCardImages } from "@/lib/client-stores";
import { cn } from "@/lib/utils";

/**
 * Product grid media with a Shopify-style hover: clean crossfade from
 * front mockup to back (when a distinct back image exists). No lift/scale.
 */
export function StoreProductCardMedia({
  product,
  className,
  style,
  paddingClassName = "p-4",
}: {
  product: PublicClientStoreProduct;
  className?: string;
  style?: CSSProperties;
  paddingClassName?: string;
}) {
  const { front, back } = getProductCardImages(product);
  const hasBack = Boolean(back);

  if (!front) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white text-[12px] text-[#8a8a8a]",
          className
        )}
        style={style}
      >
        No image
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl bg-white",
        className
      )}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={front}
        alt=""
        className={cn(
          "size-full object-contain transition-opacity duration-300 ease-out",
          paddingClassName,
          hasBack && "group-hover:opacity-0"
        )}
      />
      {hasBack ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={back}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 size-full object-contain opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100",
            paddingClassName
          )}
        />
      ) : null}
    </div>
  );
}
