export interface GuideSection {
  id: string;
  title: string;
  lead?: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: Array<{ title: string; detail: string }>;
  note?: string;
}

export interface GuidePlanRow {
  name: string;
  badge?: string;
  monthlyPrice: string;
  annualPrice: string;
  aiCredits: string;
  models: string;
  pdfLimit: string;
  entitiesLimit: string;
  extra: string;
}

export interface GuideContent {
  backToApp: string;
  backToHome: string;
  badge: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  tocTitle: string;
  sections: GuideSection[];
  plansSectionId: string;
  plansTitle: string;
  plansLead: string;
  plansTableHeaders: {
    plan: string;
    price: string;
    credits: string;
    models: string;
    files: string;
    entities: string;
  };
  plans: GuidePlanRow[];
  plansFootnotes: string[];
  quickLinksTitle: string;
  quickLinks: Array<{ label: string; href: string }>;
  legalLinksLabel: string;
  privacyLabel: string;
  termsLabel: string;
}
