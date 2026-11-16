import { supabase } from "@/lib/supabase/client";
import { mockChartOfAccounts } from "@/lib/mock/accounting";
import { splitVatInclusive } from "@/lib/utils/finance";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): id is string {
  return Boolean(id && UUID_REGEX.test(id));
}

async function resolveActiveWorkspaceId(explicitWorkspaceId?: string): Promise<string | null> {
  if (isValidUuid(explicitWorkspaceId)) return explicitWorkspaceId;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// ==========================================
// 0. WORKSPACES
// ==========================================
export async function fetchWorkspaces() {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*, business_entities(id), team_members(id)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchWorkspaces error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      type: ws.type || "accounting_firm",
      ownerName: "FIRMUS Rahbari",
      currentPlan: ws.plan_id || "professional",
      entitiesCount: ws.business_entities?.length ?? 0,
      membersCount: ws.team_members?.length ?? 0,
    }));
  } catch (err) {
    console.error("fetchWorkspaces exception:", err);
    return [];
  }
}

export async function createWorkspaceRecord(name: string, type: "accounting_firm" | "individual_company") {
  const { data, error } = await supabase.rpc("create_workspace_with_owner", {
    p_name: name,
    p_type: type,
  });
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    ownerName: "Siz",
    currentPlan: data.plan_id || "professional",
    entitiesCount: 0,
    membersCount: 1,
  };
}

export async function updateWorkspacePlanInDb(workspaceId: string, planId: string) {
  if (!isValidUuid(workspaceId)) {
    throw new Error("Haqiqiy workspace ID topilmadi");
  }
  const { data, error } = await supabase
    .from("workspaces")
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ==========================================
// 1. BUSINESS ENTITIES
// ==========================================
export async function fetchBusinessEntities() {
  try {
    const { data, error } = await supabase
      .from("business_entities")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchBusinessEntities error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((ent: any) => ({
      id: ent.id,
      workspaceId: ent.workspace_id,
      name: ent.legal_name,
      tradeName: ent.trade_name || undefined,
      tinStir: ent.tin_stir,
      companyType: ent.company_type || "MChJ",
      taxRegime: ent.tax_regime || "vat_profit_tax",
      currency: ent.currency || "UZS",
      accountantName: ent.accountant_name || "Azizbek Rahimov",
      isActive: ent.is_active,
      directorName: "Masʼul rahbar",
      bankAccount: "20208000700543210001",
      bankName: "ATB Kapitalbank",
    }));
  } catch (err) {
    console.error("fetchBusinessEntities exception:", err);
    return [];
  }
}

export async function createBusinessEntity(entity: {
  workspaceId?: string;
  legalName: string;
  tradeName?: string;
  tinStir: string;
  companyType: string;
  taxRegime: string;
  accountantName?: string;
}) {
  const workspaceId = await resolveActiveWorkspaceId(entity.workspaceId);
  if (!workspaceId) {
    throw new Error("Faol ishchi maydon (Workspace) topilmadi. Avval tizimga kiring.");
  }

  const { data, error } = await supabase
    .from("business_entities")
    .insert({
      workspace_id: workspaceId,
      legal_name: entity.legalName,
      trade_name: entity.tradeName || null,
      tin_stir: entity.tinStir,
      company_type: entity.companyType,
      tax_regime: entity.taxRegime,
      accountant_name: entity.accountantName || "Bosh buxgalter",
      currency: "UZS",
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.legal_name,
    tradeName: data.trade_name || undefined,
    tinStir: data.tin_stir,
    companyType: data.company_type,
    taxRegime: data.tax_regime,
    currency: data.currency,
    accountantName: data.accountant_name,
    isActive: data.is_active,
    directorName: "Masʼul rahbar",
    bankAccount: "20208000700543210001",
    bankName: "ATB Kapitalbank",
  };
}

export async function updateBusinessEntity(
  id: string,
  updates: {
    legalName?: string;
    tradeName?: string;
    tinStir?: string;
    companyType?: string;
    taxRegime?: string;
    accountantName?: string;
  }
) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.legalName !== undefined) payload.legal_name = updates.legalName;
  if (updates.tradeName !== undefined) payload.trade_name = updates.tradeName || null;
  if (updates.tinStir !== undefined) payload.tin_stir = updates.tinStir;
  if (updates.companyType !== undefined) payload.company_type = updates.companyType;
  if (updates.taxRegime !== undefined) payload.tax_regime = updates.taxRegime;

  if (updates.accountantName !== undefined) payload.accountant_name = updates.accountantName;

  const { data, error } = await supabase
    .from("business_entities")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.legal_name,
    tradeName: data.trade_name || undefined,
    tinStir: data.tin_stir,
    companyType: data.company_type,
    taxRegime: data.tax_regime,
    currency: data.currency,
    accountantName: data.accountant_name,
    isActive: data.is_active,
  };
}

