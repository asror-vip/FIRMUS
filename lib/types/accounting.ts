export type UserRole =
  | "workspace_owner"
  | "chief_accountant"
  | "accountant"
  | "auditor"
  | "company_director"
  | "viewer";

export interface BusinessEntity {
  id: string;
  workspaceId?: string;
  name: string;
  tradeName?: string;
  tinStir: string; // 9-digit STIR
  companyType: "MCHJ" | "YaTT" | "AJ" | "XK";
  taxRegime: "turnover_tax" | "vat_profit_tax" | "fixed_tax";
  currency: string;
  isActive: boolean;
  directorName: string;
  accountantName: string;
  bankAccount: string;
  bankName: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: "individual_company" | "accounting_firm";
  ownerName: string;
  currentPlan: "starter" | "professional" | "pro_plus" | "enterprise";
  entitiesCount: number;
  membersCount: number;
}

export type TransactionSource = "bank" | "1c" | "didox" | "manual";
export type TransactionStatus = "posted" | "pending" | "exception" | "rejected" | "draft" | "reconciled";
export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  entityId: string;
  date: string;
  counterparty: string;
  counterpartyStir?: string;
  description: string;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  status: TransactionStatus;
  matchedDocumentId?: string;
  matchedDocumentName?: string;
  accountCode?: string;
  accountName?: string;
  category?: string;
  aiConfidence?: number;
  aiExplanation?: string;
}

export type DocumentType = "invoice" | "act" | "contract" | "power_of_attorney" | "bank_statement";
export type DocumentStatus = "signed" | "pending_signature" | "rejected" | "draft";

export interface DocumentItem {
  id: string;
  entityId: string;
  number: string;
  title: string;
  type: DocumentType;
  counterparty: string;
  counterpartyStir: string;
  amount: number;
  date: string;
  status: DocumentStatus;
  fileSize: string;
  fileName?: string;
  fileUrl?: string;
  format: "pdf" | "docx" | "xlsx";
  signedByLocal?: string;
  signedByPartner?: string;
  linkedTransactionId?: string;
  aiExtractedData?: {
    vatAmount?: number;
    vatRate?: number;
    itemsCount?: number;
    contractRef?: string;
  };
}

export type ExceptionSeverity = "critical" | "warning" | "info";
export type ExceptionStatus = "open" | "resolved" | "in_review";

export interface ExceptionItem {
  id: string;
  entityId: string;
  entityName: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  category: "unmatched_payment" | "amount_mismatch" | "unknown_counterparty" | "missing_act" | "tax_discrepancy" | "sync_error";
  title: string;
  description: string;
  amount?: number;
  date: string;
  counterparty?: string;
  evidence: {
    sourceSystem: string;
    referenceId: string;
    details: string;
  };
  aiSuggestion: string;
  aiConfidence: number; // 0 - 100
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  assignedEntityIds: string[];
  status: "active" | "invited" | "suspended";
  lastActive: string;
  avatarUrl?: string;
}

export interface BankAccount {
  id: string;
  entityId: string;
  bankName: string;
  bankLogoText: string;
  accountNumber: string;
  mfo: string;
  currency: string;
  balance: number;
  pendingBalance: number;
  lastSyncedAt: string;
  status: "connected" | "syncing" | "error";
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: "active" | "passive" | "active_passive";
  category: "Joriy aktivlar" | "Majburiyatlar" | "Xususiy kapital" | "Daromadlar" | "Xarajatlar";
  balance: number;
  level: number;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  counterparty?: string;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  entityId: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string;
  status: "posted" | "draft" | "reversed";
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  lines: JournalEntryLine[];
}

export interface Integration {
  id: string;
  provider: "1c_enterprise" | "didox" | "e_imzo" | "kapitalbank" | "asakabank" | "ipotekabank" | "payme_business" | "click_merchant";
  name: string;
  category: "edo" | "erp" | "bank" | "payment" | "security";
  description: string;
  status: "connected" | "disconnected" | "error" | "syncing";
  lastSyncTime: string;
  recordsSyncedToday: number;
  errorDetail?: string;
}

export interface TaxRecord {
  id: string;
  entityId: string;
  type: "QQS (12%)" | "Foyda solig‘i" | "JShDS (12%)" | "Ijtimoiy soliq (12%)" | "Aylanmadan soliq (4%)";
  period: string;
  calculatedAmount: number;
  paidAmount: number;
  status: "paid" | "due_soon" | "overdue" | "draft";
  deadline: string;
  details: {
    taxableBase: number;
    rate: string;
    deductions: number;
  };
}

export interface InventoryItem {
  id: string;
  entityId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellingPrice: number;
  totalValue: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface ContractItem {
  id: string;
  entityId: string;
  number: string;
  title: string;
  counterparty: string;
  counterpartyStir: string;
  type: "Xarid shartnomasi" | "Xizmat ko‘rsatish" | "Ijara" | "Yetkazib berish";
  amount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "pending_approval" | "terminated";
}

export interface EmployeeItem {
  id: string;
  entityId: string;
  fullName: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: "active" | "on_leave" | "probation";
  pinfl: string;
}
