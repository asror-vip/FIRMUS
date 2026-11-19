import net from "node:net";
import type { NextRequest } from "next/server";
import { safeEqualStrings, sha256Hex } from "@/lib/utils/crypto-secrets";
import { sanitizeStorageText } from "@/lib/utils/privacy";

const ODATA_TIMEOUT_MS = 15_000;

export const COMMON_1C_ENTITY_SETS = [
  "Catalog_Контрагенты",
  "Catalog_ДоговорыКонтрагентов",
  "Catalog_Номенклатура",
  "Catalog_БанковскиеСчета",
  "Catalog_ОрганизацииБанковскиеСчета",
  "Document_ПоступлениеНаРасчетныйСчет",
  "Document_СписаниеСРасчетногоСчета",
  "Document_ПоступлениеТоваровУслуг",
  "Document_РеализацияТоваровУслуг",
  "Document_ОперацияБух",
] as const;

export type ODataCatalogType = "counterparty" | "contract" | "nomenclature" | "bank_account";

export interface ODataCatalogItem {
  catalogType: ODataCatalogType;
  externalRefKey: string;
  code: string | null;
  name: string;
  tinStir: string | null;
  rawData: Record<string, unknown>;
}

export interface OneCDraftInput {
  id?: string;
  docType: string;
  docDate?: string;
  amount?: number;
  counterpartyName?: string;
  counterpartyStir?: string;
  counterpartyRefKey?: string;
  contractRefKey?: string;
  description?: string;
  payload?: Record<string, unknown>;
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 127) return true; // Loopback 127.0.0.0/8
  if (a === 169 && b === 254) return true; // Link-local / Cloud metadata 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // Private 172.16.0.0/12
  if (a === 192 && b === 168) return true; // Private 192.168.0.0/16
  if (a >= 224) return true; // Multicast & reserved
  return false;
}

function isBlockedIpv6(rawIp: string): boolean {
  const ip = rawIp.toLowerCase();
  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") {
    return true;
  }
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff")) {
    return true;
  }
  // Handle IPv4-mapped IPv6 e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1
  if (ip.startsWith("::ffff:")) {
    const tail = ip.slice(7);
    if (net.isIPv4(tail)) {
      return isBlockedIpv4(tail);
    }
    const hexMatch = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(tail);
    if (hexMatch) {
      const hi = parseInt(hexMatch[1], 16);
      const lo = parseInt(hexMatch[2], 16);
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isBlockedIpv4(v4);
    }
    return true;
  }
  return false;
}

/**
 * Strictly validates an external 1C OData base URL against SSRF, embedded credentials, and insecure protocols.
 */
export function validateExternalODataUrl(rawUrl: string): URL {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    throw new Error("1C OData manzili (URL) kiritilishi shart.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("1C OData URL manzili notoʻgʻri formatda.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL ichida login yoki parol koʻrsatish taqiqlangan.");
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    if (parsed.protocol !== "https:") {
      throw new Error("Ishlab chiqarish muhitida faqat HTTPS protokoli ruxsat etiladi.");
    }
  } else if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Faqat HTTPS yoki HTTP protokoli ruxsat etiladi.");
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, "").toLowerCase();
  if (!host) {
    throw new Error("OData host nomi boʻsh boʻlishi mumkin emas.");
  }

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain") ||
    host === "metadata" ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Ichki yoki lokal tarmoq manzillariga ulanish xavfsizlik sababli taqiqlangan.");
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    if (isBlockedIpv4(host)) {
      throw new Error("Xususiy yoki loopback IP manzillariga ulanish taqiqlangan.");
    }
  } else if (ipVersion === 6) {
    if (isBlockedIpv6(host)) {
      throw new Error("Xususiy yoki loopback IPv6 manzillariga ulanish taqiqlangan.");
    }
  } else {
    // Reject single-label hostnames or integer/hex IP tricks like http://2130706433 or http://0x7f000001
    if (!host.includes(".") || /^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
      throw new Error("Yaroqli tashqi domen nomi (FQDN) kiriting.");
    }
  }

  return parsed;
}

