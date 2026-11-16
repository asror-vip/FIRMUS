"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  Scale,
  Camera,
  Calculator,
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (authError === "oauth_failed") {
      toast.error("Google orqali autentifikatsiyadan oʻtishda xatolik yuz berdi. Qayta urinib koʻring.");
    }
  }, [authError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Iltimos, elektron pochta va parolni kiriting");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success("Muvaffaqiyatli kirdingiz! Xush kelibsiz.");
      router.push(redirectedFrom);
      router.refresh();
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Kirishda xatolik yuz berdi. Parol yoki pochtani tekshiring.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Google login error:", err);
      toast.error(err.message || "Google tizimiga ulanishda xatolik yuz berdi");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 lg:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Clean Value Proposition */}
        <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-2.5">
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS"
              className="h-11 w-11 rounded-xl object-cover shadow-md border border-blue-400/40"
            />
            <div className="text-left">
              <div className="font-bold text-lg tracking-tight text-foreground leading-none">
                FIRMUS
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                AI Buxgalter Yordamchi • Oʻzbekiston
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            3–4 soatlik Bank va 1C ishini <span className="text-emerald-600 dark:text-emerald-400">5 daqiqada</span> bitiring
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto lg:mx-0">
            Oddiygina Google hisobingiz orqali kiring — telefon raqami va JShShIR soʻralmaydi. Barcha fayllar brauzeringiz xotirasida qayta ishlanadi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs pt-1">
            <div className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Scale className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Bank ↔ 1C Sverka</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                `.xlsx`, `.txt`, `.csv`, `XML` fayllarni solishtirib, QQS 12% va 1C eksportini chiqaradi.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Camera className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Faktura & Chek AI</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rasm/PDF yuklang — summa, MXIK, QQS va 21-BHMS provodkasini tayyorlaydi.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Calculator className="h-4 w-4 text-primary shrink-0" />
                <span>Maosh, QQS & Soliq AI</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Brutto ↔ Netto maosh, Soliq kodeksi (`lex.uz`) va shartnoma xavf tekshiruvi.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>OʻRQ-547 Zero-PII</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Shaxsiy karta, JShShIR va telefonlar avtomatik niqoblanadi va saqlanmaydi.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Clean Auth Card */}
        <div className="lg:col-span-5 w-full max-w-sm mx-auto space-y-4">
          <Card className="shadow-lg border-border">
            <CardContent className="pt-6 space-y-4 text-xs">
              <div className="space-y-1 text-center">
                <h2 className="text-base font-bold text-foreground">Tizimga kirish</h2>
                <p className="text-[11px] text-muted-foreground">
                  Google orqali 1 klikda boshlang
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full text-xs h-10 gap-2.5 font-semibold border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google orqali tezkor kirish
                </Button>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-card px-2 text-muted-foreground">yoki email bilan</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Elektron pochta:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="pl-8 text-xs h-9"
                      placeholder="ism@kompaniya.uz"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-foreground">Parol:</label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] text-primary hover:underline"
                    >
                      Parolni unutdingizmi?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Tekshirilmoqda...
                    </>
                  ) : (
                    <>
                      Tizimga kirish <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Hisobingiz yoʻqmi?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Roʻyxatdan oʻtish
            </Link>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/80">
            <Link href="/privacy" className="hover:underline">Maxfiylik siyosati</Link>
            {" • "}
            <Link href="/terms" className="hover:underline">Foydalanish shartlari (Oferta)</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
          Yuklanmoqda...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
