const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/** Max size of the base64 preview we store on the order in Firestore. */
const MAX_PREVIEW_BYTES = 450 * 1024;

/** Longest edge when compressing large uploads (screenshots, etc.). */
const MAX_DIMENSION = 1600;

/** Files at or below this size are embedded as-is when the data URL fits. */
const DIRECT_EMBED_FILE_BYTES = 200 * 1024;

export function isImageFileName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

export function isImageUpload(file: File): boolean {
  return IMAGE_TYPES.has(file.type) || isImageFileName(file.name);
}

function dataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl.length;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const img = await loadImageFromFile(file);
  const { naturalWidth: width, naturalHeight: height } = img;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  let maxDim = MAX_DIMENSION;

  while (maxDim >= 480) {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (let quality = 0.88; quality >= 0.42; quality -= 0.08) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlByteSize(dataUrl) <= MAX_PREVIEW_BYTES) {
        return dataUrl;
      }
    }

    maxDim = Math.floor(maxDim * 0.72);
  }

  return canvas.toDataURL("image/jpeg", 0.42);
}

export type ImagePreviewResult = {
  previewUrl: string;
  error?: string;
  /** True when a large file was resized/compressed for Firestore storage. */
  compressed?: boolean;
};

/** Max size of a downloadable attachment we embed on the order doc. */
const MAX_ATTACHMENT_BYTES = 700 * 1024;

export type AttachmentReadResult = {
  /** Data URL suitable for download/preview, or empty when it couldn't be stored. */
  dataUrl: string;
  error?: string;
  compressed?: boolean;
};

/**
 * Reads any file (image or document) into a data URL that the team can
 * download directly. Images are compressed via the preview pipeline; other
 * file types (PDF, AI, EPS, etc.) are embedded as-is when small enough.
 */
export async function readAttachmentDataUrl(
  file: File
): Promise<AttachmentReadResult> {
  if (isImageUpload(file)) {
    const result = await readImagePreviewDataUrl(file);
    return {
      dataUrl: result.previewUrl,
      error: result.error,
      compressed: result.compressed,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl) {
    return { dataUrl: "", error: "Could not read this file." };
  }

  if (dataUrlByteSize(dataUrl) > MAX_ATTACHMENT_BYTES) {
    return {
      dataUrl: "",
      error:
        "File is too large to attach here for direct download (max ~700KB). The filename is still saved.",
    };
  }

  return { dataUrl };
}

/** Largest file we send through the upload function (Cloud Run ~32MB cap). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type UploadContent = {
  base64: string;
  contentType: string;
  error?: string;
};

/**
 * Reads a file into raw base64 (no data URL prefix) for upload to Cloud
 * Storage. Works for any file type and supports far larger files than the
 * inline preview path.
 */
export async function readUploadContent(file: File): Promise<UploadContent> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      base64: "",
      contentType: file.type || "application/octet-stream",
      error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. The limit is 20MB — please compress or flatten it and try again.`,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl) {
    return {
      base64: "",
      contentType: file.type || "application/octet-stream",
      error: "Could not read this file.",
    };
  }

  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return {
    base64,
    contentType: file.type || "application/octet-stream",
  };
}

export async function readImagePreviewDataUrl(
  file: File
): Promise<ImagePreviewResult> {
  if (!isImageUpload(file)) {
    return { previewUrl: "" };
  }

  try {
    if (file.size <= DIRECT_EMBED_FILE_BYTES) {
      const previewUrl = await readFileAsDataUrl(file);
      if (previewUrl && dataUrlByteSize(previewUrl) <= MAX_PREVIEW_BYTES) {
        return { previewUrl };
      }
    }

    const previewUrl = await compressImageToDataUrl(file);
    if (!previewUrl) {
      return {
        previewUrl: "",
        error: "Could not read image for preview.",
      };
    }

    if (dataUrlByteSize(previewUrl) > MAX_PREVIEW_BYTES) {
      return {
        previewUrl: "",
        error:
          "Image is too large to store as a preview on this order. Filename is still saved.",
      };
    }

    const compressed = file.size > DIRECT_EMBED_FILE_BYTES;
    return { previewUrl, compressed };
  } catch {
    return { previewUrl: "", error: "Could not read image for preview." };
  }
}
