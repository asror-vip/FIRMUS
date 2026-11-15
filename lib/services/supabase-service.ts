import { supabase } from "@/lib/supabase/client";
import { mockBusinessEntities } from "@/lib/mock/entities";
import { mockTransactions } from "@/lib/mock/transactions";
import { mockDocuments } from "@/lib/mock/documents";
import { mockContracts } from "@/lib/mock/contracts";
import { mockInventoryItems } from "@/lib/mock/inventory";
import { mockEmployees } from "@/lib/mock/employees";
import { mockExceptions } from "@/lib/mock/exceptions";
import { mockTeamMembers } from "@/lib/mock/team";
import { mockJournalEntries } from "@/lib/mock/accounting";
import { mockIntegrations } from "@/lib/mock/integrations";

// ==========================================
// 1. BUSINESS ENTITIES
// ==========================================
export async function fetchBusinessEntities() {
  try {
    const { data, error } = await supabase
      .from("business_entities")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return mockBusinessEntities;
    }

    return data.map((ent: any) => ({
      id: ent.id,
      name: ent.legal_name,
      tradeName: ent.trade_name,
      tinStir: ent.tin_stir,
      companyType: ent.company_type,
      taxRegime: ent.tax_regime,
      currency: ent.currency,
      accountantName: ent.accountant_name || "Azizbek Rahimov",
      isActive: ent.is_active,
    }));
  } catch (err) {
    console.error("fetchBusinessEntities error:", err);
    return mockBusinessEntities;
  }
}

export async function createBusinessEntity(entity: {
  legalName: string;
  tradeName?: string;
  tinStir: string;
  companyType: string;
  taxRegime: string;
  accountantName?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("business_entities")
      .insert({
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
      name: data.legal_name,
      tradeName: data.trade_name,
      tinStir: data.tin_stir,
      companyType: data.company_type,
      taxRegime: data.tax_regime,
      currency: data.currency,
      accountantName: data.accountant_name,
      isActive: data.is_active,
    };
  } catch (err) {
    console.error("createBusinessEntity error:", err);
    throw err;
  }
}

// ==========================================
// 2. TRANSACTIONS
// ==========================================
export async function fetchTransactions(entityId?: string) {
  try {
    let query = supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return mockTransactions;
    }

    return data.map((tx: any) => ({
      id: tx.id,
      entityId: tx.entity_id || "ent-alfa",
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
    }));
  } catch (err) {
    console.error("fetchTransactions error:", err);
    return mockTransactions;
  }
}

export async function createTransaction(tx: {
  date: string;
  amount: number;
  type: "income" | "expense";
  counterparty: string;
  counterpartyStir?: string;
  description: string;
  accountCode?: string;
  accountName?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        date: tx.date,
        amount: tx.amount,
        type: tx.type,
        counterparty: tx.counterparty,
        counterparty_stir: tx.counterpartyStir || null,
        description: tx.description,
        status: "posted",
        source: "manual",
        account_code: tx.accountCode || (tx.type === "income" ? "4010" : "6010"),
        account_name: tx.accountName || (tx.type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti"),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      entityId: data.entity_id || "ent-alfa",
      date: data.date,
      amount: Number(data.amount),
      type: data.type,
      counterparty: data.counterparty,
      counterpartyStir: data.counterparty_stir,
      description: data.description,
      status: data.status,
      source: data.source,
      accountCode: data.account_code,
      accountName: data.account_name,
    };
  } catch (err) {
    console.error("createTransaction error:", err);
    throw err;
  }
}

// ==========================================
// 3. DOCUMENTS (Didox E-SF)
// ==========================================
export async function fetchDocuments(entityId?: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("date", { ascending: false });

    if (error || !data || data.length === 0) {
      return mockDocuments;
    }

    return data.map((doc: any) => ({
      id: doc.id,
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
    }));
  } catch (err) {
    console.error("fetchDocuments error:", err);
    return mockDocuments;
  }
}

