import type { Metadata } from "next";
import { WelcomeClient } from "@/components/public/welcome-client";

export const metadata: Metadata = {
  title:
    "FIRMUS — Buxgalterlar uchun Bank ↔ 1C Sverka va 2026 Soliq Kalkulyatorlari | Сверка Банк-1С и налоги РУз",
  description:
    "Oʻzbekiston buxgalterlari uchun loginsiz bepul QQS 12%, maosh, aylanma soliq (1%–4%) kalkulyatorlari va brauzer ichida maxfiy Bank ↔ 1C sverka. Бесплатные налоговые калькуляторы Узбекистана и сверка банка с 1С без регистрации.",
  keywords: [
    "buxgalteriya kalkulyatori",
    "QQS 12% hisoblash",
    "aylanma soliq 2026",
    "1C bank sverka",
    "налоговый калькулятор Узбекистан 2026",
    "сверка банка и 1С",
    "НДС 12% Узбекистан",
    "зарплата брутто нетто Узбекистан",
  ],
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
