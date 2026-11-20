import type { Metadata } from "next";
import { GuideView } from "./guide-view";

export const metadata: Metadata = {
  title: "Yoʻriqnoma — FIRMUS | Saytda ishlash, 1C ulash va obuna tariflari",
  description:
    "FIRMUS platformasidan foydalanish boʻyicha toʻliq yoʻriqnoma: Oʻzbekiston 2026 soliq qoidalari va 21-BHMS asoslari, Bank ↔ 1C sverka, AI hujjat skanerlash, 1C ulash va Starter/Pro/Pro+ tariflari.",
};

export default function GuidePage() {
  return <GuideView />;
}
