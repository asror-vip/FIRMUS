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
                FIRMUS AI Buxgalteriya Platformasi • Oʻzbekiston 21-son BHMS asosida
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">1. Xizmat mazmuni</h2>
              <p>
                FIRMUS foydalanuvchilarga bank koʻchirmalari va 1C fayllarini AI yordamida solishtirish (sverka),
                21-son BHMS boʻyicha ikkiyoqlama provodkalar yuritish, oborot-saldovaya vedomost va soliq
                koʻrsatkichlarini tezkor hisoblash uchun dasturiy vosita taqdim etadi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">2. Buxgalteriya va xavfsizlik qoidalari</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Foydalanuvchi tizimga yuklayotgan birlamchi bank va 1C fayllarining aniqligiga oʻzi masʼuldir.</li>
                <li>Tasdiqlangan buxgalteriya provodkalari oʻchirilmaydi; tuzatishlar faqat Storno (Reversal) mexanizmi orqali kiritiladi.</li>
                <li>AI Agent taklif qilgan barcha moliyaviy yozuvlar faqat foydalanuvchi tasdigʻidan soʻng bazaga yoziladi (Human-in-the-Loop).</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">3. Javobgarlik chegarasi</h2>
              <p>
                AI Sverka va AI Auditor tavsiyalari yordamchi tahliliy vosita boʻlib, yakuniy buxgalteriya va soliq
                hisobotlarini tasdiqlash vakolatli buxgalter yoki korxona rahbari zimmasida qoladi.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
