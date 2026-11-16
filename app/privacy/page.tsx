import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Maxfiylik siyosati — FIRMUS",
  description: "FIRMUS platformasida shaxsga doir va moliyaviy maʼlumotlarni himoya qilish siyosati.",
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
              <h1 className="text-xl font-bold text-foreground">Maxfiylik siyosati (Privacy Policy)</h1>
              <p className="text-xs text-muted-foreground">
                Oxirgi yangilanish: 2026-yil 16-noyabr • OʻRQ-547 talablariga muvofiq
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">1. Umumiy qoidalar</h2>
              <p>
                Ushbu Maxfiylik siyosati FIRMUS avtomatlashtirilgan buxgalteriya va biznes boshqaruvi tizimidan foydalanish
                jarayonida foydalanuvchilar hamda yuridik shaxslarning maʼlumotlarini yigʻish, saqlash va himoya qilish
                tartibini belgilaydi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">2. Qayta ishlanadigan maʼlumotlar</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Foydalanuvchi profil maʼlumotlari: F.I.O, elektron pochta, Eskiz.uz orqali tasdiqlangan telefon raqami.</li>
                <li>Korxona rekvizitlari: yuridik nomi, STIR (INN), bank hisobvaraqlari (MFO/20 xonali raqam), soliq rejimi.</li>
                <li>Xodimlarning JShShIR (PINFL) va ish haqi maʼlumotlari — interfeysda maskalangan holda aks ettiriladi.</li>
                <li>Buxgalteriya provodkalari, elektron hisob-fakturalar (Didox E-SF) va yuklangan hujjat fayllari.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">3. Multi-Tenant izolyatsiya va xavfsizlik</h2>
              <p>
                Har bir korxona maʼlumotlari PostgreSQL Row-Level Security (RLS) darajasida qatʼiy ajratilgan. Bir
                ishchi maydon (Workspace) aʼzolari boshqa tashkilotning moliyaviy yozuvlarini, hujjatlarini yoki
                Storage fayllarini koʻra olmaydi. Barcha moliyaviy provodkalar oʻzgarmas (immutable) audit izi bilan saqlanadi.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">4. AI Copilot va tashqi servislar</h2>
              <p>
                Tashqi AI modellariga (Gemini API) soʻrov yuborishdan avval korxona STIRi, xodim JShShIRi, 20 xonali bank
                hisobvaragʻi va telefon raqamlari avtomatik tarzda shaxssizlantiriladi (maskalanadi).
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">5. Cookie fayllar va aloqa</h2>
              <p>
                Tizim faqat autentifikatsiya sessiyasi va interfeys tili/korxona tanlovini saqlash uchun zarur boʻlgan
                texnik cookieʼlardan foydalanadi. Reklama kuzatuvchilari (trackers) ishlatilmaydi.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