// ==========================================
// 2. TRANSACTIONS & AUTO-POSTING TO LEDGER
// ==========================================
function mapTransactionRow(tx: any) {
  return {
    id: tx.id,
    entityId: tx.business_entity_id,
    date: tx.date,
    amount: Number(tx.amount),
    type: tx.type,
    counterparty: tx.counterparty,
    counterpartyStir: tx.counterparty_stir,
    description: tx.description,
    status: tx.status,
    source: tx.source,
    accountCode: tx.account_code,
    accountName: tx.account_name,
    matchedDocumentName: tx.matched_document_name,
    aiExplanation: tx.ai_explanation,
    aiConfidence: tx.ai_confidence ? Number(tx.ai_confidence) : undefined,
  };
}

export async function fetchTransactions(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTransactionRow);
  } catch (err) {
    console.error("fetchTransactions error:", err);
    return [];
  }
}

export async function fetchTransactionsPaginated(
  entityId: string | undefined,
  options: {
    page?: number;
    pageSize?: number;
    tab?: string;
    search?: string;
  } = {}
) {
  if (entityId && !isValidUuid(entityId)) {
    return { data: [], count: 0 };
  }
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (entityId) {
    query = query.eq("business_entity_id", entityId);
  }

  if (options.tab === "income" || options.tab === "expense") {
    query = query.eq("type", options.tab);
  } else if (options.tab === "pending" || options.tab === "exception") {
    query = query.eq("status", options.tab);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim().replace(/[,%()]/g, "");
    query = query.or(`counterparty.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    data: (data || []).map(mapTransactionRow),
    count: count ?? 0,
  };
}

export async function createTransaction(tx: {
  entityId?: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  counterparty: string;
  counterpartyStir?: string;
  description: string;
  accountCode?: string;
  accountName?: string;
  status?: "posted" | "pending";
  source?: string;
}) {
  if (!isValidUuid(tx.entityId)) {
    throw new Error("Korxona tanlanmagan yoki notoʻgʻri ID.");
  }

  const corrCode = tx.accountCode || (tx.type === "income" ? "4010" : "6010");
  const corrName =
    tx.accountName ||
    (tx.type === "income"
      ? "Xaridorlar va buyurtmachilardan olinadigan schyotlar"
      : "Mol yetkazib beruvchilarga toʻlanadigan schyotlar");

  const finalStatus = tx.status || "posted";

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      business_entity_id: tx.entityId,
      date: tx.date,
      amount: tx.amount,
      type: tx.type,
      counterparty: tx.counterparty,
      counterparty_stir: tx.counterpartyStir || null,
      description: tx.description,
      status: finalStatus,
      source: tx.source || "manual",
      account_code: corrCode,
      account_name: corrName,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-post atomic double-entry to General Ledger strictly if status is posted
  if (finalStatus === "posted" && tx.amount > 0) {
    const debitCode = tx.type === "income" ? "5110" : corrCode;
    const debitName = tx.type === "income" ? "Hisob-kitob schyoti (Milliy valyutada)" : corrName;
    const creditCode = tx.type === "income" ? corrCode : "5110";
    const creditName = tx.type === "income" ? corrName : "Hisob-kitob schyoti (Milliy valyutada)";

    const { error: jeErr } = await supabase.rpc("create_journal_entry_atomic", {
      p_business_entity_id: tx.entityId,
      p_entry_number: `JE-TX-${String(data.id).slice(0, 8).toUpperCase()}`,
      p_entry_date: tx.date,
      p_description: `${tx.counterparty}: ${tx.description}`,
      p_source_type: "bank_statement",
      p_source_reference_id: String(data.id),
      p_idempotency_key: `idem-tx-${data.id}`,
      p_lines: [
        {
          account_code: debitCode,
          account_name: debitName,
          debit_amount: tx.amount,
          credit_amount: 0,
          memo: tx.description,
        },
        {
          account_code: creditCode,
          account_name: creditName,
          debit_amount: 0,
          credit_amount: tx.amount,
          memo: tx.description,
        },
      ],
    });

    if (jeErr) {
      // Rollback transaction insert if atomic ledger failed so DB stays consistent
      await supabase.from("transactions").delete().eq("id", data.id);
      throw new Error(`Tranzaksiya provodkasi xatosi: ${jeErr.message}`);
    }
  }

  return mapTransactionRow(data);
}

export async function updateTransactionStatus(
  txId: string,
  status: "posted" | "pending" | "exception" | "rejected",
  txDetails?: {
    entityId?: string;
    date: string;
    amount: number;
    type: "income" | "expense";
    counterparty: string;
    description: string;
    accountCode?: string;
  }
) {
  if (!isValidUuid(txId)) {
    throw new Error("Notoʻgʻri tranzaksiya ID");
  }

  const { error: updErr } = await supabase
    .from("transactions")
    .update({ status })
    .eq("id", txId);

  if (updErr) throw updErr;

  if (status === "posted" && isValidUuid(txDetails?.entityId) && txDetails && txDetails.amount > 0) {
    const corrCode = txDetails.accountCode || (txDetails.type === "income" ? "4010" : "6010");
    const debitCode = txDetails.type === "income" ? "5110" : corrCode;
    const creditCode = txDetails.type === "income" ? corrCode : "5110";

    const { error: jeErr } = await supabase.rpc("create_journal_entry_atomic", {
      p_business_entity_id: txDetails.entityId,
      p_entry_number: `JE-APPR-${String(txId).slice(0, 8).toUpperCase()}`,
      p_entry_date: txDetails.date,
      p_description: `${txDetails.counterparty}: ${txDetails.description}`,
      p_source_type: "bank_statement",
      p_source_reference_id: String(txId),
      p_idempotency_key: `idem-tx-approve-${txId}`,
      p_lines: [
        {
          account_code: debitCode,
          debit_amount: txDetails.amount,
          credit_amount: 0,
          memo: txDetails.description,
        },
        {
          account_code: creditCode,
          debit_amount: 0,
          credit_amount: txDetails.amount,
          memo: txDetails.description,
        },
      ],
    });

    if (jeErr) throw new Error(`Bosh kitob provodkasida xatolik: ${jeErr.message}`);
  }

  return { id: txId, status };
}

// ==========================================
// 3. DOCUMENTS (Didox E-SF)
// ==========================================
function mapDocumentRow(doc: any) {
  return {
    id: doc.id,
    entityId: doc.business_entity_id,
    documentNumber: doc.document_number,
    type: doc.type,
    counterparty: doc.counterparty,
    counterpartyStir: doc.counterparty_stir,
    date: doc.date,
    dueDate: doc.due_date,
    amount: Number(doc.amount),
    vatAmount: Number(doc.vat_amount),
    status: doc.status,
    contractNumber: doc.contract_number,
    eImzoSigned: doc.e_imzo_signed,
    eImzoTimestamp: doc.e_imzo_timestamp,
    fileUrl: doc.file_url,
    fileName: doc.file_name || undefined,
    fileSize: doc.file_size || undefined,
  };
}

export async function uploadDocumentFileToStorage(entityId: string, file: File): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: string;
}> {
  if (!isValidUuid(entityId)) {
    throw new Error("Fayl yuklash uchun korxona tanlanishi shart.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${entityId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    throw new Error(`Storage yuklashda xatolik: ${error.message}`);
  }

  const kb = Math.max(1, Math.round(file.size / 1024));
  const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  return {
    fileUrl: storagePath,
    fileName: file.name,
    fileSize: sizeLabel,
  };
}

export async function getDocumentDownloadUrl(fileUrl: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(fileUrl, 120);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Hujjat faylini yuklab olish havolasi yaratilmadi.");
  }
  return data.signedUrl;
}

export async function fetchDocuments(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("documents")
      .select("*")
      .order("date", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDocumentRow);
  } catch (err) {
    console.error("fetchDocuments error:", err);
    return [];
  }
}

export async function fetchDocumentsPaginated(
  entityId: string | undefined,
  options: { page?: number; pageSize?: number; type?: string; search?: string } = {}
) {
  if (entityId && !isValidUuid(entityId)) return { data: [], count: 0 };
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .order("date", { ascending: false });

  if (entityId) {
    query = query.eq("business_entity_id", entityId);
  }
  if (options.type && options.type !== "all") {
    query = query.eq("type", options.type);
  }
  if (options.search && options.search.trim()) {
    const q = options.search.trim().replace(/[,%()]/g, "");
    query = query.or(`document_number.ilike.%${q}%,counterparty.ilike.%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return {
    data: (data || []).map(mapDocumentRow),
    count: count ?? 0,
  };
}

export async function createDocument(doc: {
  entityId?: string;
  documentNumber: string;
  type: string;
  counterparty: string;
  counterpartyStir?: string;
  date: string;
  dueDate?: string;
  amount: number;
  contractNumber?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}) {
  if (!isValidUuid(doc.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { vat: vatAmount } = splitVatInclusive(doc.amount, 12);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      business_entity_id: doc.entityId,
      document_number: doc.documentNumber,
      type: doc.type,
      counterparty: doc.counterparty,
      counterparty_stir: doc.counterpartyStir || null,
      date: doc.date,
      due_date: doc.dueDate || null,
      amount: doc.amount,
      vat_amount: vatAmount,
      status: "pending_signature",
      contract_number: doc.contractNumber || null,
      e_imzo_signed: false,
      file_url: doc.fileUrl || null,
      file_name: doc.fileName || null,
      file_size: doc.fileSize || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDocumentRow(data);
}

export async function signDocumentWithEImzo(
  documentId: string,
  docInfo?: {
    entityId?: string;
    documentNumber: string;
    type: string;
    counterparty: string;
    date: string;
    amount: number;
    vatAmount?: number;
  }
) {
  if (!isValidUuid(documentId)) {
    throw new Error("Notoʻgʻri hujjat ID");
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "signed",
      e_imzo_signed: true,
      e_imzo_timestamp: timestamp,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;

  // Auto-post signed E-SF invoice to General Ledger with automatic 12% VAT breakdown
  if (isValidUuid(docInfo?.entityId) && docInfo && docInfo.amount > 0) {
    const isIncoming = docInfo.type === "incoming_invoice" || docInfo.type === "act";
    const split = splitVatInclusive(docInfo.amount, 12);
    const vat =
      docInfo.vatAmount && docInfo.vatAmount > 0 && docInfo.vatAmount < docInfo.amount
        ? Number(docInfo.vatAmount.toFixed(2))
        : split.vat;
    const net = Number((docInfo.amount - vat).toFixed(2));

    let lines: Array<{ account_code: string; debit_amount: number; credit_amount: number; memo: string }>;
    if (vat > 0 && (docInfo.type === "invoice" || docInfo.type === "incoming_invoice")) {
      if (isIncoming) {
        lines = [
          { account_code: "2910", debit_amount: net, credit_amount: 0, memo: `E-SF №${docInfo.documentNumber} (QQSsiz)` },
          { account_code: "4410", debit_amount: vat, credit_amount: 0, memo: `E-SF №${docInfo.documentNumber} (Kiruvchi QQS 12%)` },
          { account_code: "6010", debit_amount: 0, credit_amount: docInfo.amount, memo: `E-SF №${docInfo.documentNumber}` },
        ];
      } else {
        lines = [
          { account_code: "4010", debit_amount: docInfo.amount, credit_amount: 0, memo: `E-SF №${docInfo.documentNumber}` },
          { account_code: "9010", debit_amount: 0, credit_amount: net, memo: `E-SF №${docInfo.documentNumber} (Sof tushum)` },
          { account_code: "6410", debit_amount: 0, credit_amount: vat, memo: `E-SF №${docInfo.documentNumber} (Chiquvchi QQS 12%)` },
        ];
      }
    } else {
      lines = [
        { account_code: isIncoming ? "2910" : "4010", debit_amount: docInfo.amount, credit_amount: 0, memo: `E-SF №${docInfo.documentNumber}` },
        { account_code: isIncoming ? "6010" : "9010", debit_amount: 0, credit_amount: docInfo.amount, memo: `E-SF №${docInfo.documentNumber}` },
      ];
    }

    const { error: jeErr } = await supabase.rpc("create_journal_entry_atomic", {
      p_business_entity_id: docInfo.entityId,
      p_entry_number: `JE-ESF-${docInfo.documentNumber}`,
      p_entry_date: docInfo.date,
      p_description: `Didox E-SF №${docInfo.documentNumber} (${docInfo.counterparty}) E-IMZO bilan tasdiqlandi`,
      p_source_type: "didox_invoice",
      p_source_reference_id: docInfo.documentNumber,
      p_idempotency_key: `idem-esf-${documentId}`,
      p_lines: lines,
    });

    if (jeErr) {
      throw new Error(`Hujjat imzolandi, lekin provodkada xatolik: ${jeErr.message}`);
    }
  }

  return data;
}

export async function rejectDocumentInDb(documentId: string) {
  if (!isValidUuid(documentId)) {
    throw new Error("Notoʻgʻri hujjat ID");
  }
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "rejected" })
    .eq("id", documentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ==========================================
// 3B. BANK ACCOUNTS
// ==========================================
export async function fetchBankAccounts(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("bank_accounts")
      .select("*")
      .order("is_primary", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((b: any) => ({
      id: b.id,
      entityId: b.business_entity_id,
      bankName: b.bank_name,
      accountNumber: b.account_number,
      mfo: b.mfo,
      currency: b.currency || "UZS",
      balance: Number(b.balance || 0),
      status: b.status || "connected",
      isPrimary: b.is_primary,
    }));
  } catch (err) {
    console.error("fetchBankAccounts error:", err);
    return [];
  }
}

export async function createBankAccountRecord(account: {
  entityId?: string;
  bankName: string;
  accountNumber: string;
  mfo: string;
  currency?: string;
  balance?: number;
}) {
  if (!isValidUuid(account.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      business_entity_id: account.entityId,
      bank_name: account.bankName,
      account_number: account.accountNumber,
      mfo: account.mfo,
      currency: account.currency || "UZS",
      balance: account.balance || 0,
      status: "connected",
      is_primary: false,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    entityId: data.business_entity_id,
    bankName: data.bank_name,
    accountNumber: data.account_number,
    mfo: data.mfo,
    currency: data.currency,
    balance: Number(data.balance || 0),
    status: data.status,
    isPrimary: data.is_primary,
  };
}

// ==========================================
// 4. CONTRACTS
// ==========================================
export async function fetchContracts(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("contracts")
      .select("*")
      .order("start_date", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      entityId: c.business_entity_id,
      number: c.number,
      type: c.type,
      counterparty: c.counterparty,
      counterpartyStir: c.counterparty_stir,
      amount: Number(c.amount),
      startDate: c.start_date,
      endDate: c.end_date,
      status: c.status,
      autoRenewal: c.auto_renewal,
      description: c.description,
    }));
  } catch (err) {
    console.error("fetchContracts error:", err);
    return [];
  }
}

export async function createContract(contract: {
  entityId?: string;
  number: string;
  type: string;
  counterparty: string;
  counterpartyStir?: string;
  amount: number;
  startDate: string;
  endDate: string;
  autoRenewal?: boolean;
  description?: string;
}) {
  if (!isValidUuid(contract.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      business_entity_id: contract.entityId,
      number: contract.number,
      type: contract.type,
      counterparty: contract.counterparty,
      counterparty_stir: contract.counterpartyStir || null,
      amount: contract.amount,
      start_date: contract.startDate,
      end_date: contract.endDate,
      status: "active",
      auto_renewal: contract.autoRenewal || false,
      description: contract.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    entityId: data.business_entity_id,
    number: data.number,
    type: data.type,
    counterparty: data.counterparty,
    counterpartyStir: data.counterparty_stir,
    amount: Number(data.amount),
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
    autoRenewal: data.auto_renewal,
    description: data.description,
  };
}

// ==========================================
// 5. INVENTORY
// ==========================================
export async function fetchInventoryItems(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      entityId: item.business_entity_id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unit_price),
      totalValue: Number(item.quantity) * Number(item.unit_price),
      status: item.status,
    }));
  } catch (err) {
    console.error("fetchInventoryItems error:", err);
    return [];
  }
}

