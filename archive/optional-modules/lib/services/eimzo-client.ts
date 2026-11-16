/**
 * Browser E-IMZO WebSocket Agent (CAPIWS) client for Uzbekistan digital signatures (ERI / E-IMZO).
 * Connects to local E-IMZO desktop agent running at 127.0.0.1:64443 (wss) or 127.0.0.1:64646 (ws).
 */

export interface EImzoCertificate {
  disk: string;
  path: string;
  name: string;
  alias: string;
  serialNumber: string;
  fullName: string;
  tin: string;
  org: string;
  validFrom: string;
  validTo: string;
}

function parseAliasField(alias: string, key: string): string {
  const match = alias.match(new RegExp(`(?:^|,)${key}=([^,]+)`, "i"));
  return match ? match[1].trim() : "";
}

function callCapiWs(payload: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      reject(new Error("E-IMZO faqat brauzer muhitida ishlaydi."));
      return;
    }

    const endpoint =
      window.location.protocol === "https:"
        ? "wss://127.0.0.1:64443/service/cryptapi"
        : "ws://127.0.0.1:64646/service/cryptapi";

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          ws.close();
        } catch {}
        reject(
          new Error(
            "E-IMZO agentiga ulanish vaqti tugadi. Kompyuteringizda E-IMZO dasturi ishga tushirilganligini tekshiring."
          )
        );
      }
    }, 6000);

    const ws = new WebSocket(endpoint);

    ws.onopen = () => {
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const res = JSON.parse(event.data);
        ws.close();
        if (res.success === false) {
          reject(new Error(res.reason || "E-IMZO amaliyoti bekor qilindi yoki xatolik yuz berdi."));
        } else {
          resolve(res);
        }
      } catch {
        reject(new Error("E-IMZO javobini oʻqib boʻlmadi."));
      }
    };

    ws.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          "E-IMZO agentiga (127.0.0.1) ulanib boʻlmadi. E-IMZO dasturini ishga tushiring yoki Email/Google orqali kiring."
        )
      );
    };
  });
}

export async function listEImzoCertificates(): Promise<EImzoCertificate[]> {
  const res = await callCapiWs({
    plugin: "pfx",
    name: "list_all_certificates",
  });

  const rawList: any[] = res?.certificates || [];
  return rawList.map((c) => {
    const alias = String(c.alias || "");
    return {
      disk: String(c.disk || ""),
      path: String(c.path || ""),
      name: String(c.name || ""),
      alias,
      serialNumber: parseAliasField(alias, "serialnumber") || String(c.serialNumber || ""),
      fullName: parseAliasField(alias, "cn") || String(c.name || "Foydalanuvchi"),
      tin: parseAliasField(alias, "1.2.860.3.16.1.1") || parseAliasField(alias, "uid") || "",
      org: parseAliasField(alias, "o") || "Jismoniy shaxs / YATT",
      validFrom: parseAliasField(alias, "validfrom") || "",
      validTo: parseAliasField(alias, "validto") || "",
    };
  });
}

export async function signWithEImzoCertificate(
  cert: EImzoCertificate,
  plainTextPayload: string
): Promise<{ pkcs7: string; signerSerial: string; signerName: string }> {
  const keyLoad = await callCapiWs({
    plugin: "pfx",
    name: "load_key",
    arguments: [cert.disk, cert.path, cert.name, cert.alias],
  });

  const keyId = keyLoad?.keyId;
  if (!keyId) {
    throw new Error("E-IMZO kalitini yuklab boʻlmadi (parol notoʻgʻri yoki bekor qilindi).");
  }

  const base64Data =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(plainTextPayload)))
      : Buffer.from(plainTextPayload, "utf-8").toString("base64");

  const signRes = await callCapiWs({
    plugin: "pkcs7",
    name: "create_pkcs7",
    arguments: [base64Data, keyId, "no"],
  });

  const pkcs7 = signRes?.pkcs7_64;
  if (!pkcs7) {
    throw new Error("PKCS#7 elektron raqamli imzo yaratib boʻlmadi.");
  }

  return {
    pkcs7: String(pkcs7),
    signerSerial: cert.serialNumber,
    signerName: cert.fullName,
  };
}
