import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Maxfiylik siyosati — FIRMUS",
  description: "FIRMUS platformasida Zero-PII tamoyili va moliyaviy maʼlumotlarni himoya qilish siyosati.",
};

export default function PrivacyPolicyPage() {
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Maxfiylik siyosati (Zero-PII Standarti)</h1>
              <p className="text-xs text-muted-foreground">
                Oxirgi yangilanish: 2026-yil 16-noyabr • OʻRQ-547 talablariga muvofiq
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">1. «Zero-PII» asosiy tamoyil</h2>
              <p>
                FIRMUS platformasi Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi OʻRQ-547
                qonuni talablariga hurmat bilan yondashadi va fuqarolarning shaxsiy maʼlumotlarini (JShShIR/PINFL,
                pasport maʼlumotlari, shaxsiy telefon raqamlari) talab qilmaydi hamda yigʻmaydi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">2. Qayta ishlanadigan korporativ maʼlumotlar</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Kirish sessiyasi: Google OAuth yoki elektron pochta orqali autentifikatsiya sessiyasi.</li>
                <li>Yuridik shaxs rekvizitlari: korxona nomi, STIR (INN) va soliq rejimi.</li>
                <li>Bank ↔ 1C Solishtirish (Sverka): yuklangan `.txt` / `.xml` / `.csv` fayllar foydalanuvchi brauzeri xotirasida oʻqiladi va server bazasida saqlanmaydi.</li>
                <li>21-BHMS Bosh kitob provodkalari: faqat korporativ schyotlar (`4010`, `5110`, `6010`, `6410`, `9010`, `9420`) kesimida yuritiladi.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">3. AI Agent va avtomatik maskalash</h2>
              <p>
                Tashqi AI modellariga (Gemini API) tahlil uchun soʻrov yuborishdan avval 16 xonali plastik karta
                raqamlari, 20 xonali bank hisobvaraqlari, JShShIR, telefon va STIR belgilari avtomatik tarzda
                shaxssizlantiriladi (`[KARTA_MASKED]`, `[PINFL_MASKED]`, `[TELEFON_MASKED]`).
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">4. Multi-Tenant izolyatsiya va Cookie fayllar</h2>
              <p>
                Har bir korxona maʼlumotlari PostgreSQL Row-Level Security (RLS) darajasida qatʼiy ajratilgan. Tizim
                faqat kirish sessiyasi va interfeys sozlamalari (til va mavzu) uchun texnik cookieʼlardan foydalanadi.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
