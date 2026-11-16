import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Foydalanish shartlari (Ommaviy oferta) — FIRMUS",
  description: "FIRMUS buxgalteriya SaaS platformasidan foydalanish boʻyicha ommaviy oferta shartlari.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tizimga qaytish
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Foydalanish shartlari (Ommaviy oferta)</h1>
              <p className="text-xs text-muted-foreground">
                FIRMUS SaaS Platformasi • Oʻzbekiston Respublikasi qonunchiligi va 21-son BHMS asosida
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">1. Shartnoma predmeti</h2>
              <p>
                FIRMUS foydalanuvchilarga buxgalteriya hisobini (21-son BHMS asosida), elektron hujjat aylanishini,
                bank koʻchirmalari tahlilini va soliq majburiyatlari nazoratini yuritish uchun bulutli dasturiy
                taʼminotdan (SaaS) foydalanish huquqini beradi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">2. Tomonlarning majburiyatlari</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Foydalanuvchi tizimga kiritilayotgan birlamchi hujjatlar va E-IMZO imzolarining qonuniyligiga masʼuldir.</li>
                <li>Tasdiqlangan buxgalteriya provodkalari oʻchirilmaydi; tuzatishlar faqat Storno (Reversal) mexanizmi orqali kiritiladi.</li>
                <li>Jamoa boshqaruvchisi xodimlarga berilgan RBAC rollari (Bosh buxgalter, Buxgalter, Auditor) uchun javobgardir.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">3. Tariflar va toʻlov tartibi</h2>
              <p>
                Tarif rejalari («Starter», «Professional», «Enterprise») ishchi maydon (Workspace) darajasida tanlanadi.
                Toʻlovlar Oʻzbekiston Respublikasi milliy valyutasi (UZS) da bank oʻtkazmasi yoki korporativ karta orqali
                amalga oshiriladi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">4. Javobgarlik chegarasi</h2>
              <p>
                AI Auditor va AI Copilot tavsiyalari yordamchi tahliliy vosita boʻlib, yakuniy moliyaviy va soliq hisobotlarini
                tasdiqlash vakolatli bosh buxgalter yoki rahbar zimmasida qoladi.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
