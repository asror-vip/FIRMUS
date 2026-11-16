"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Loader2, Building2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [workspaceAlias, setWorkspaceAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Iltimos, elektron pochta va parolni kiriting");
      return;
    }

    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat boʻlishi kerak");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: workspaceAlias.trim() || "Bosh buxgalter",
            role: "accountant",
          },
        },
      });

      if (error) throw error;

      toast.success("Hisob yaratildi! Xush kelibsiz.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Register error:", err);
      toast.error(err.message || "Roʻyxatdan oʻtishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Google sign up error:", err);
      toast.error(err.message || "Google orqali roʻyxatdan oʻtishda xatolik yuz berdi");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
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
            Roʻyxatdan oʻtish
          </h1>
          <p className="text-xs text-muted-foreground">
            Google yoki email orqali
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardContent className="pt-6 space-y-3.5 text-xs">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleSignUp}
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
              Google orqali roʻyxatdan oʻtish
            </Button>

            <div className="relative my-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">yoki elektron pochta bilan</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-foreground">
                    Kompaniya / Taxallus:
                  </label>
                  <span className="text-[10px] text-muted-foreground">ixtiyoriy</span>
                </div>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={workspaceAlias}
                    onChange={(e) => setWorkspaceAlias(e.target.value)}
                    placeholder="Masalan: Buxgalteriya #1"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Elektron pochta manzili:
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="office@kompaniya.uz"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Parol oʻylab toping:
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Kamida 8 ta belgi"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    Roʻyxatdan oʻtish <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Profilingiz bormi?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Tizimga kirish
          </Link>
        </p>

        <p className="text-center text-[10px] text-muted-foreground/80">
          Roʻyxatdan oʻtish orqali{" "}
          <Link href="/privacy" className="underline">Maxfiylik siyosati</Link>
          {" va "}
          <Link href="/terms" className="underline">Ommaviy oferta</Link>
          {" shartlariga rozilik bildirasiz."}
        </p>
      </div>
    </div>
  );
}