export async function createInventoryItem(item: {
  entityId?: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}) {
  if (!isValidUuid(item.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const status = item.quantity <= 0 ? "out_of_stock" : item.quantity <= 10 ? "low_stock" : "in_stock";
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      business_entity_id: item.entityId,
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      status,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    entityId: data.business_entity_id,
    sku: data.sku,
    name: data.name,
    category: data.category,
    quantity: Number(data.quantity),
    unit: data.unit,
    unitPrice: Number(data.unit_price),
    totalValue: Number(data.quantity) * Number(data.unit_price),
    status: data.status,
  };
}

// ==========================================
// 6. EMPLOYEES
// ==========================================
export async function fetchEmployees(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("employees")
      .select("*")
      .order("hire_date", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((emp: any) => ({
      id: emp.id,
      entityId: emp.business_entity_id,
      name: emp.full_name,
      position: emp.position,
      department: emp.department,
      salary: Number(emp.salary),
      pinfl: emp.pinfl,
      hireDate: emp.hire_date,
      status: emp.status,
    }));
  } catch (err) {
    console.error("fetchEmployees error:", err);
    return [];
  }
}

export async function createEmployee(emp: {
  entityId?: string;
  fullName: string;
  position: string;
  department: string;
  salary: number;
  pinfl: string;
  hireDate: string;
}) {
  if (!isValidUuid(emp.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { data, error } = await supabase
    .from("employees")
    .insert({
      business_entity_id: emp.entityId,
      full_name: emp.fullName,
      position: emp.position,
      department: emp.department,
      salary: emp.salary,
      pinfl: emp.pinfl,
      hire_date: emp.hireDate,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    entityId: data.business_entity_id,
    name: data.full_name,
    position: data.position,
    department: data.department,
    salary: Number(data.salary),
    pinfl: data.pinfl,
    hireDate: data.hire_date,
    status: data.status,
  };
}

// ==========================================
// 7. EXCEPTIONS (AI Auditor)
// ==========================================
export async function fetchExceptions(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("exceptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((exc: any) => ({
      id: exc.id,
      entityId: exc.business_entity_id,
      entityName: exc.entity_name || "Korxona",
      severity: exc.severity || "warning",
      status: exc.status || "open",
      category: exc.category || "unmatched_payment",
      title: exc.title,
      description: exc.description,
      date: exc.date,
      amount: exc.amount ? Number(exc.amount) : undefined,
      counterparty: exc.counterparty || exc.source_system || "Kontragent",
      evidence: {
        sourceSystem: exc.source_system || "Tizim",
        referenceId: exc.reference_id || "ID-101",
        details: exc.details || "Tafsilotlar",
      },
      aiSuggestion: exc.ai_suggestion || "Avtomatik tahlil tavsiyasi",
      aiConfidence: Number(exc.ai_confidence || 95),
    }));
  } catch (err) {
    console.error("fetchExceptions error:", err);
    return [];
  }
}

export async function resolveExceptionInDb(id: string, action: "approve" | "reject") {
  if (!isValidUuid(id)) {
    throw new Error("Notoʻgʻri istisno ID");
  }
  const { data, error } = await supabase
    .from("exceptions")
    .update({
      status: action === "approve" ? "resolved" : "in_review",
      resolved_at: action === "approve" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// 8. TEAM MEMBERS & PHONE VERIFICATION
// ==========================================
export async function fetchTeamMembers(workspaceId?: string) {
  try {
    let query = supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (isValidUuid(workspaceId)) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((m: any) => ({
      id: m.id,
      workspaceId: m.workspace_id,
      userId: m.user_id,
      name: m.name,
      email: m.email,
      phone: m.phone || "+998 90 123-45-67",
      phoneVerifiedAt: m.phone_verified_at,
      role: m.role,
      status: m.status,
      assignedCompaniesCount: m.assigned_companies_count || 1,
      assignedEntityIds: Array.isArray(m.assigned_entity_ids) ? m.assigned_entity_ids : [],
    }));
  } catch (err) {
    console.error("fetchTeamMembers error:", err);
    return [];
  }
}

export async function createTeamMember(member: {
  workspaceId?: string;
  name: string;
  email: string;
  role: string;
}) {
  const workspaceId = await resolveActiveWorkspaceId(member.workspaceId);
  if (!workspaceId) {
    throw new Error("Workspace ID topilmadi");
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      workspace_id: workspaceId,
      name: member.name,
      email: member.email.trim().toLowerCase(),
      role: member.role,
      status: "invited",
      assigned_companies_count: 1,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    assignedCompaniesCount: data.assigned_companies_count,
    assignedEntityIds: Array.isArray(data.assigned_entity_ids) ? data.assigned_entity_ids : [],
  };
}

export async function updateTeamMemberAssignments(memberId: string, assignedEntityIds: string[]) {
  if (!isValidUuid(memberId)) {
    throw new Error("Notoʻgʻri aʼzo ID");
  }
  const { data, error } = await supabase
    .from("team_members")
    .update({
      assigned_entity_ids: assignedEntityIds,
      assigned_companies_count: assignedEntityIds.length,
    })
    .eq("id", memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserPhoneVerification(userId: string) {
  if (!isValidUuid(userId)) return null;
  try {
    const { data: row } = await supabase
      .from("team_members")
      .select("phone, phone_verified_at")
      .eq("user_id", userId)
      .not("phone_verified_at", "is", null)
      .limit(1)
      .maybeSingle();

    if (row?.phone && row?.phone_verified_at) {
      return { phone: row.phone, verifiedAt: row.phone_verified_at };
    }

    const { data: authData } = await supabase.auth.getUser();
    const meta = authData?.user?.user_metadata;
    if (meta?.phone && meta?.phone_verified_at) {
      return { phone: String(meta.phone), verifiedAt: String(meta.phone_verified_at) };
    }
    return null;
  } catch (err) {
    console.error("fetchUserPhoneVerification error:", err);
    return null;
  }
}

export async function saveUserPhoneVerification(userId: string, phone: string) {
  if (!isValidUuid(userId)) {
    throw new Error("Tasdiqlash uchun avval tizimga kiring.");
  }
  const verifiedAt = new Date().toISOString();

  // Persist on team_members rows owned by user AND auth user metadata
  const { error: tmErr } = await supabase
    .from("team_members")
    .update({
      phone,
      phone_verified_at: verifiedAt,
    })
    .eq("user_id", userId);

  if (tmErr) throw tmErr;

  const { error: authErr } = await supabase.auth.updateUser({
    data: { phone, phone_verified_at: verifiedAt },
  });
  if (authErr) {
    console.warn("auth.updateUser metadata warning:", authErr.message);
  }

  return verifiedAt;
}

// ==========================================
// 9. JOURNAL ENTRIES & ACCOUNTING LEDGER
// ==========================================
export async function fetchChartOfAccounts(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return mockChartOfAccounts;
    let query = supabase
      .from("chart_of_accounts")
      .select("*")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (entityId) {
      query = query.or(`business_entity_id.eq.${entityId},business_entity_id.is.null`);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return mockChartOfAccounts;
    }

    return data.map((acc: any) => ({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type === "asset" || acc.type === "expense" ? "active" : "passive",
      category:
        acc.type === "asset"
          ? "Aktivlar"
          : acc.type === "liability"
          ? "Majburiyatlar"
          : acc.type === "equity"
          ? "Xususiy kapital"
          : acc.type === "revenue"
          ? "Daromadlar"
          : "Xarajatlar",
      balance: 0,
      level: 2,
    }));
  } catch (err) {
    console.error("fetchChartOfAccounts error:", err);
    return mockChartOfAccounts;
  }
}

export async function createChartOfAccount(acc: {
  entityId?: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
}) {
  if (!isValidUuid(acc.entityId)) {
    throw new Error("Korxona tanlanmagan yoki notoʻgʻri ID.");
  }

  const cleanCode = acc.code.trim();
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("business_entity_id", acc.entityId)
    .eq("code", cleanCode)
    .maybeSingle();

  if (existing) {
    throw new Error(`«${cleanCode}» kodli schyot ushbu korxonada allaqachon mavjud.`);
  }

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      business_entity_id: acc.entityId,
      code: cleanCode,
      name: acc.name.trim(),
      type: acc.type,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function mapJournalEntryRow(je: any) {
  const lines = (je.journal_lines || []).map((l: any) => ({
    id: l.id,
    accountCode: l.account_code,
    accountName: l.account_name,
    debit: Number(l.debit_amount || 0),
    credit: Number(l.credit_amount || 0),
    memo: l.memo,
  }));

  const totalDebit = lines.reduce((acc: number, curr: any) => acc + curr.debit, 0);
  const totalCredit = lines.reduce((acc: number, curr: any) => acc + curr.credit, 0);

  return {
    id: je.id,
    entityId: je.business_entity_id,
    entryNumber: je.entry_number,
    date: je.entry_date,
    description: je.description,
    sourceType: je.source_type,
    status: je.status,
    totalDebit,
    totalCredit,
    createdBy: "Bosh buxgalter",
    lines,
  };
}

export async function fetchJournalEntries(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("journal_entries")
      .select("*, journal_lines(*)")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapJournalEntryRow);
  } catch (err) {
    console.error("fetchJournalEntries error:", err);
    return [];
  }
}

export async function fetchJournalEntriesPaginated(
  entityId: string | undefined,
  options: { page?: number; pageSize?: number } = {}
) {
  if (entityId && !isValidUuid(entityId)) return { data: [], count: 0 };
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("journal_entries")
    .select("*, journal_lines(*)", { count: "exact" })
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (entityId) {
    query = query.eq("business_entity_id", entityId);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return {
    data: (data || []).map(mapJournalEntryRow),
    count: count ?? 0,
  };
}

export async function createJournalEntryRecord(entry: {
  entityId?: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  sourceType?: string;
  sourceReferenceId?: string;
  idempotencyKey?: string;
}) {
  if (!isValidUuid(entry.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { data, error } = await supabase.rpc("create_journal_entry_atomic", {
    p_business_entity_id: entry.entityId,
    p_entry_number: entry.entryNumber,
    p_entry_date: entry.entryDate,
    p_description: entry.description,
    p_source_type: entry.sourceType || "manual",
    p_source_reference_id: entry.sourceReferenceId || null,
    p_idempotency_key: entry.idempotencyKey || `idem-${entry.entryNumber}-${Date.now()}`,
    p_lines: [
      {
        account_code: entry.debitAccountCode,
        account_name: entry.debitAccountName,
        debit_amount: entry.amount,
        credit_amount: 0,
        memo: entry.description,
      },
      {
        account_code: entry.creditAccountCode,
        account_name: entry.creditAccountName,
        debit_amount: 0,
        credit_amount: entry.amount,
        memo: entry.description,
      },
    ],
  });

  if (error) throw error;
  return data;
}

export async function reverseJournalEntryRecord(entryId: string, reason: string = "Xatolik tufayli bekor qilindi") {
  const { data, error } = await supabase.rpc("reverse_journal_entry", {
    p_entry_id: entryId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function closeAccountingPeriod(params: {
  entityId?: string;
  fromDate: string;
  toDate: string;
  closingDate?: string;
}) {
  if (!isValidUuid(params.entityId)) {
    throw new Error("Korxona ID tanlanmagan");
  }
  const { data, error } = await supabase.rpc("close_accounting_period", {
    p_business_entity_id: params.entityId,
    p_from_date: params.fromDate,
    p_to_date: params.toDate,
    p_closing_date: params.closingDate || params.toDate,
    p_idempotency_key: `idem-close-${params.entityId}-${params.fromDate}-${params.toDate}`,
  });
  if (error) throw error;
  return data;
}

export async function fetchTrialBalance(entityId: string, fromDate?: string, toDate?: string) {
  try {
    if (!isValidUuid(entityId)) return [];
    const { data, error } = await supabase.rpc("get_trial_balance", {
      p_entity_id: entityId,
      p_from_date: fromDate || "1970-01-01",
      p_to_date: toDate || "2099-12-31",
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchTrialBalance error:", err);
    return [];
  }
}

export async function fetchGeneralLedger(entityId: string, accountCode: string, fromDate?: string, toDate?: string) {
  try {
    if (!isValidUuid(entityId)) return [];
    const { data, error } = await supabase.rpc("get_general_ledger", {
      p_entity_id: entityId,
      p_account_code: accountCode,
      p_from_date: fromDate || "1970-01-01",
      p_to_date: toDate || "2099-12-31",
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchGeneralLedger error:", err);
    return [];
  }
}

// ==========================================
// 9B. TAX RECORDS & DEADLINES
// ==========================================
export async function fetchTaxRecords(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("tax_records")
      .select("*")
      .order("deadline", { ascending: false });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      entityId: r.business_entity_id,
      type: r.type,
      period: r.period,
      calculatedAmount: Number(r.calculated_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      deadline: r.deadline,
      status: r.status,
    }));
  } catch (err) {
    console.error("fetchTaxRecords error:", err);
    return [];
  }
}

export async function fetchTaxDeadlines(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("tax_deadlines")
      .select("*")
      .order("date", { ascending: true });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchTaxDeadlines error:", err);
    return [];
  }
}

export async function payTaxRecordInDb(taxRecordId: string, fullCalculatedAmount: number) {
  if (!isValidUuid(taxRecordId)) return null;
  const { data, error } = await supabase
    .from("tax_records")
    .update({
      paid_amount: fullCalculatedAmount,
      status: "paid",
    })
    .eq("id", taxRecordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ==========================================
// 10. INTEGRATIONS (Didox, 1C, Bank APIs) & SYNC LOGS
// ==========================================
export async function fetchIntegrations(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("integrations")
      .select("*")
      .order("created_at", { ascending: true });

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      entityId: item.business_entity_id,
      provider: item.provider,
      name: item.name,
      category: item.category,
      description: item.description,
      status: item.status,
      lastSyncTime: item.last_sync_time
        ? new Date(item.last_sync_time).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
        : "Sinxronlanmagan",
      recordsSyncedToday: item.records_synced_today || 0,
      errorDetail: item.error_detail,
      settings: item.settings || {},
    }));
  } catch (err) {
    console.error("fetchIntegrations error:", err);
    return [];
  }
}

export async function updateIntegrationSettings(
  id: string,
  settings: { apiUrl?: string; clientToken?: string },
  status?: string
) {
  const updatePayload: any = {
    settings,
    last_sync_time: new Date().toISOString(),
  };
  if (status) {
    updatePayload.status = status;
  }

  const { data, error } = await supabase
    .from("integrations")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleIntegrationStatusInDb(id: string, status: "connected" | "disconnected") {
  const { data, error } = await supabase
    .from("integrations")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSyncLogs(entityId?: string) {
  try {
    if (entityId && !isValidUuid(entityId)) return [];
    let query = supabase
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (entityId) {
      query = query.eq("business_entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((log: any) => ({
      id: log.id,
      providerName: log.provider_name,
      type: log.type,
      recordsProcessed: log.records_processed,
      status: log.status,
      message: log.message,
      timestamp: new Date(log.created_at).toLocaleString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }),
    }));
  } catch (err) {
    console.error("fetchSyncLogs error:", err);
    return [];
  }
}

export async function recordIntegrationSyncInDb(
  integrationId: string,
  entityId: string,
  providerName: string,
  message: string,
  recordsProcessed: number = 0
) {
  await supabase
    .from("integrations")
    .update({
      last_sync_time: new Date().toISOString(),
      error_detail: null,
    })
    .eq("id", integrationId);

  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      business_entity_id: entityId,
      provider_name: providerName,
      type: "inbound",
      records_processed: recordsProcessed,
      status: "success",
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
