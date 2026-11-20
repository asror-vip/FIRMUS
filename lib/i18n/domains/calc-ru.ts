import type { AssistantDictionary } from "./assistant";

export type CalcDict = AssistantDictionary["calc"];

export const calcDict: CalcDict = {
  "debitAbbr": "Дт",
  "creditAbbr": "Кт",
  "payroll": {
    "title": "Калькулятор зарплаты и налогов (НДФЛ 12%)",
    "taxArticleRef": "Налоговый кодекс ст. 381 (НДФЛ 12%) и ст. 405 (Соц. налог 12%)",
    "grossToNet": "Брутто → На руки",
    "netToGross": "На руки → Брутто",
    "amountPlaceholder": "Сумма",
    "grossLabel": "Начислено (Брутто):",
    "pitLabel": "НДФЛ (12%, из них 0,1% ИНПС):",
    "netLabel": "Сотруднику на руки (Нетто):",
    "socialTaxLabel": "Социальный налог работодателя (12%):",
    "totalEmployerCostLabel": "Общие расходы работодателя:",
    "entriesLabel": "Проводки:",
    "entryDescriptions": {
      "9420-6710": "Начислена заработная плата (Брутто)",
      "6710-6410": "Удержан НДФЛ 12% (включая 0,1% ИНПС)",
      "9420-6520": "Социальный налог 12% (работодатель)",
      "6710-5110": "Выплачено на карту сотрудника (Нетто)"
    }
  },
  "vat": {
    "title": "Быстрый калькулятор НДС (12%)",
    "taxArticleRef": "Налоговый кодекс ст. 258 (ставка НДС 12%)",
    "extractMode": "Выделить НДС из суммы (×12/112)",
    "addMode": "Начислить 12% НДС сверху",
    "netLabel": "Сумма без НДС",
    "vatLabel": "НДС 12%",
    "totalLabel": "Итого"
  },
  "other": {
    "title": "Налог с оборота (1%–4%) и Отпускные",
    turnoverTitle: (ratePercent) => `Налог с оборота (${ratePercent}%)`,
    vacationTitle: (days) => `Отпускные (${days} дн.)`,
    "turnoverTaxLabel": "Налог (9430/6410):",
    "turnoverThresholdLabel": "Годовой порог:",
    "turnoverExceedsWarning": "Порог превышен — может потребоваться переход на НДС",
    "turnoverStatuses": {
      "llc": "ООО",
      "yatt": "ИП",
      "self_employed": "Самозанятый"
    },
    "vacationNetLabel": "На руки:"
  }
};
