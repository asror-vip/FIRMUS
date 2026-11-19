import type { Metadata } from "next";
import { GuestReconcileClient } from "@/components/public/guest-reconcile-client";

export const metadata: Metadata = {
  title:
    "Bank ↔ 1C Sverka (Loginsiz, Brauzerda) — FIRMUS | Сверка банковской выписки и 1С онлайн без регистрации",
  description:
    "Bank koʻchirmasi (Excel/CSV/TXT) va 1C fayllarini serverga yuklamasdan, brauzerning oʻzida tekshiring va farqlarni toping. Онлайн-сверка выписки банка и 1С локально в браузере без отправки файлов на сервер.",
};

export default function GuestTryPage() {
  return <GuestReconcileClient />;
}
