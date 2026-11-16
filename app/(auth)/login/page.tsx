"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  listEImzoCertificates,
  signWithEImzoCertificate,
  type EImzoCertificate,
} from "@/lib/services/eimzo-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEImzoOpen, setIsEImzoOpen] = useState(false);
  const [eImzoLoading, setEImzoLoading] = useState(false);
  const [eImzoCerts, setEImzoCerts] = useState<EImzoCertificate[]>([]);
  const [eImzoError, setEImzoError] = useState<string | null>(null);

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

      if (error) {
        throw error;
      }

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

  const handleOpenEImzo = async () => {
    setIsEImzoOpen(true);
    setEImzoLoading(true);
    setEImzoError(null);
    setEImzoCerts([]);
    try {
      const certs = await listEImzoCertificates();
      setEImzoCerts(certs);
      if (certs.length === 0) {
        setEImzoError("Kompyuterda faol E-IMZO kalitlari topilmadi (PFX fayl ulanganini tekshiring).");
      }
    } catch (err: any) {
      setEImzoError(err?.message || "E-IMZO dasturiga ulanib boʻlmadi.");
    } finally {
      setEImzoLoading(false);
    }
  };

  const handleSelectEImzoCert = async (cert: EImzoCertificate) => {
    setEImzoLoading(true);
    try {
      const challenge = `FIRMUS-AUTH:${cert.tin}:${Date.now()}`;
      const sig = await signWithEImzoCertificate(cert, challenge);
      toast.success(
        `ERI imzo tasdiqlandi (${sig.signerName}, S/N: ${sig.signerSerial}). Server ERI sessiyasini bogʻlash uchun avval Email/Google bilan hisobingizga kiring.`
      );
      setIsEImzoOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "E-IMZO bilan imzolash bekor qilindi");
    } finally {
      setEImzoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center mb-1">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50 blur-lg" />
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS"
              className="relative h-14 w-14 rounded-2xl object-cover shadow-2xl border border-blue-400/40"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            FIRMUS Platformasiga Kirish
          </h1>
          <p className="text-xs text-muted-foreground">
            Biznesingiz uchun aqlli moliyaviy yechim
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-4 text-xs">
            {/* Primary 1-Click Google Login (Zero local personal profile form needed) */}
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
              <p className="text-[10px] text-center text-muted-foreground">
                1 klikda kiring — telefon raqami va ortiqcha shaxsiy anketalar soʻralmaydi
              </p>
            </div>

            <div className="relative my-3">
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
                    placeholder="foydalanuvchi@firmus.uz"
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

            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              className="w-full text-[11px] h-8 gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleOpenEImzo}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              E-IMZO (ERI) kaliti bilan tekshirish
            </Button>
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

        <Dialog open={isEImzoOpen} onOpenChange={setIsEImzoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-600" />
                E-IMZO Elektron Raqamli Imzo (CAPIWS)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kompyuteringizga ulangan PFX sertifikatini tanlang (127.0.0.1:64443).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 text-xs">
              {eImzoLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  E-IMZO agentiga ulanilmoqda...
                </div>
              ) : eImzoError ? (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 leading-relaxed">
                  {eImzoError}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {eImzoCerts.map((cert) => (
                    <button
                      key={`${cert.serialNumber}-${cert.name}`}
                      type="button"
                      onClick={() => handleSelectEImzoCert(cert)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors space-y-0.5"
                    >
                      <div className="font-semibold text-foreground">{cert.fullName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        STIR: {cert.tin || "—"} • S/N: {cert.serialNumber}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{cert.org}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
