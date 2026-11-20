import type { AssistantDictionary } from "./assistant";

export type CalcDict = AssistantDictionary["calc"];

export const calcDict: CalcDict = {
  "debitAbbr": "Dt",
  "creditAbbr": "Kt",
  "payroll": {
    "title": "Ish haqi va soliq kalkulyatori (JShDS 12%)",
    "taxArticleRef": "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
    "grossToNet": "Brutto → Qoʻlga tegadi",
    "netToGross": "Qoʻlga tegadi → Brutto",
    "amountPlaceholder": "Summa",
    "grossLabel": "Hisoblangan (Brutto):",
    "pitLabel": "JShDS (12%, shundan 0.1% INPS):",
    "netLabel": "Xodim qoʻliga tegadi (Netto):",
    "socialTaxLabel": "Ish beruvchi ijtimoiy soligʻi (12%):",
    "totalEmployerCostLabel": "Ish beruvchining jami xarajati:",
    "entriesLabel": "Provodkalar:",
    "entryDescriptions": {
      "9420-6710": "Ish haqi hisoblandi (Brutto)",
      "6710-6410": "JShDS 12% ushlandi (0.1% ShJBPH ichida)",
      "9420-6520": "Ijtimoiy soliq 12% (ish beruvchi)",
      "6710-5110": "Xodim kartasiga toʻlandi (Netto)"
    }
  },
  "vat": {
    "title": "QQS (12%) tezkor hisoblagich",
    "taxArticleRef": "Soliq kodeksi 258-modda (QQS stavkasi 12%)",
    "extractMode": "Ichidan QQS ajratish (×12/112)",
    "addMode": "Ustiga 12% QQS qoʻshish",
    "netLabel": "QQSsiz sof",
    "vatLabel": "QQS 12%",
    "totalLabel": "Jami"
  },
  "other": {
    "title": "Aylanmadan soliq (1%–4%) va Taʼtil puli",
    turnoverTitle: (ratePercent) => `Aylanmadan soliq (${ratePercent}%)`,
    vacationTitle: (days) => `Taʼtil puli (${days} kun)`,
    "turnoverTaxLabel": "Soliq (9430/6410):",
    "turnoverThresholdLabel": "Yillik chegara:",
    "turnoverExceedsWarning": "Chegaradan oshdi — QQS/umumiy rejim talab etilishi mumkin",
    "turnoverStatuses": {
      "llc": "MChJ",
      "yatt": "YaTT",
      "self_employed": "Oʻzini band"
    },
    "vacationNetLabel": "Qoʻliga tegadi:"
  }
};
