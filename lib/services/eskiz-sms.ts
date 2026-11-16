import "server-only";

interface EskizTokenCache {
  token: string;
  expiresAtMs: number;
}

let cachedEskizToken: EskizTokenCache | null = null;

export function isEskizConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL?.trim() && process.env.ESKIZ_PASSWORD?.trim());
}

async function loginEskiz(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedEskizToken && cachedEskizToken.expiresAtMs > now + 60_000) {
    return cachedEskizToken.token;
  }

  const email = process.env.ESKIZ_EMAIL?.trim();
  const password = process.env.ESKIZ_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Eskiz.uz SMS xizmati kalitlari (ESKIZ_EMAIL / ESKIZ_PASSWORD) .env da kiritilmagan.");
  }

  const form = new FormData();
  form.append("email", email);
  form.append("password", password);

  const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(10_000),
  });

  const json = await res.json().catch(() => null);
  const token = json?.data?.token;
  if (!res.ok || !token) {
    throw new Error(json?.message || `Eskiz.uz avtorizatsiya xatosi (HTTP ${res.status})`);
  }

  // Eskiz tokens are valid ~30 days; cache for 24h safely
  cachedEskizToken = {
    token,
    expiresAtMs: now + 24 * 60 * 60 * 1000,
  };
  return token;
}

export async function sendEskizSms(
  normalizedMobilePhone: string,
  message: string
): Promise<{ requestId: string | null }> {
  const from = process.env.ESKIZ_FROM?.trim() || "4546";
  let token = await loginEskiz(false);

  const dispatch = async (bearer: string) => {
    const body = new FormData();
    body.append("mobile_phone", normalizedMobilePhone); // 998XXXXXXXXX without '+'
    body.append("message", message);
    body.append("from", from);

    return fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  };

  let res = await dispatch(token);
  if (res.status === 401) {
    token = await loginEskiz(true);
    res = await dispatch(token);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === "error") {
    throw new Error(json?.message || `Eskiz.uz SMS yuborishda xatolik (HTTP ${res.status})`);
  }

  return {
    requestId: json?.data?.id || json?.id || null,
  };
}
