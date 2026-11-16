import { computeSha256Hex } from "@/lib/utils/image-compression";

/**
 * Computes a deterministic, non-PII device hash used strictly to prevent
 * repeated free-trial abuse from the same device across throwaway accounts.
 */
export async function getClientDeviceHash(): Promise<string | undefined> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return undefined;
  }
  try {
    let deviceToken = "";
    try {
      deviceToken = window.localStorage?.getItem("firmus_device_token") || "";
      if (!deviceToken) {
        deviceToken =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        window.localStorage?.setItem("firmus_device_token", deviceToken);
      }
    } catch {
      // Private mode or storage disabled
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const screenInfo =
      typeof screen !== "undefined" ? `${screen.width}x${screen.height}x${screen.colorDepth}` : "";
    const raw = [
      deviceToken,
      navigator.userAgent || "",
      navigator.language || "",
      navigator.platform || "",
      String(navigator.hardwareConcurrency || ""),
      screenInfo,
      tz,
    ].join("|");
    return await computeSha256Hex(raw);
  } catch {
    return undefined;
  }
}
