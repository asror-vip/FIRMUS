export type Locale = "uz" | "ru" | "en";

export interface Translations {
  nav: {
    dashboard: string;
    aiAuditor: string;
    transactions: string;
    accounting: string;
    banking: string;
    documents: string;
    tax: string;
    finance: string;
    inventory: string;
    contracts: string;
    employees: string;
    integrations: string;
    reports: string;
    team: string;
    billing: string;
    settings: string;
    groups: {
      overview: string;
      accounting: string;
      business: string;
      system: string;
    };
  };
  common: {
    search: string;
    export: string;
    filter: string;
    addNew: string;
    save: string;
    cancel: string;
    approve: string;
    reject: string;
    details: string;
    date: string;
    amount: string;
    status: string;
    counterparty: string;
    description: string;
    source: string;
    all: string;
    close: string;
    currency: string;
    loading: string;
    actions: string;
    income: string;
    expense: string;
    pending: string;
    exceptions: string;
    sync: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    kpiAutomated: string;
    kpiAutomatedSub: string;
    kpiApprovals: string;
    kpiApprovalsSub: string;
    kpiExceptions: string;
    kpiExceptionsSub: string;
    kpiIntegrations: string;
    kpiIntegrationsSub: string;
    cashflowTitle: string;
    cashflowSubtitle: string;
    integrationsTitle: string;
    pendingApprovalsTitle: string;
    recentExceptionsTitle: string;
    aiRecommendationTitle: string;
  };
  notifications: {
    title: string;
    unreadCount: string;
    markAllRead: string;
    clearAll: string;
    empty: string;
    tabs: {
      all: string;
      tax: string;
      exceptions: string;
      sync: string;
      system: string;
    };
  };
  roles: {
    workspace_owner: string;
    chief_accountant: string;
    accountant: string;
    auditor: string;
    company_director: string;
    viewer: string;
  };
  aiDrawer: {
    title: string;
    online: string;
    greeting: string;
    suggestedTitle: string;
    prompts: {
      exceptions: string;
      bank: string;
      tax: string;
    };
    inputPlaceholder: string;
    verified: string;
    approvalRequired: string;
    approveAction: string;
    rejectAction: string;
  };
  workspace: {
    title: string;
    firm: string;
    single: string;
    add: string;
  };
  entity: {
    title: string;
    tin: string;
    add: string;
  };
  commandPalette: {
    placeholder: string;
    noResults: string;
    modules: string;
  };
  footer: {
    standards: string;
    rights: string;
    status: string;
    sync: string;
    settings: string;
    integrations: string;
    reports: string;
    soliqPortal: string;
    didoxEdo: string;
    serverTime: string;
  };
  sidebarFooter: {
    syncStatus: string;
    security: string;
    rights: string;
  };
}
