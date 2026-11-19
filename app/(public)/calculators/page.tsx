import type { Metadata } from "next";
import { PublicCalculatorsClient } from "@/components/public/public-calculators-client";

export const metadata: Metadata = {
  title:
    "Bepul Soliq Kalkulyatorlari 2026: QQS 12%, Maosh, Aylanma Soliq (1%–4%) | Налоговый калькулятор Узбекистан 2026",
  description:
    "Oʻzbekiston 2026 soliq qoidalari boʻyicha loginsiz bepul kalkulyatorlar: QQS 12% ajratish, ish haqi brutto/netto, YaTT 1% va MChJ 4% aylanma soligʻi, taʼtil puli. Бесплатный расчёт НДС 12%, зарплаты, налога с оборота и отпускных в Узбекистане.",
};

export default function PublicCalculatorsPage() {
  return <PublicCalculatorsClient />;
}
