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
    view: string;
    logout: string;
    now: string;
    viewAll: string;
    time: string;
    name: string;
    period: string;
    connect: string;
    disconnect: string;
    inbound: string;
    outbound: string;
    monthly: string;
    quarterly: string;
    records: string;
    previous: string;
    edit: string;
  };
  statuses: {
    posted: string;
    signed: string;
    active: string;
    connected: string;
    paid: string;
    success: string;
    pending: string;
    pending_signature: string;
    due_soon: string;
    syncing: string;
    exception: string;
    rejected: string;
    error: string;
    overdue: string;
    critical: string;
    urgent: string;
    reconciled: string;
    draft: string;
    in_stock: string;
    low_stock: string;
    completed: string;
    invited: string;
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
    footerSync: string;
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
    askAi: string;
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
    copilotSubtitle: string;
    copilotButton: string;
  };
  pages: {
    transactions: {
      title: string;
      subtitle: string;
      searchPlaceholder: string;
      batchApprove: string;
      tabs: {
        all: string;
        income: string;
        expense: string;
        pending: string;
        exception: string;
      };
      tableHeaders: {
        date: string;
        counterparty: string;
        description: string;
        amount: string;
        source: string;
        status: string;
        linkedDoc: string;
      };
    };
    accounting: {
      title: string;
      subtitle: string;
      tabs: {
        coa: string;
        journal: string;
        trialBalance: string;
        ledger: string;
      };
      debit: string;
      credit: string;
      balance: string;
      code: string;
      name: string;
    };
    banking: {
      title: string;
      subtitle: string;
      tabs: {
        accounts: string;
        statements: string;
        payments: string;
      };
      totalBalance: string;
      activeAccounts: string;
      pendingTransfers: string;
      connectBank: string;
    };
    documents: {
      title: string;
      subtitle: string;
      tabs: {
        all: string;
        invoices: string;
        acts: string;
        contracts: string;
        customs: string;
      };
      syncDidox: string;
      uploadDoc: string;
    };
    tax: {
      title: string;
      subtitle: string;
      tabs: {
        calendar: string;
        vat: string;
        profit: string;
        turnover: string;
      };
      vatPayable: string;
      annualTurnover: string;
      nextDeadline: string;
      calendarTitle: string;
      calculateModalTitle: string;
      confirmCalculation: string;
    };
    finance: {
      title: string;
      subtitle: string;
      tabs: {
        pnl: string;
        balanceSheet: string;
        cashflow: string;
      };
      revenue: string;
      netProfit: string;
      totalExpenses: string;
      assets: string;
    };
    aiAuditor: {
      title: string;
      subtitle: string;
      recheck: string;
      searchPlaceholder: string;
      tabs: {
        all: string;
        critical: string;
        warning: string;
        info: string;
      };
      problemTitle: string;
      evidenceTitle: string;
      aiSuggestionTitle: string;
      confidence: string;
      approveButton: string;
      rejectButton: string;
      forwardToAccountant: string;
    };
    inventory: {
      title: string;
      subtitle: string;
      tabs: {
        all: string;
        goods: string;
        materials: string;
        lowStock: string;
      };
      totalStockValue: string;
      totalItems: string;
      addItem: string;
    };
    contracts: {
      title: string;
      subtitle: string;
      tabs: {
        all: string;
        clients: string;
        suppliers: string;
        active: string;
      };
      totalContracts: string;
      activeContracts: string;
      addContract: string;
    };
    employees: {
      title: string;
      subtitle: string;
      tabs: {
        all: string;
        management: string;
        accountants: string;
        staff: string;
      };
      totalEmployees: string;
      monthlyPayroll: string;
      addEmployee: string;
    };
    integrations: {
      title: string;
      subtitle: string;
      syncAll: string;
      syncHistory: string;
      syncHistorySub: string;
    };
    reports: {
      title: string;
      subtitle: string;
      generateReport: string;
      financialReports: string;
      taxReports: string;
      managementReports: string;
    };
    team: {
      title: string;
      subtitle: string;
      inviteMember: string;
      activeMembers: string;
      assignedCompanies: string;
    };
    billing: {
      title: string;
      subtitle: string;
      currentPlan: string;
      changePlan: string;
      billingHistory: string;
      activeFirmPlan: string;
    };
    settings: {
      title: string;
      subtitle: string;
      tabs: {
        entities: string;
        security: string;
        notifications: string;
        language: string;
      };
      entitiesTitle: string;
      entitiesDesc: string;
      addEntity: string;
      companyName: string;
      tinStir: string;
      legalForm: string;
      taxRegime: string;
      managingAccountant: string;
      status: string;
      action: string;
      edit: string;
      securityTitle: string;
      securityDesc: string;
      twoFactorTitle: string;
      twoFactorDesc: string;
      zeroTrustTitle: string;
      zeroTrustDesc: string;
      guaranteed: string;
      activeSessions: string;
      currentSession: string;
      online: string;
      notificationsTitle: string;
      notificationsDesc: string;
      emailAlerts: string;
      emailAlertsDesc: string;
      telegramAlerts: string;
      telegramAlertsDesc: string;
      interfaceLangTitle: string;
      interfaceLangDesc: string;
    };
  };
}
