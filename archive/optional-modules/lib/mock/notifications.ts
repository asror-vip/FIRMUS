export interface NotificationItem {
  id: string;
  category: "tax" | "exception" | "sync" | "system";
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    entityName?: string;
    amount?: number;
    docNumber?: string;
  };
}

export const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    category: "exception",
    severity: "critical",
    title: "Hisob-faktura va bank toʻlovida 1,300,000 soʻm tafovut",
    description: "Universal Logistics Partners E-SF summasi (14.8 mln) bank toʻlovidan (13.5 mln) koʻp. QQS boʻyicha tuzatuvchi hisob-faktura talab qilinadi.",
    timestamp: "10 daqiqa oldin",
    isRead: false,
    actionUrl: "/ai-auditor?id=exc-301",
    actionLabel: "Istisnoni koʻrish",
    metadata: {
      entityName: "MCHJ Alfa",
      amount: 1300000,
      docNumber: "LOG-1480",
    },
  },
  {
    id: "notif-2",
    category: "sync",
    severity: "success",
    title: "Didox orqali 14 ta yangi E-SF qabul qilindi",
    description: "Anglesey Food, Artel Electronics va Lukoil kompaniyalaridan kelgan elektron hisob-fakturalar avtomatik roʻyxatga olindi.",
    timestamp: "Bugun 14:32",
    isRead: false,
    actionUrl: "/documents",
    actionLabel: "Hujjatlar roʻyxati",
  },
  {
    id: "notif-3",
    category: "tax",
    severity: "warning",
    title: "QQS hisoboti topshirishga 5 kun qoldi!",
    description: "Oktabr oyi uchun hisoblangan QQS (38,450,000 soʻm) hisoboti 20-noyabrgacha Soliq organlariga yuborilishi shart.",
    timestamp: "Bugun 09:00",
    isRead: false,
    actionUrl: "/tax",
    actionLabel: "Soliq kalendari",
  },
  {
    id: "notif-4",
    category: "sync",
    severity: "critical",
    title: "1C:Enterprise serveri bilan ulanish uzildi",
    description: "Lokal OData portiga (192.168.1.55:8080) yuborilgan soʻrov 30 soniyada javob bermadi (HTTP 504).",
    timestamp: "Bugun 11:20",
    isRead: false,
    actionUrl: "/integrations",
    actionLabel: "Integratsiyani tekshirish",
  },
  {
    id: "notif-5",
    category: "system",
    severity: "success",
    title: "Bank tushumi avtomatik solishtirildi",
    description: "Kapitalbank hisobiga 142,500,000 soʻm tushum (Korzinka E-SF №189) 100% aniqlik bilan 4010 schyotga bogʻlandi.",
    timestamp: "Kecha 17:45",
    isRead: true,
    actionUrl: "/transactions",
    actionLabel: "Tranzaksiya",
  },
  {
    id: "notif-6",
    category: "tax",
    severity: "info",
    title: "JShDS va Ijtimoiy soliq toʻlovi tasdiqlandi",
    description: "Oktyabr oyi ish haqi soliqlari (16,416,000 soʻm) toʻliq budjet hisobiga oʻtkazildi va yopildi.",
    timestamp: "15-Noyabr 10:00",
    isRead: true,
    actionUrl: "/tax",
    actionLabel: "Kvitansiya",
  },
];
