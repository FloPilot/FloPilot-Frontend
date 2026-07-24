/** Sample corner pixels from a product mockup to match card backgrounds. */

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function sampleImageCornerColor(
  imageUrl: string
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!imageUrl || typeof window === "undefined") {
      resolve(null);
      return;
    }

    const image = new Image();
    image.decoding = "async";
    // Only request CORS for remote URLs. Displayed <img> tags must not set
    // crossOrigin or GCS/CDN assets without CORS headers will fail to render.
    if (/^https?:\/\//i.test(imageUrl)) {
      image.crossOrigin = "anonymous";
    }

    const finish = (color: string | null) => resolve(color);

    image.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(image, 0, 0, size, size);
        const samples = [
          [2, 2],
          [size - 3, 2],
          [2, size - 3],
          [size - 3, size - 3],
          [size / 2, 2],
          [2, size / 2],
        ] as const;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (const [x, y] of samples) {
          const data = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
          if (data[3] < 16) continue;
          r += data[0];
          g += data[1];
          b += data[2];
          count += 1;
        }
        if (!count) {
          finish(null);
          return;
        }
        finish(rgbToHex(r / count, g / count, b / count));
      } catch {
        finish(null);
      }
    };

    image.onerror = () => finish(null);
    image.src = imageUrl;
  });
}
