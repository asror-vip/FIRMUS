export const ALLOWED_AI_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const AI_IMAGE_FORMAT_ERROR =
  "Rasm formati toʻgʻri emas. Faqat PNG, JPG yoki WEBP rasm yuklang.";

export const MAX_RAW_IMAGE_BYTES = 25 * 1024 * 1024;
const SKIP_COMPRESS_THRESHOLD_BYTES = 350 * 1024;
const MAX_DIMENSION_PX = 1600;
const TARGET_MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;

export interface CompressedImageResult {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}

const IMAGE_EXT_TO_MIME: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function resolveSupportedImageMime(
  file: Pick<File, "type" | "name">
): "image/jpeg" | "image/png" | "image/webp" | null {
  const mime = (file.type || "").toLowerCase().trim();
  if (ALLOWED_AI_IMAGE_MIME_TYPES.has(mime)) {
    return mime as "image/jpeg" | "image/png" | "image/webp";
  }
  if (file.name) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return IMAGE_EXT_TO_MIME[ext] ?? null;
  }
  return null;
}

export function validateImageUpload(
  file: Pick<File, "type" | "name"> & { size?: number }
): { valid: boolean; error?: string; mimeType?: "image/jpeg" | "image/png" | "image/webp" } {
  const mime = resolveSupportedImageMime(file);
  if (!mime) {
    return { valid: false, error: AI_IMAGE_FORMAT_ERROR };
  }
  if (typeof file.size === "number" && file.size > MAX_RAW_IMAGE_BYTES) {
    return { valid: false, error: "Rasm hajmi 25 MB dan oshmasligi kerak" };
  }
  return { valid: true, mimeType: mime };
}

export function isSupportedAiImageFile(
  file: Pick<File, "type" | "name"> | null | undefined
): boolean {
  if (!file) return false;
  return resolveSupportedImageMime(file) !== null;
}

export type ClipboardInspectionResult =
  | { kind: "empty" }
  | { kind: "text" }
  | { kind: "image"; file: File }
  | { kind: "invalid_file"; fileName: string };

export function inspectClipboardPaste(
  clipboardData: DataTransfer | null | undefined
): ClipboardInspectionResult {
  if (!clipboardData) return { kind: "empty" };

  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i += 1) {
      const item = clipboardData.items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (!file) continue;
        if (isSupportedAiImageFile(file)) {
          return { kind: "image", file };
        }
        return { kind: "invalid_file", fileName: file.name || "fayl" };
      }
    }
  }

  if (clipboardData.files && clipboardData.files.length > 0) {
    const file = clipboardData.files[0];
    if (isSupportedAiImageFile(file)) {
      return { kind: "image", file };
    }
    return { kind: "invalid_file", fileName: file.name || "fayl" };
  }

  return { kind: "text" };
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Rasmni oʻqib boʻlmadi"));
    reader.readAsDataURL(blob);
  });
}

function loadHtmlImage(srcUrl: string): Promise<{ width: number; height: number; drawSource: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        drawSource: img,
      });
    img.onerror = () => reject(new Error("Rasm formati shikastlangan yoki oʻqib boʻlmadi"));
    img.src = srcUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Rasmni siqishda xatolik yuz berdi"));
        else resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function compressImageForAi(
  file: File,
  options?: { maxDimension?: number; quality?: number; maxCompressedBytes?: number }
): Promise<CompressedImageResult> {
  const safeMime = resolveSupportedImageMime(file);
  if (!safeMime) {
    throw new Error(AI_IMAGE_FORMAT_ERROR);
  }
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error("Rasm hajmi 25 MB dan oshmasligi kerak");
  }

  const maxDim = options?.maxDimension ?? MAX_DIMENSION_PX;
  const quality = options?.quality ?? 0.82;
  const targetMaxBytes = options?.maxCompressedBytes ?? TARGET_MAX_COMPRESSED_BYTES;

  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  try {
    let width = 0;
    let height = 0;
    let drawSource: CanvasImageSource;

    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      drawSource = bitmap;
    } else {
      objectUrl = URL.createObjectURL(file);
      const loaded = await loadHtmlImage(objectUrl);
      width = loaded.width;
      height = loaded.height;
      drawSource = loaded.drawSource;
    }

    // Fast path: small screenshots / pre-sized images skip canvas re-encoding (~0ms)
    if (file.size <= Math.min(SKIP_COMPRESS_THRESHOLD_BYTES, targetMaxBytes) && width <= maxDim && height <= maxDim) {
      const dataUrl = await readBlobAsDataUrl(file);
      return {
        dataUrl,
        mimeType: safeMime,
        fileName: file.name || `rasm.${safeMime.split("/")[1]}`,
        originalBytes: file.size,
        compressedBytes: file.size,
        width,
        height,
        wasCompressed: false,
      };
    }

    const scale = Math.min(1, maxDim / Math.max(width, height, 1));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Brauzer rasm ishlovchisi ishga tushmadi");
    }

    // White background so transparent PNGs encode cleanly as JPEG without black artifacts
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(drawSource, 0, 0, targetW, targetH);

    let outBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (outBlob.size > targetMaxBytes) {
      outBlob = await canvasToBlob(canvas, "image/jpeg", 0.68);
    }
    if (outBlob.size > targetMaxBytes) {
      outBlob = await canvasToBlob(canvas, "image/jpeg", 0.52);
    }

    // Keep original if somehow already smaller and within bounds
    if (outBlob.size >= file.size && file.size <= targetMaxBytes) {
      const dataUrl = await readBlobAsDataUrl(file);
      return {
        dataUrl,
        mimeType: safeMime,
        fileName: file.name || `rasm.${safeMime.split("/")[1]}`,
        originalBytes: file.size,
        compressedBytes: file.size,
        width,
        height,
        wasCompressed: false,
      };
    }

    const dataUrl = await readBlobAsDataUrl(outBlob);
    const baseName = (file.name || "skrinshot").replace(/\.[^.]+$/, "");
    return {
      dataUrl,
      mimeType: "image/jpeg",
      fileName: `${baseName}.jpg`,
      originalBytes: file.size,
      compressedBytes: outBlob.size,
      width: targetW,
      height: targetH,
      wasCompressed: true,
    };
  } finally {
    if (bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function computeSha256Hex(raw: string): Promise<string | undefined> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return undefined;
    const enc = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
}
