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
}