export async function createDocument(doc: {
  documentNumber: string;
  type: string;
  counterparty: string;
  counterpartyStir?: string;
  date: string;
  dueDate?: string;
  amount: number;
  contractNumber?: string;
}) {
  try {
    const vatAmount = Math.round((doc.amount * 12) / 112);
    const { data, error } = await supabase
      .from("documents")
      .insert({
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
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      documentNumber: data.document_number,
      type: data.type,
      counterparty: data.counterparty,
      counterpartyStir: data.counterparty_stir,
      date: data.date,
      dueDate: data.due_date,
      amount: Number(data.amount),
      vatAmount: Number(data.vat_amount),
      status: data.status,
      contractNumber: data.contract_number,
      eImzoSigned: data.e_imzo_signed,
    };
  } catch (err) {
    console.error("createDocument error:", err);
    throw err;
  }
}

export async function signDocumentWithEImzo(documentId: string) {
  try {
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
    return data;
  } catch (err) {
    console.error("signDocumentWithEImzo error:", err);
    throw err;
  }
}

// ==========================================
// 4. CONTRACTS
// ==========================================
export async function fetchContracts(entityId?: string) {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("start_date", { ascending: false });

    if (error || !data || data.length === 0) {
      return mockContracts;
    }

    return data.map((c: any) => ({
      id: c.id,
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
    return mockContracts;
  }
}

export async function createContract(contract: {
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
  try {
    const { data, error } = await supabase
      .from("contracts")
      .insert({
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
  } catch (err) {
    console.error("createContract error:", err);
    throw err;
  }
}

// ==========================================
// 5. INVENTORY
// ==========================================
export async function fetchInventoryItems(entityId?: string) {
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return mockInventoryItems;
    }

    return data.map((item: any) => ({
      id: item.id,
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
    return mockInventoryItems;
  }
}

export async function createInventoryItem(item: {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}) {
  try {
    const status = item.quantity <= 10 ? "low_stock" : "in_stock";
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
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
      sku: data.sku,
      name: data.name,
      category: data.category,
      quantity: Number(data.quantity),
      unit: data.unit,
      unitPrice: Number(data.unit_price),
      totalValue: Number(data.quantity) * Number(data.unit_price),
      status: data.status,
    };
  } catch (err) {
    console.error("createInventoryItem error:", err);
    throw err;
  }
}

// ==========================================
// 6. EMPLOYEES
// ==========================================
export async function fetchEmployees(entityId?: string) {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("hire_date", { ascending: false });

    if (error || !data || data.length === 0) {
      return mockEmployees;
    }

    return data.map((emp: any) => ({
      id: emp.id,
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
    return mockEmployees;
  }
}

export async function createEmployee(emp: {
  fullName: string;
  position: string;
  department: string;
  salary: number;
  pinfl: string;
  hireDate: string;
}) {
  try {
    const { data, error } = await supabase
      .from("employees")
      .insert({
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
      name: data.full_name,
      position: data.position,
      department: data.department,
      salary: Number(data.salary),
      pinfl: data.pinfl,
      hireDate: data.hire_date,
      status: data.status,
    };
  } catch (err) {
    console.error("createEmployee error:", err);
    throw err;
  }
}

// ==========================================
// 7. EXCEPTIONS (AI Auditor)
// ==========================================
export async function fetchExceptions(entityId?: string) {
  try {
    const { data, error } = await supabase
      .from("exceptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return mockExceptions;
    }

    return data.map((exc: any) => ({
      id: exc.id,
      entityId: exc.entity_id || "ent-alfa",
      entityName: exc.entity_name || "ORIENT AGRO EXPORT MChJ",
      severity: exc.severity || "warning",
      status: exc.status || "open",
      category: exc.category || "unmatched_payment",
      title: exc.title,
      description: exc.description,
      date: exc.date,
      amount: exc.amount ? Number(exc.amount) : undefined,
      counterparty: exc.counterparty || "Nomaʼlum kontragent",
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
    return mockExceptions;
  }
}

export async function resolveExceptionInDb(id: string, action: "approve" | "reject") {
  try {
    const { data, error } = await supabase
      .from("exceptions")
      .update({
        status: action === "approve" ? "resolved" : "in_review",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("resolveExceptionInDb error:", err);
    throw err;
  }
}

// ==========================================
// 8. TEAM MEMBERS
// ==========================================
export async function fetchTeamMembers() {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return mockTeamMembers;
    }

    return data.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status,
      assignedCompaniesCount: m.assigned_companies_count || 1,
    }));
  } catch (err) {
    console.error("fetchTeamMembers error:", err);
    return mockTeamMembers;
  }
}

export async function createTeamMember(member: {
  name: string;
  email: string;
  role: string;
}) {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .insert({
        name: member.name,
        email: member.email,
        role: member.role,
        status: "active",
        assigned_companies_count: 1,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      assignedCompaniesCount: data.assigned_companies_count,
    };
  } catch (err) {
    console.error("createTeamMember error:", err);
    throw err;
  }
}

// ==========================================
// 9. JOURNAL ENTRIES (Double-Entry Ledger)
// ==========================================
export async function createJournalEntryRecord(entry: {
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
}) {
  try {
    const { data: journalEntry, error: jError } = await supabase
      .from("journal_entries")
      .insert({
        entry_number: entry.entryNumber,
        entry_date: entry.entryDate,
        status: "posted",
        description: entry.description,
        source_type: "manual",
        posted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jError) throw jError;

    // Insert debit line
    await supabase.from("journal_lines").insert({
      journal_entry_id: journalEntry.id,
      account_code: entry.debitAccountCode,
      account_name: entry.debitAccountName,
      debit_amount: entry.amount,
      credit_amount: 0,
      memo: entry.description,
    });

    // Insert credit line
    await supabase.from("journal_lines").insert({
      journal_entry_id: journalEntry.id,
      account_code: entry.creditAccountCode,
      account_name: entry.creditAccountName,
      debit_amount: 0,
      credit_amount: entry.amount,
      memo: entry.description,
    });

    return journalEntry;
  } catch (err) {
    console.error("createJournalEntryRecord error:", err);
    throw err;
  }
}

// ==========================================
// 10. INTEGRATIONS (Didox, 1C, Bank APIs)
// ==========================================
export async function fetchIntegrations() {
  try {
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return mockIntegrations;
    }

    return data.map((item: any) => ({
      id: item.id,
      provider: item.provider,
      name: item.name,
      category: item.category,
      description: item.description,
      status: item.status,
      lastSyncTime: item.last_sync_time || "Yaqinda",
      recordsSyncedToday: item.records_synced_today || 0,
      errorDetail: item.error_detail,
      settings: item.settings,
    }));
  } catch (err) {
    console.error("fetchIntegrations error:", err);
    return mockIntegrations;
  }
}

export async function updateIntegrationSettings(
  id: string,
  settings: { apiUrl?: string; clientToken?: string },
  status?: string
) {
  try {
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
  } catch (err) {
    console.error("updateIntegrationSettings error:", err);
    throw err;
  }
}

export async function toggleIntegrationStatusInDb(id: string, status: "connected" | "disconnected") {
  try {
    const { data, error } = await supabase
      .from("integrations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("toggleIntegrationStatusInDb error:", err);
    throw err;
  }
}
