export function getLocalizedBilling(t: any) {
  return {
    currentPlan: {
      name: t.pages.billing.plans.professional.name,
      price: 299000,
      period: t.common.monthly,
      renewalDate: "2026-12-15",
      status: "active",
    },
    usageQuotaTitle: t.pages.billing.usageQuotaTitle,
    usageQuotaSubtitle: t.pages.billing.usageQuotaSubtitle,
    usageMeters: {
      entities: {
        current: 3,
        max: 10,
        label: t.pages.billing.meters.entities,
        unit: t.pages.billing.meters.entitiesUnit,
      },
      teamMembers: {
        current: 8,
        max: 15,
        label: t.pages.billing.meters.teamMembers,
        unit: t.pages.billing.meters.teamMembersUnit,
      },
      aiTokens: {
        current: 640000,
        max: 1000000,
        percentage: 64,
        label: t.pages.billing.meters.aiTokens,
        spent: t.pages.billing.meters.aiTokensSpent,
      },
      storage: {
        current: 4.2,
        max: 20,
        unit: "GB",
        percentage: 21,
        label: t.pages.billing.meters.storage,
      },
    },
    plans: [
      {
        id: "starter",
        name: t.pages.billing.plans.starter.name,
        price: 99000,
        description: t.pages.billing.plans.starter.description,
        features: t.pages.billing.plans.starter.features,
        isPopular: false,
        isCurrent: false,
      },
      {
        id: "professional",
        name: t.pages.billing.plans.professional.name,
        price: 299000,
        description: t.pages.billing.plans.professional.description,
        features: t.pages.billing.plans.professional.features,
        isPopular: true,
        isCurrent: true,
      },
      {
        id: "enterprise",
        name: t.pages.billing.plans.enterprise.name,
        price: 899000,
        description: t.pages.billing.plans.enterprise.description,
        features: t.pages.billing.plans.enterprise.features,
        isPopular: false,
        isCurrent: false,
      },
    ],
    invoices: [
      { id: "inv-881", date: "2026-11-15", amount: 299000, status: "paid", paymentMethod: "Kapitalbank Visa Business (•••• 4910)", pdfUrl: "#" },
      { id: "inv-880", date: "2026-10-15", amount: 299000, status: "paid", paymentMethod: "Kapitalbank Visa Business (•••• 4910)", pdfUrl: "#" },
      { id: "inv-879", date: "2026-09-15", amount: 299000, status: "paid", paymentMethod: "Payme Business", pdfUrl: "#" },
    ],
  };
}