function buildODataEndpoint(baseUrl: URL, pathAndQuery: string): string {
  const cleanBase = baseUrl.toString().replace(/\/+$/, "");
  const cleanPath = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${cleanBase}${cleanPath}`;
}

function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

async function odataRequest(
  baseUrl: URL,
  pathAndQuery: string,
  auth: { username: string; password: string },
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const targetUrl = buildODataEndpoint(baseUrl, pathAndQuery);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", buildBasicAuthHeader(auth.username, auth.password));
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const res = await fetch(targetUrl, {
    ...init,
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(ODATA_TIMEOUT_MS),
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  return { ok: res.ok, status: res.status, data, text };
}

function extractODataRows(data: any): any[] {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.d?.results)) return data.d.results;
  if (Array.isArray(data.d)) return data.d;
  return [];
}

function extractODataErrorMessage(status: number, data: any, text: string): string {
  const odataMsg =
    data?.["odata.error"]?.message?.value ||
    data?.error?.message?.value ||
    data?.error?.message ||
    data?.message;
  if (typeof odataMsg === "string" && odataMsg.trim()) {
    return odataMsg.trim().slice(0, 300);
  }
  if (status === 401 || status === 403) {
    return "1C OData autentifikatsiya xatosi: login, parol yoki OData huquqlarini tekshiring.";
  }
  if (status === 404) {
    return "1C OData endpoint topilmadi (standard.odata nashr qilinganligini tekshiring).";
  }
  return text ? text.slice(0, 200) : `1C OData HTTP ${status} xatosi`;
}

export async function testODataConnection(params: {
  baseUrl: string;
  username: string;
  password: string;
}): Promise<{
  ok: boolean;
  status?: number;
  discoveredEntities: string[];
  sampleCount: number;
  message: string;
  error?: string;
}> {
  let validatedUrl: URL;
  try {
    validatedUrl = validateExternalODataUrl(params.baseUrl);
  } catch (err: any) {
    return {
      ok: false,
      discoveredEntities: [],
      sampleCount: 0,
      message: err?.message || "OData URL yaroqsiz",
      error: err?.message || "OData URL yaroqsiz",
    };
  }

  const auth = { username: params.username, password: params.password };

  try {
    const probe = await odataRequest(
      validatedUrl,
      "/Catalog_%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%B3%D0%B5%D0%BD%D1%82%D1%8B?$top=5&$format=json",
      auth
    );

    const discovered = new Set<string>();
    let sampleCount = 0;

    if (probe.ok) {
      discovered.add("Catalog_Контрагенты");
      sampleCount = extractODataRows(probe.data).length;
    } else if (probe.status === 401 || probe.status === 403) {
      const errMsg = extractODataErrorMessage(probe.status, probe.data, probe.text);
      return {
        ok: false,
        status: probe.status,
        discoveredEntities: [],
        sampleCount: 0,
        message: errMsg,
        error: errMsg,
      };
    }

    // Probe root service document or $metadata to discover published entity sets
    const rootProbe = await odataRequest(validatedUrl, "/?$format=json", auth).catch(() => null);
    if (rootProbe?.ok) {
      const rows = extractODataRows(rootProbe.data);
      for (const entry of rows) {
        const name = typeof entry?.name === "string" ? entry.name : typeof entry === "string" ? entry : "";
        if (name) discovered.add(name);
      }
    }

    if (!probe.ok && !rootProbe?.ok) {
      const metaRes = await fetch(buildODataEndpoint(validatedUrl, "/$metadata"), {
        headers: {
          Authorization: buildBasicAuthHeader(auth.username, auth.password),
          Accept: "application/xml, text/xml",
        },
        redirect: "error",
        signal: AbortSignal.timeout(ODATA_TIMEOUT_MS),
      });

      if (!metaRes.ok) {
        const errMsg = extractODataErrorMessage(probe.status || metaRes.status, probe.data, probe.text);
        return {
          ok: false,
          status: metaRes.status,
          discoveredEntities: [],
          sampleCount: 0,
          message: errMsg,
          error: errMsg,
        };
      }

      const metaXml = await metaRes.text();
      for (const candidate of COMMON_1C_ENTITY_SETS) {
        if (metaXml.includes(candidate)) {
          discovered.add(candidate);
        }
      }
    }

    return {
      ok: true,
      status: 200,
      discoveredEntities: Array.from(discovered),
      sampleCount,
      message: "1C OData ulanishi muvaffaqiyatli tasdiqlandi.",
    };
  } catch (err: any) {
    const errMsg =
      err?.name === "TimeoutError"
        ? "1C OData serveriga ulanish vaqti tugadi (15 soniya)."
        : err?.message || "1C OData serveriga ulanib boʻlmadi.";
    return {
      ok: false,
      discoveredEntities: [],
      sampleCount: 0,
      message: errMsg,
      error: errMsg,
    };
  }
}

export async function fetchODataCatalogs(params: {
  baseUrl: string;
  username: string;
  password: string;
}): Promise<{
  ok: boolean;
  items: ODataCatalogItem[];
  counts: Record<ODataCatalogType, number>;
  errors: string[];
}> {
  const validatedUrl = validateExternalODataUrl(params.baseUrl);
  const auth = { username: params.username, password: params.password };

  const targets: Array<{
    entitySet: string;
    catalogType: ODataCatalogType;
    top: number;
  }> = [
    { entitySet: "Catalog_Контрагенты", catalogType: "counterparty", top: 250 },
    { entitySet: "Catalog_ДоговорыКонтрагентов", catalogType: "contract", top: 250 },
    { entitySet: "Catalog_Номенклатура", catalogType: "nomenclature", top: 250 },
    { entitySet: "Catalog_БанковскиеСчета", catalogType: "bank_account", top: 100 },
  ];

  const items: ODataCatalogItem[] = [];
  const errors: string[] = [];
  const counts: Record<ODataCatalogType, number> = {
    counterparty: 0,
    contract: 0,
    nomenclature: 0,
    bank_account: 0,
  };

  for (const target of targets) {
    try {
      const encodedPath = `/${encodeURIComponent(target.entitySet)}?$top=${target.top}&$format=json`;
      const res = await odataRequest(validatedUrl, encodedPath, auth);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(extractODataErrorMessage(res.status, res.data, res.text));
        }
        if (res.status !== 404) {
          errors.push(`${target.entitySet}: ${extractODataErrorMessage(res.status, res.data, res.text)}`);
        }
        continue;
      }

      const rows = extractODataRows(res.data);
      for (const row of rows) {
        if (row?.DeletionMark === true || row?.IsFolder === true) continue;
        const refKey = String(row?.Ref_Key || row?.GUID || "").trim();
        const name = sanitizeStorageText(
          String(row?.Description || row?.Наименование || row?.НомерСчета || row?.Code || "").trim()
        );
        if (!refKey || !name) continue;

        const rawStir = String(row?.ИНН || row?.INN || row?.TIN || row?.STIR || "").replace(/\D/g, "");
        const tinStir = /^\d{9}$/.test(rawStir) ? rawStir : null;
        const code = row?.Code ? sanitizeStorageText(String(row.Code).trim()) : null;

        items.push({
          catalogType: target.catalogType,
          externalRefKey: refKey,
          code,
          name: name.slice(0, 255),
          tinStir,
          rawData: {
            entitySet: target.entitySet,
            code,
            tinStir,
            number: row?.НомерСчета ? String(row.НомерСчета) : undefined,
            ownerKey: row?.Owner_Key ? String(row.Owner_Key) : undefined,
          },
        });
        counts[target.catalogType] += 1;
      }
    } catch (err: any) {
      errors.push(`${target.entitySet}: ${err?.message || "Sinxronizatsiya xatosi"}`);
      if (String(err?.message || "").includes("autentifikatsiya")) {
        return { ok: false, items: [], counts, errors };
      }
    }
  }

  return {
    ok: items.length > 0 || errors.length === 0,
    items,
    counts,
    errors,
  };
}

function resolve1CDocumentEntitySet(draft: OneCDraftInput): string {
  const customSet =
    typeof draft.payload?.odataEntitySet === "string" ? draft.payload.odataEntitySet.trim() : "";
  if (customSet && /^Document_[A-Za-zА-Яа-яЁё0-9_]+$/.test(customSet)) {
    return customSet;
  }

  switch (draft.docType) {
    case "bank_income":
    case "income":
      return "Document_ПоступлениеНаРасчетныйСчет";
    case "bank_expense":
    case "expense":
      return "Document_СписаниеСРасчетногоСчета";
    case "incoming_invoice":
    case "purchase":
      return "Document_ПоступлениеТоваровУслуг";
    case "sales_invoice":
    case "invoice":
      return "Document_РеализацияТоваровУслуг";
    case "journal_entry":
    case "operation":
    default:
      return "Document_ОперацияБух";
  }
}

/**
 * Pushes a draft document to 1C via OData REST.
 * Strictly forces `Posted: false` so documents land ONLY as Qoralama (Draft).
 */
export async function pushDraftToOData(params: {
  baseUrl: string;
  username: string;
  password: string;
  draft: OneCDraftInput;
}): Promise<{
  ok: boolean;
  docNumber?: string;
  refKey?: string;
  error?: string;
}> {
  let validatedUrl: URL;
  try {
    validatedUrl = validateExternalODataUrl(params.baseUrl);
  } catch (err: any) {
    return { ok: false, error: err?.message || "OData URL yaroqsiz" };
  }

  const { draft } = params;
  const entitySet = resolve1CDocumentEntitySet(draft);
  const rawPayload = draft.payload && typeof draft.payload === "object" ? { ...draft.payload } : {};

  // Strip internal control properties before sending to 1C
  delete rawPayload.odataEntitySet;
  delete rawPayload.Posted;
  delete rawPayload.posted;

  const isoDate = draft.docDate && /^\d{4}-\d{2}-\d{2}/.test(draft.docDate)
    ? `${draft.docDate.slice(0, 10)}T00:00:00`
    : `${new Date().toISOString().slice(0, 10)}T00:00:00`;

  const body: Record<string, unknown> = {
    ...rawPayload,
    Date: rawPayload.Date || isoDate,
    Комментарий:
      rawPayload.Комментарий ||
      sanitizeStorageText(draft.description || "FIRMUS orqali yuborilgan qoralama"),
    ...(draft.amount !== undefined && rawPayload.СуммаДокумента === undefined
      ? { СуммаДокумента: Number(draft.amount) }
      : {}),
    ...(draft.counterpartyRefKey && rawPayload.Контрагент_Key === undefined
      ? { Контрагент_Key: draft.counterpartyRefKey }
      : {}),
    ...(draft.contractRefKey && rawPayload.ДоговорКонтрагента_Key === undefined
      ? { ДоговорКонтрагента_Key: draft.contractRefKey }
      : {}),
    // CRITICAL SAFETY RULE: NEVER auto-post in 1C; always create as Qoralama (Draft)
    Posted: false,
  };

  try {
    const res = await odataRequest(
      validatedUrl,
      `/${encodeURIComponent(entitySet)}?$format=json`,
      { username: params.username, password: params.password },
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      return {
        ok: false,
        error: extractODataErrorMessage(res.status, res.data, res.text),
      };
    }

    const docNumber = String(res.data?.Number || res.data?.Номер || "").trim() || undefined;
    const refKey = String(res.data?.Ref_Key || res.data?.GUID || "").trim() || undefined;

    return {
      ok: true,
      docNumber,
      refKey,
    };
  } catch (err: any) {
    return {
      ok: false,
      error:
        err?.name === "TimeoutError"
          ? "1C OData soʻrovi vaqti tugadi (15 soniya)."
          : err?.message || "1C OData hujjat yuborishda xatolik.",
    };
  }
}

/**
 * Generates a ready-to-use 1C:Enterprise 8.3 BSL module snippet and Uzbek guide
 * for local desktop/file-mode 1C installations (.epf bridge).
 */
export function generate1CEpfGuideBsl(params: { appUrl: string }): {
  filename: string;
  bslCode: string;
  instructionsUz: string[];
} {
  const cleanUrl = String(params.appUrl || "https://firmus.uz").replace(/\/+$/, "");

  const bslCode = `// ============================================================================
// FIRMUS — 1C:Predpriyatiye 8.3 Mahalliy Koʻprik (.epf) BSL Moduli
// Xavfsizlik qoidasi: Barcha hujjatlar 1C bazasiga FAQAT QORALAMA (Posted = Ложь)
// holatida yoziladi. Provodka (Проведение) buxgalter tomonidan tasdiqlanadi.
// ============================================================================

&НаСервере
Функция БазовыйАдресFirmus()
    Возврат "${cleanUrl}";
КонецФункции

// 1-QADAM: 6 raqamli kod orqali ulash va Token olish
&НаСервере
Функция ПодключитьFirmusПоКоду(КодПривязки, Версия1С = "8.3") Экспорт
    Запрос = Новый HTTPЗапрос("/api/1c/pair");
    Запрос.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");

    Тело = Новый Структура("pairingCode,baseName,version",
        СокрЛП(КодПривязки),
        СтрокаСоединенияИнформационнойБазы(),
        Версия1С
    );

    ЗаписьJSON = Новый ЗаписьJSON;
    ЗаписьJSON.УстановитьСтроку();
    ЗаписатьJSON(ЗаписьJSON, Тело);
    Запрос.УстановитьТелоИзСтроки(ЗаписьJSON.Закрыть(), КодировкаТекста.UTF8);

    Ответ = ВыполнитьHTTPЗапросFirmus(Запрос, "");
    Если Ответ.КодСостояния = 200 Тогда
        Данные = ПрочитатьJSONОтвет(Ответ);
        // Tokenni xavfsiz xotirada (Константа / ХранилищеНастроек) saqlang:
        // Константы.FirmusТокенИнтеграции.Установить(Данные["token"]);
        Возврат Данные;
    КонецЕсли;
    ВызватьИсключение("Firmus ulanish xatosi: " + Ответ.ПолучитьТелоКакСтроку());
КонецФункции

// 2-QADAM: Kontragent va shartnomalarni Firmus katalogiga yuborish
&НаСервере
Процедура ОтправитьСправочникиВFirmus(Токен) Экспорт
    Элементы = Новый Массив;
    Выборка = Справочники.Контрагенты.Выбрать();
    Пока Выборка.Следующий() Цикл
        Если Выборка.ПометкаУдаления Или Выборка.ЭтоГруппа Тогда
            Продолжить;
        КонецЕсли;
        Стр = Новый Структура;
        Стр.Вставить("catalogType", "counterparty");
        Стр.Вставить("externalRefKey", Строка(Выборка.Ссылка.УникальныйИдентификатор()));
        Стр.Вставить("code", Строка(Выборка.Код));
        Стр.Вставить("name", Строка(Выборка.Наименование));
        Стр.Вставить("tinStir", Строка(Выборка.ИНН));
        Элементы.Добавить(Стр);
        Если Элементы.Количество() >= 250 Тогда
            Прервать;
        КонецЕсли;
    КонецЦикла;

    Запрос = Новый HTTPЗапрос("/api/1c/catalog-sync");
    Запрос.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");
    Запрос.Заголовки.Вставить("Authorization", "Bearer " + Токен);

    ЗаписьJSON = Новый ЗаписьJSON;
    ЗаписьJSON.УстановитьСтроку();
    ЗаписатьJSON(ЗаписьJSON, Новый Структура("items", Элементы));
    Запрос.УстановитьТелоИзСтроки(ЗаписьJSON.Закрыть(), КодировкаТекста.UTF8);

    ВыполнитьHTTPЗапросFirmus(Запрос, Токен);
КонецПроцедуры

// 3-QADAM: Qoralama hujjatlarni yuklash va tasdiqlash (ACK)
&НаСервере
Процедура ЗагрузитьЧерновикиИзFirmus(Токен) Экспорт
    Запрос = Новый HTTPЗапрос("/api/1c/outbox");
    Запрос.Заголовки.Вставить("Authorization", "Bearer " + Токен);
    Ответ = ВыполнитьHTTPЗапросFirmus(Запрос, Токен);
    Если Ответ.КодСостояния <> 200 Тогда
        Возврат;
    КонецЕсли;

    Данные = ПрочитатьJSONОтвет(Ответ);
    Результаты = Новый Массив;

    Для Каждого Элем Из Данные["items"] Цикл
        Рез = Новый Структура("id,ok,docNumber,refKey,error");
        Рез.id = Элем["id"];
        Попытка
            Док = Документы.ОперацияБух.СоздатьДокумент();
            Док.Дата = XMLЗначение(Тип("Дата"), Элем["docDate"] + "T00:00:00");
            Док.Комментарий = Элем["description"];
            // MUHIM: Faqat Qoralama (Запись), Проведение QILINMAYDI!
            Док.Записать(РежимЗаписиДокумента.Запись);

            Рез.ok = Истина;
            Рез.docNumber = Строка(Док.Номер);
            Рез.refKey = Строка(Док.Ссылка.УникальныйИдентификатор());
        Исключение
            Рез.ok = Ложь;
            Рез.error = ОписаниеОшибки();
        КонецПопытки;
        Результаты.Добавить(Рез);
    КонецЦикла;

    Если Результаты.Количество() > 0 Тогда
        ЗапросAck = Новый HTTPЗапрос("/api/1c/ack");
        ЗапросAck.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");
        ЗапросAck.Заголовки.Вставить("Authorization", "Bearer " + Токен);
        ЗаписьJSON = Новый ЗаписьJSON;
        ЗаписьJSON.УстановитьСтроку();
        ЗаписатьJSON(ЗаписьJSON, Новый Структура("results", Результаты));
        ЗапросAck.УстановитьТелоИзСтроки(ЗаписьJSON.Закрыть(), КодировкаТекста.UTF8);
        ВыполнитьHTTPЗапросFirmus(ЗапросAck, Токен);
    КонецЕсли;
КонецПроцедуры

&НаСервере
Функция ВыполнитьHTTPЗапросFirmus(Запрос, Токен)
    URI = БазовыйАдресFirmus();
    ИспользоватьSSL = СтрНачинаетсяС(URI, "https://");
    Хост = СтрЗаменить(СтрЗаменить(URI, "https://", ""), "http://", "");
    Если ИспользоватьSSL Тогда
        Соединение = Новый HTTPСоединение(Хост, 443, , , , 15, Новый ЗащищенноеСоединениеOpenSSL());
    Иначе
        Соединение = Новый HTTPСоединение(Хост, 80, , , , 15);
    КонецЕсли;
    Возврат Соединение.ОтправитьДляОбработки(Запрос);
КонецФункции

&НаСервере
Функция ПрочитатьJSONОтвет(Ответ)
    ЧтениеJSON = Новый ЧтениеJSON;
    ЧтениеJSON.УстановитьСтроку(Ответ.ПолучитьТелоКакСтроку());
    Результат = ПрочитатьJSON(ЧтениеJSON);
    ЧтениеJSON.Закрыть();
    Возврат Результат;
КонецФункции
`;

  const instructionsUz = [
    "1. Firmus integratsiyalar boʻlimida «8 belgili ulash kodini olish» tugmasini bosing (kod 5 daqiqa amal qiladi).",
    "2. 1C:Predpriyatiye dasturini oching va menyudan «Файл -> Открыть» (Ctrl+O) orqali Firmus1CBridge.epf tashqi ishlovini tanlang.",
    "3. Ochilgan oynada 8 belgili kodni (masalan, ABCD-2345) kiriting va «Firmusga ulash» tugmasini bosing — 1C avtomatik ravishda 90 kun amal qiluvchi xavfsiz Bearer token oladi.",
    "4. «Kontragentlarni sinxronlash» orqali 1C katalogini Firmusga yuboring, soʻng «Qoralamalarni yuklash» orqali hujjatlarni qabul qiling.",
    "5. Xavfsizlik kafolati: barcha yuklangan hujjatlar 1C da faqat «Qoralama» (Проведен = Ложь) holatida saqlanadi; yakuniy provodkani buxgalter tasdiqlaydi.",
  ];

  return {
    filename: "Firmus1CBridge.bsl",
    bslCode,
    instructionsUz,
  };
}

/**
 * Authenticates an incoming request from a local 1C .epf module using
 * `Authorization: Bearer <integration_token>`.
 */
export async function authenticate1CBridgeToken(req: NextRequest | Request): Promise<
  | {
      ok: true;
      connection: {
        id: string;
        business_entity_id: string;
        provider: string;
        status: string;
        config: Record<string, unknown> | null;
      };
      businessEntityId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  const authHeader = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const rawToken = match?.[1]?.trim() || "";

  if (!rawToken || rawToken.length < 16) {
    return {
      ok: false,
      status: 401,
      error: "Bearer integratsiya tokeni talab qilinadi.",
    };
  }

  const tokenHash = sha256Hex(rawToken);
  const { getServiceClient } = await import("@/lib/supabase/service");
  const service = getServiceClient();

  const { data: conn, error } = await service
    .from("integration_connections")
    .select("id, business_entity_id, provider, status, config, token_hash, token_expires_at, token_revoked_at")
    .eq("provider", "onec_epf")
    .eq("status", "connected")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !conn || !conn.token_hash) {
    return {
      ok: false,
      status: 401,
      error: "Integratsiya tokeni yaroqsiz yoki bekor qilingan.",
    };
  }

  if (conn.token_revoked_at) {
    return {
      ok: false,
      status: 401,
      error: "Integratsiya tokeni bekor qilingan.",
    };
  }

  if (conn.token_expires_at && new Date(conn.token_expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      status: 401,
      error: "Integratsiya tokenining amal qilish muddati tugagan. Yangi ulash kodi oling.",
    };
  }

  if (!safeEqualStrings(String(conn.token_hash), tokenHash)) {
    return {
      ok: false,
      status: 401,
      error: "Integratsiya tokeni mos kelmadi.",
    };
  }

  await service
    .from("integration_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", conn.id);

  return {
    ok: true,
    connection: {
      id: conn.id,
      business_entity_id: conn.business_entity_id,
      provider: conn.provider,
      status: conn.status,
      config: (conn.config as Record<string, unknown> | null) || null,
    },
    businessEntityId: conn.business_entity_id,
  };
}
