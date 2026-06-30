"use client";

import { useEffect, useState } from "react";

/**
 * Samples the border pixels of an image to estimate the background color
 * behind the subject (e.g. the area around a centered shirt mockup), so a
 * container can blend seamlessly with the artwork instead of showing grey.
 *
 * Returns null while loading, on failure, or for cross-origin (tainted) images
 * — callers should fall back to their default background in that case.
 */
export function useImageBackgroundColor(src?: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    setColor(null);
    if (!src || typeof window === "undefined") return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        const sample = (x: number, y: number) => {
          const i = (y * size + x) * 4;
          if (data[i + 3] < 200) return; // ignore transparent edges
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        };
        for (let x = 0; x < size; x++) {
          sample(x, 0);
          sample(x, size - 1);
        }
        for (let y = 0; y < size; y++) {
          sample(0, y);
          sample(size - 1, y);
        }

        if (count > 0) {
          setColor(
            `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(
              b / count
            )})`
          );
        }
      } catch {
        // Tainted canvas (cross-origin without CORS) — keep default background.
      }
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}
