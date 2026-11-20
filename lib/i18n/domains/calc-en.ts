import type { AssistantDictionary } from "./assistant";

export type CalcDict = AssistantDictionary["calc"];

export const calcDict: CalcDict = {
  "debitAbbr": "Dr",
  "creditAbbr": "Cr",
  "payroll": {
    "title": "Payroll & Tax Calculator (PIT 12%)",
    "taxArticleRef": "Tax Code Art. 381 (PIT 12%) & Art. 405 (Social Tax 12%)",
    "grossToNet": "Gross → Net (Take-home)",
    "netToGross": "Net (Take-home) → Gross",
    "amountPlaceholder": "Amount",
    "grossLabel": "Accrued (Gross):",
    "pitLabel": "PIT (12%, incl. 0.1% INPS):",
    "netLabel": "Employee take-home (Net):",
    "socialTaxLabel": "Employer social tax (12%):",
    "totalEmployerCostLabel": "Total employer cost:",
    "entriesLabel": "Journal entries:",
    "entryDescriptions": {
      "9420-6710": "Salary accrued (Gross)",
      "6710-6410": "PIT 12% withheld (incl. 0.1% INPS)",
      "9420-6520": "Social tax 12% (employer)",
      "6710-5110": "Paid to employee card (Net)"
    }
  },
  "vat": {
    "title": "Quick VAT (12%) Calculator",
    "taxArticleRef": "Tax Code Art. 258 (12% VAT rate)",
    "extractMode": "Extract VAT from total (×12/112)",
    "addMode": "Add 12% VAT on top",
    "netLabel": "Net (excl. VAT)",
    "vatLabel": "VAT 12%",
    "totalLabel": "Total"
  },
  "other": {
    "title": "Turnover Tax (1%–4%) & Vacation Pay",
    turnoverTitle: (ratePercent) => `Turnover tax (${ratePercent}%)`,
    vacationTitle: (days) => `Vacation pay (${days} days)`,
    "turnoverTaxLabel": "Tax (9430/6410):",
    "turnoverThresholdLabel": "Annual limit:",
    "turnoverExceedsWarning": "Threshold exceeded — VAT/general regime may apply",
    "turnoverStatuses": {
      "llc": "LLC",
      "yatt": "Sole Prop.",
      "self_employed": "Self-emp."
    },
    "vacationNetLabel": "Take-home:"
  }
};
